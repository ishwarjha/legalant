/**
 * LegalAnt — PDF OCR Processor MCP Server
 *
 * Tools:
 *   detect_pdf_type(file_path)              — returns "text" or "image"
 *   extract_text(file_path, use_ocr)        — extract text using pdfjs-dist or tesseract.js
 *
 * Strategy:
 *   use_ocr=false  → pdfjs-dist getTextContent() — fast, accurate for digital PDFs
 *   use_ocr=true   → render each page to canvas → tesseract.js — for scanned/image PDFs
 *
 * Prerequisites:
 *   npm install  (installs pdfjs-dist, tesseract.js, canvas)
 *   canvas requires native build: pip install node-gyp (if canvas build fails, see README)
 *
 * Transport: stdio
 * Run: node index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, access } from "fs/promises";
import { resolve, extname } from "path";
import { createCanvas } from "canvas";
import Tesseract from "tesseract.js";
// pdfjs-dist v5.x — ESM legacy build, safe for Node.js (fixes GHSA-wgrm-67xf-hhpq)
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Disable the web worker — not needed in Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

// ---------------------------------------------------------------------------
// Security: restrict all file access to MATTERS_BASE_PATH
// ---------------------------------------------------------------------------

const MATTERS_BASE = resolve(process.env.MATTERS_BASE_PATH ?? process.cwd());

function safePath(filePath) {
  const abs = resolve(filePath);
  if (!abs.startsWith(MATTERS_BASE)) {
    throw new Error(
      `Access denied: path must be within MATTERS_BASE_PATH (${MATTERS_BASE}). Got: ${abs}`,
    );
  }
  return abs;
}

// ---------------------------------------------------------------------------
// NodeCanvasFactory — required for pdfjs-dist page rendering in Node.js
// ---------------------------------------------------------------------------

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// ---------------------------------------------------------------------------
// Core: load PDF document
// ---------------------------------------------------------------------------

async function loadPdf(filePath) {
  const abs = safePath(filePath);

  if (extname(abs).toLowerCase() !== ".pdf") {
    throw new Error("File must have a .pdf extension");
  }

  await access(abs); // throws ENOENT if file does not exist

  const buffer = await readFile(abs);
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    // Suppress pdfjs console warnings
    verbosity: 0,
  });

  return loadingTask.promise;
}

// ---------------------------------------------------------------------------
// detect_pdf_type
// ---------------------------------------------------------------------------

/**
 * Determine whether a PDF has a native text layer ("text") or is image-only ("image").
 *
 * Method:
 *   Sample up to 5 pages and sum the extracted character count.
 *   If average chars-per-page >= 80 → "text"
 *   Otherwise → "image"
 *
 * This threshold handles cases where PDFs have minimal searchable text
 * (e.g. just headers) but are effectively scanned.
 */
async function detectPdfType({ file_path }) {
  if (!file_path) throw new Error("file_path is required");

  const doc = await loadPdf(file_path);
  const totalPages = doc.numPages;
  const samplePages = Math.min(totalPages, 5);
  let totalChars = 0;

  for (let i = 1; i <= samplePages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join("");
    totalChars += pageText.length;
  }

  const avgCharsPerPage = samplePages > 0 ? totalChars / samplePages : 0;
  const pdfType = avgCharsPerPage >= 80 ? "text" : "image";

  return {
    file_path,
    pdf_type: pdfType,
    total_pages: totalPages,
    sampled_pages: samplePages,
    avg_chars_per_sampled_page: Math.round(avgCharsPerPage),
    recommendation:
      pdfType === "text"
        ? "Use extract_text with use_ocr=false (faster, more accurate)"
        : "Use extract_text with use_ocr=true (OCR required — scanned document)",
  };
}

// ---------------------------------------------------------------------------
// extract_text — text layer path (use_ocr=false)
// ---------------------------------------------------------------------------

async function extractWithPdfjs(doc, maxPages) {
  const totalPages = doc.numPages;
  const limit = maxPages ? Math.min(maxPages, totalPages) : totalPages;
  const pageTexts = [];

  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Preserve line breaks: items within the same y-position join with space,
    // items at a new y-position join with newline
    let lastY = null;
    const lines = [];
    let currentLine = [];

    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.length) lines.push(currentLine.join(" "));
        currentLine = [];
      }
      currentLine.push(item.str);
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine.join(" "));

    pageTexts.push({ page: i, text: lines.join("\n") });
  }

  return pageTexts;
}

// ---------------------------------------------------------------------------
// extract_text — OCR path (use_ocr=true)
// ---------------------------------------------------------------------------

async function extractWithOcr(doc, maxPages) {
  const totalPages = doc.numPages;
  const limit = maxPages ? Math.min(maxPages, totalPages) : totalPages;
  const pageTexts = [];
  const canvasFactory = new NodeCanvasFactory();

  // Create a single Tesseract worker — reuse across all pages
  const worker = await Tesseract.createWorker("eng+hin", 1, {
    // Suppress Tesseract console output
    logger: () => {},
  });

  try {
    for (let i = 1; i <= limit; i++) {
      const page = await doc.getPage(i);

      // Render at 2× scale for better OCR accuracy
      const viewport = page.getViewport({ scale: 2.0 });
      const canvasAndContext = canvasFactory.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );

      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory,
      }).promise;

      // Convert canvas to PNG buffer for Tesseract
      const imageBuffer = canvasAndContext.canvas.toBuffer("image/png");
      canvasFactory.destroy(canvasAndContext);

      const {
        data: { text },
      } = await worker.recognize(imageBuffer);

      pageTexts.push({ page: i, text: text.trim() });
    }
  } finally {
    await worker.terminate();
  }

  return pageTexts;
}

// ---------------------------------------------------------------------------
// extract_text — main tool
// ---------------------------------------------------------------------------

async function extractText({ file_path, use_ocr = false, max_pages }) {
  if (!file_path) throw new Error("file_path is required");

  const doc = await loadPdf(file_path);
  const totalPages = doc.numPages;

  const pageTexts = use_ocr
    ? await extractWithOcr(doc, max_pages)
    : await extractWithPdfjs(doc, max_pages);

  const fullText = pageTexts.map((p) => p.text).join("\n\n");
  const CHAR_LIMIT = 50_000;

  return {
    file_path,
    extraction_method: use_ocr ? "tesseract_ocr" : "pdfjs_text_layer",
    total_pages: totalPages,
    pages_processed: pageTexts.length,
    char_count: fullText.length,
    content: fullText.slice(0, CHAR_LIMIT),
    truncated: fullText.length > CHAR_LIMIT,
    per_page: pageTexts.map((p) => ({
      page: p.page,
      char_count: p.text.length,
      // Include full per-page text only if total is within limit
      text: fullText.length <= CHAR_LIMIT ? p.text : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "legalant-pdf-ocr-processor", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "detect_pdf_type",
      description:
        "Analyse a PDF file and determine whether it has a native text layer (type: 'text') or is image-only/scanned (type: 'image'). Call this first to decide whether extract_text needs use_ocr=true.",
      inputSchema: {
        type: "object",
        required: ["file_path"],
        properties: {
          file_path: {
            type: "string",
            description:
              "Absolute path to the PDF file (must be within MATTERS_BASE_PATH)",
          },
        },
      },
    },
    {
      name: "extract_text",
      description:
        "Extract text from a PDF file. use_ocr=false uses pdfjs-dist (fast, for digital PDFs). use_ocr=true uses Tesseract.js (slower, for scanned/image PDFs). Run detect_pdf_type first to choose the right mode. Returns text capped at 50,000 characters.",
      inputSchema: {
        type: "object",
        required: ["file_path"],
        properties: {
          file_path: {
            type: "string",
            description:
              "Absolute path to the PDF file (must be within MATTERS_BASE_PATH)",
          },
          use_ocr: {
            type: "boolean",
            default: false,
            description:
              "false = native text layer via pdfjs-dist (default). true = OCR via Tesseract.js for scanned documents.",
          },
          max_pages: {
            type: "integer",
            description:
              "Maximum number of pages to process. Omit to process all pages. Useful for large documents.",
            minimum: 1,
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    let result;
    if (name === "detect_pdf_type") {
      result = await detectPdfType(args);
    } else if (name === "extract_text") {
      result = await extractText(args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: err.message, tool: name }, null, 2),
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
