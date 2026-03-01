/**
 * LegalAnt — PDF OCR Processor MCP Server
 *
 * Exposes tools for extracting text from legal documents:
 *  - pdf_extract_text      Extract text from a PDF (native text layer first, OCR fallback)
 *  - pdf_extract_metadata  Extract document metadata (title, author, page count, creation date)
 *  - pdf_identify_parties  Identify party names from extracted text using pattern matching
 *
 * Prerequisites (system):
 *  - Tesseract OCR:  `brew install tesseract` (macOS) or `apt install tesseract-ocr`
 *  - Poppler:        `brew install poppler` or `apt install poppler-utils`
 *
 * Run:  node index.js
 * Transport: stdio (Claude Code connects via stdin/stdout)
 *
 * Security: Only processes files within MATTERS_BASE_PATH to prevent path traversal.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, access } from "fs/promises";
import { resolve, extname } from "path";
import pdfParse from "pdf-parse";
import ocr from "node-tesseract-ocr";

// ---------------------------------------------------------------------------
// Security: restrict to allowed base path
// ---------------------------------------------------------------------------

const MATTERS_BASE_PATH = resolve(
  process.env.MATTERS_BASE_PATH || process.cwd()
);

/**
 * Resolve and validate a file path against the allowed base directory.
 * Prevents path traversal attacks.
 */
function safePath(filePath) {
  const resolved = resolve(filePath);
  if (!resolved.startsWith(MATTERS_BASE_PATH)) {
    throw new Error(
      `Access denied: file must be within MATTERS_BASE_PATH (${MATTERS_BASE_PATH})`
    );
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

/**
 * Extract text from a PDF file.
 * Strategy:
 *   1. Try native text layer via pdf-parse (fast, accurate for digital PDFs)
 *   2. If text is too short (<100 chars per page on average), fall back to OCR
 *
 * Returns extracted text, page count, and whether OCR was used.
 */
async function extractTextFromPdf(filePath, { max_pages, use_ocr_always }) {
  const absPath = safePath(filePath);

  if (extname(absPath).toLowerCase() !== ".pdf") {
    throw new Error("File must be a .pdf");
  }

  await access(absPath); // throws if file doesn't exist

  const buffer = await readFile(absPath);

  // Attempt native text extraction
  let pdfData;
  let nativeText = "";
  let pageCount = 0;

  try {
    const options = max_pages ? { max: max_pages } : {};
    pdfData = await pdfParse(buffer, options);
    nativeText = pdfData.text || "";
    pageCount = pdfData.numpages || 0;
  } catch (err) {
    // pdf-parse failure is non-fatal — fall through to OCR
    nativeText = "";
    pageCount = 0;
  }

  const avgCharsPerPage = pageCount > 0 ? nativeText.length / pageCount : 0;
  const isScanned = avgCharsPerPage < 100 || use_ocr_always;
  let finalText = nativeText;
  let ocrUsed = false;

  if (isScanned) {
    // OCR fallback — requires Tesseract and poppler (pdftoppm)
    try {
      const ocrConfig = {
        lang: "eng+hin", // English + Hindi; add more langs as needed
        oem: 1, // LSTM neural net
        psm: 3, // Fully automatic page segmentation
      };
      const ocrText = await ocr.recognize(absPath, ocrConfig);
      finalText = ocrText || "";
      ocrUsed = true;
    } catch (ocrErr) {
      if (!nativeText) {
        throw new Error(
          `Both native extraction and OCR failed. Ensure Tesseract is installed. OCR error: ${ocrErr.message}`
        );
      }
      // Native text was available; OCR failure is non-fatal
    }
  }

  return {
    file_path: absPath,
    page_count: pageCount,
    ocr_used: ocrUsed,
    char_count: finalText.length,
    text: finalText.slice(0, 50000), // cap at 50k chars to avoid context overflow
    text_truncated: finalText.length > 50000,
    extraction_notes: isScanned
      ? "Document appears to be scanned; OCR was applied."
      : "Native text layer extracted.",
  };
}

/**
 * Extract PDF metadata (title, author, creation date, page count, etc.)
 */
async function extractPdfMetadata(filePath) {
  const absPath = safePath(filePath);

  if (extname(absPath).toLowerCase() !== ".pdf") {
    throw new Error("File must be a .pdf");
  }

  await access(absPath);

  const buffer = await readFile(absPath);

  let metadata = {};
  try {
    const pdfData = await pdfParse(buffer, { max: 1 }); // parse first page for metadata
    metadata = {
      page_count: pdfData.numpages,
      pdf_version: pdfData.info?.PDFFormatVersion ?? null,
      title: pdfData.info?.Title ?? null,
      author: pdfData.info?.Author ?? null,
      subject: pdfData.info?.Subject ?? null,
      creator: pdfData.info?.Creator ?? null,
      producer: pdfData.info?.Producer ?? null,
      creation_date: pdfData.info?.CreationDate ?? null,
      modification_date: pdfData.info?.ModDate ?? null,
      is_encrypted: pdfData.info?.IsEncrypted ?? false,
    };
  } catch (err) {
    throw new Error(`Metadata extraction failed: ${err.message}`);
  }

  return {
    file_path: absPath,
    metadata,
  };
}

/**
 * Identify party names from extracted text using common Indian legal document patterns.
 * Looks for patterns like:
 *   "between [Party A] ... and [Party B]"
 *   "Private Limited", "LLP", "Ltd.", etc.
 */
async function identifyParties(text) {
  if (!text || text.length < 50) {
    throw new Error("text is too short to identify parties");
  }

  const parties = new Set();

  // Pattern 1: "BETWEEN:" section — common in Indian agreements
  const betweenMatch = text.match(
    /BETWEEN[:\s]+(.{0,500}?)(?:AND[:\s]+(.{0,500}?))?(?:WITNESSETH|WHEREAS|NOW)/is
  );
  if (betweenMatch) {
    if (betweenMatch[1]) parties.add(betweenMatch[1].replace(/\n/g, " ").trim().slice(0, 200));
    if (betweenMatch[2]) parties.add(betweenMatch[2].replace(/\n/g, " ").trim().slice(0, 200));
  }

  // Pattern 2: Company names — "Foo Bar Private Limited" / "Foo Bar Limited" / "Foo Bar LLP"
  const companyPattern =
    /([A-Z][A-Za-z\s&().,'-]{3,60}(?:Private\s+Limited|Public\s+Limited|Limited|LLP|Pvt\.\s*Ltd\.?|Ltd\.|LLP|OPC))/g;
  let match;
  while ((match = companyPattern.exec(text)) !== null) {
    parties.add(match[1].trim());
    if (parties.size > 20) break; // cap
  }

  // Pattern 3: "hereinafter referred to as" patterns
  const hereinafterPattern =
    /(?:hereinafter\s+(?:referred\s+to\s+as|called)\s+["']?([^"',()\n]{3,80})["']?)/gi;
  while ((match = hereinafterPattern.exec(text)) !== null) {
    parties.add(match[1].trim());
  }

  return {
    identified_parties: Array.from(parties).slice(0, 20),
    total_found: parties.size,
    note: "Party identification uses heuristic pattern matching. Verify results manually.",
    confidence: parties.size > 0 ? "medium" : "low",
  };
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "legalant-pdf-ocr-processor", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "pdf_extract_text",
      description:
        "Extract text from a PDF file at the given path. Uses native text layer for digital PDFs; falls back to Tesseract OCR for scanned documents. Returns extracted text (capped at 50,000 characters).",
      inputSchema: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description:
              "Absolute path to the PDF file (must be within MATTERS_BASE_PATH)",
          },
          max_pages: {
            type: "integer",
            description:
              "Maximum pages to process (default: all pages). Use for large documents.",
          },
          use_ocr_always: {
            type: "boolean",
            default: false,
            description:
              "Force OCR even if native text is available. Use for documents with garbled text.",
          },
        },
        required: ["file_path"],
      },
    },
    {
      name: "pdf_extract_metadata",
      description:
        "Extract metadata from a PDF file: title, author, creation date, page count, PDF version.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Absolute path to the PDF file",
          },
        },
        required: ["file_path"],
      },
    },
    {
      name: "pdf_identify_parties",
      description:
        "Identify party names (companies, LLPs, individuals) from extracted text using Indian legal document patterns. Provide the text output from pdf_extract_text.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "Extracted text from a legal document (output of pdf_extract_text)",
          },
        },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "pdf_extract_text":
        result = await extractTextFromPdf(args.file_path, args);
        break;
      case "pdf_extract_metadata":
        result = await extractPdfMetadata(args.file_path);
        break;
      case "pdf_identify_parties":
        result = await identifyParties(args.text);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { error: error.message, tool: name },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
