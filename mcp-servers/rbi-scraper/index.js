/**
 * LegalAnt — RBI Scraper MCP Server
 *
 * Tools:
 *   search_rbi(query, document_type)  — search RBI website for matching documents
 *   fetch_rbi_document(url)           — download and extract text from an RBI PDF or page
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
import { createRequire } from "module";
import axios from "axios";
import { load } from "cheerio";

// pdf-parse is CommonJS — import via createRequire
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RBI_BASE = "https://www.rbi.org.in";

// RBI index pages per document type
const ENDPOINTS = {
  master_direction: "/Scripts/BS_ViewMasDirections.aspx",
  circular: "/Scripts/BS_CircularIndexDisplay.aspx",
  fema: "/Scripts/NotificationUser.aspx?Id=174&Mode=0", // FEMA notifications
};

// ---------------------------------------------------------------------------
// HTTP client — shared across tools
// ---------------------------------------------------------------------------

const http = axios.create({
  baseURL: RBI_BASE,
  timeout: 30_000,
  headers: {
    "User-Agent": "LegalAnt/1.0 (legal research; contact: admin@legalant.in)",
    Accept: "text/html,application/xhtml+xml,application/pdf,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  },
  // Follow redirects
  maxRedirects: 5,
});

// ---------------------------------------------------------------------------
// search_rbi
// ---------------------------------------------------------------------------

/**
 * Scrape an RBI index page and return documents matching `query`.
 * Each RBI index page is a <table> with rows: Date | Subject (with link) | Ref No.
 */
async function scrapeIndexPage(path, type, query) {
  const results = [];
  try {
    const { data } = await http.get(path);
    const $ = load(data);

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      // RBI tables: col 0 = date, col 1 = title+link, col 2 = ref no (sometimes)
      const dateText = $(cells[0]).text().trim();
      const titleCell = $(cells[1]);
      const title = titleCell.text().trim();
      const refNo = cells.length >= 3 ? $(cells[2]).text().trim() : "";
      const href = titleCell.find("a").first().attr("href");

      if (!title || title.length < 5) return;

      // Query filter — case-insensitive substring match
      if (query && !title.toLowerCase().includes(query.toLowerCase())) return;

      const docUrl = href
        ? href.startsWith("http")
          ? href
          : `${RBI_BASE}${href.startsWith("/") ? "" : "/"}${href}`
        : null;

      results.push({ title, date: dateText, url: docUrl, ref_no: refNo, type });
    });
  } catch (err) {
    results.push({
      error: `Failed to fetch ${type} from ${path}: ${err.message}`,
      type,
    });
  }
  return results;
}

async function searchRbi({ query, document_type = "all" }) {
  if (!query) throw new Error("query is required");

  const types =
    document_type === "all"
      ? ["master_direction", "circular", "fema"]
      : [document_type];

  // Scrape all requested types in parallel
  const perTypeResults = await Promise.all(
    types.map((t) => scrapeIndexPage(ENDPOINTS[t] || ENDPOINTS.circular, t, query))
  );

  const results = perTypeResults.flat();
  const hits = results.filter((r) => !r.error);
  const errors = results.filter((r) => r.error);

  return {
    query,
    document_type,
    total_matches: hits.length,
    results: hits,
    errors: errors.length ? errors : undefined,
    source: "rbi.org.in",
    disclaimer: "Verify all documents against the official RBI website before reliance.",
  };
}

// ---------------------------------------------------------------------------
// fetch_rbi_document
// ---------------------------------------------------------------------------

/**
 * Download a document from rbi.org.in and extract its text.
 * Handles both PDFs (via pdf-parse) and HTML pages (via cheerio).
 */
async function fetchRbiDocument({ url }) {
  if (!url) throw new Error("url is required");

  // Security: only allow RBI domain
  const parsedUrl = new URL(url);
  if (!parsedUrl.hostname.endsWith("rbi.org.in")) {
    throw new Error("URL must be on the rbi.org.in domain");
  }

  const isPdf =
    url.toLowerCase().endsWith(".pdf") ||
    url.toLowerCase().includes("getpdfilecontents") ||
    url.toLowerCase().includes(".pdf?");

  if (isPdf) {
    // Download as binary buffer
    const { data } = await http.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(data);
    const parsed = await pdfParse(buffer);

    return {
      url,
      content_type: "pdf",
      page_count: parsed.numpages,
      char_count: parsed.text.length,
      content: parsed.text.slice(0, 50_000),
      truncated: parsed.text.length > 50_000,
      pdf_info: {
        title: parsed.info?.Title ?? null,
        author: parsed.info?.Author ?? null,
        creation_date: parsed.info?.CreationDate ?? null,
      },
    };
  } else {
    // HTML page
    const { data } = await http.get(url);
    const $ = load(data);

    // Remove boilerplate
    $("script, style, nav, header, footer, .menu, .nav, #header, #footer").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const rawText = $("body").text().replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    return {
      url,
      content_type: "html",
      title,
      char_count: rawText.length,
      content: rawText.slice(0, 50_000),
      truncated: rawText.length > 50_000,
    };
  }
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "legalant-rbi-scraper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_rbi",
      description:
        "Search RBI (Reserve Bank of India) website for documents matching a keyword. Covers master directions, circulars, and FEMA notifications. Returns title, date, URL, and document type for each match.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description:
              "Search keyword (e.g. 'NBFC', 'KYC', 'interest rate', 'FEMA reporting')",
          },
          document_type: {
            type: "string",
            enum: ["master_direction", "circular", "fema", "all"],
            default: "all",
            description:
              "Type of document to search: master_direction, circular, fema, or all (default)",
          },
        },
      },
    },
    {
      name: "fetch_rbi_document",
      description:
        "Download and extract text from an RBI document. Handles both PDFs and HTML pages. URL must be on rbi.org.in. Returns full text (capped at 50,000 characters).",
      inputSchema: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            description: "Full URL of the RBI document (must be on rbi.org.in)",
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
    if (name === "search_rbi") {
      result = await searchRbi(args);
    } else if (name === "fetch_rbi_document") {
      result = await fetchRbiDocument(args);
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
