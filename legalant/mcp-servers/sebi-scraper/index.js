/**
 * LegalAnt — SEBI Scraper MCP Server
 *
 * Tools:
 *   search_sebi(query, document_type)     — search SEBI website for circulars, regulations, enforcement
 *   search_scores(company_name)           — fetch SEBI enforcement orders for a specific company
 *   fetch_sebi_document(url)              — download and extract text from a SEBI PDF or page
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

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEBI_BASE = "https://www.sebi.gov.in";
const SCORES_BASE = "https://scores.sebi.gov.in";

// SEBI listing endpoints — type parameter selects document category
// sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&type=X
const SEBI_LISTING = (type) =>
  `${SEBI_BASE}/sebiweb/home/HomeAction.do?doListing=yes&type=${type}`;

const TYPE_MAP = {
  circular: SEBI_LISTING(1),          // Circulars
  regulation: `${SEBI_BASE}/legal/regulations.html`,
  enforcement: `${SEBI_BASE}/enforcement/orders.html`,
};

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

const http = axios.create({
  timeout: 30_000,
  headers: {
    "User-Agent": "LegalAnt/1.0 (legal research; contact: admin@legalant.in)",
    Accept: "text/html,application/xhtml+xml,application/pdf,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  },
  maxRedirects: 5,
});

// ---------------------------------------------------------------------------
// search_sebi
// ---------------------------------------------------------------------------

/**
 * Parse SEBI's doListing page (circulars listing).
 * Table structure: Date | Subject (with link) | Circular no.
 */
async function parseSebiListingPage(url, type, query) {
  const results = [];
  try {
    const { data } = await http.get(url);
    const $ = load(data);

    // SEBI listing pages use <table> or <ul> depending on section
    $("table tr, .list_items li, .table-responsive tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const dateText = $(cells[0]).text().trim();
      const titleCell = $(cells[1]);
      const title = titleCell.text().trim();
      const docNo = cells.length >= 3 ? $(cells[2]).text().trim() : "";
      const href = titleCell.find("a").first().attr("href");

      if (!title || title.length < 5) return;
      if (query && !title.toLowerCase().includes(query.toLowerCase())) return;

      const docUrl = href
        ? href.startsWith("http")
          ? href
          : `${SEBI_BASE}${href.startsWith("/") ? "" : "/"}${href}`
        : null;

      results.push({ title, date: dateText, doc_no: docNo, url: docUrl, type });
    });

    // Fallback: parse anchor tags from content area for regulations/enforcement pages
    if (results.length === 0) {
      $(".content a, .inner_content a, #contentId a, .regulations a").each(
        (_, el) => {
          const title = $(el).text().trim();
          const href = $(el).attr("href");
          if (!title || title.length < 5) return;
          if (query && !title.toLowerCase().includes(query.toLowerCase())) return;

          const docUrl = href
            ? href.startsWith("http")
              ? href
              : `${SEBI_BASE}${href}`
            : null;

          results.push({ title, date: "", doc_no: "", url: docUrl, type });
        }
      );
    }
  } catch (err) {
    results.push({ error: `Failed to fetch ${type}: ${err.message}`, type });
  }
  return results;
}

async function searchSebi({ query, document_type = "all" }) {
  if (!query) throw new Error("query is required");

  const types =
    document_type === "all"
      ? ["circular", "regulation", "enforcement"]
      : [document_type];

  const perTypeResults = await Promise.all(
    types.map((t) => parseSebiListingPage(TYPE_MAP[t] || TYPE_MAP.circular, t, query))
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
    source: "sebi.gov.in",
    disclaimer: "Verify all documents against the official SEBI website before reliance.",
  };
}

// ---------------------------------------------------------------------------
// search_scores
// ---------------------------------------------------------------------------

/**
 * Search SEBI enforcement orders for a specific company.
 *
 * Primary source: SEBI enforcement orders page (sebi.gov.in/enforcement/orders.html)
 * Also queries: scores.sebi.gov.in company-name search
 *
 * Returns a consolidated list of enforcement actions and orders.
 */
async function searchScores({ company_name }) {
  if (!company_name) throw new Error("company_name is required");

  const results = [];

  // --- Source 1: SEBI enforcement orders page ---
  try {
    const { data } = await http.get(`${SEBI_BASE}/enforcement/orders.html`);
    const $ = load(data);

    $("table tr, .list_items li").each((_, row) => {
      const cells = $(row).find("td");
      const text = cells.length >= 2
        ? $(cells[1]).text().trim()
        : $(row).text().trim();
      const href = $(row).find("a").first().attr("href");
      const dateText = cells.length >= 1 ? $(cells[0]).text().trim() : "";

      if (!text || text.length < 5) return;
      if (!text.toLowerCase().includes(company_name.toLowerCase())) return;

      const docUrl = href
        ? href.startsWith("http") ? href : `${SEBI_BASE}${href}`
        : null;

      results.push({
        title: text,
        date: dateText,
        url: docUrl,
        source: "SEBI Enforcement Orders",
      });
    });
  } catch (err) {
    results.push({ error: `SEBI enforcement orders fetch failed: ${err.message}` });
  }

  // --- Source 2: SCORES portal — company search ---
  try {
    // SCORES uses a search endpoint; this fetches the public company-facing page
    const scoresSearchUrl = `${SCORES_BASE}/Grievance/listComp?companyName=${encodeURIComponent(company_name)}`;
    const { data } = await http.get(scoresSearchUrl);
    const $ = load(data);

    // Parse any company or enforcement entries returned
    $("table tr, .company-row, .result-row").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const name = $(cells[0]).text().trim();
      const status = cells.length >= 2 ? $(cells[1]).text().trim() : "";
      const details = cells.length >= 3 ? $(cells[2]).text().trim() : "";

      if (!name || name.length < 3) return;
      if (!name.toLowerCase().includes(company_name.toLowerCase())) return;

      results.push({
        company: name,
        status,
        details,
        source: "SCORES (scores.sebi.gov.in)",
      });
    });
  } catch (err) {
    // SCORES search may fail — non-fatal, we have results from source 1
    results.push({ error: `SCORES search failed: ${err.message}` });
  }

  const hits = results.filter((r) => !r.error);
  const errors = results.filter((r) => r.error);

  return {
    company_name,
    total_matches: hits.length,
    results: hits,
    errors: errors.length ? errors : undefined,
    sources: ["sebi.gov.in/enforcement/orders.html", "scores.sebi.gov.in"],
    disclaimer: "Enforcement data sourced from SEBI public pages. Verify against official records.",
  };
}

// ---------------------------------------------------------------------------
// fetch_sebi_document
// ---------------------------------------------------------------------------

/**
 * Download and extract text from a SEBI document URL.
 * Supports PDFs and HTML pages from sebi.gov.in and scores.sebi.gov.in.
 */
async function fetchSebiDocument({ url }) {
  if (!url) throw new Error("url is required");

  // Security: only allow SEBI domains
  const parsedUrl = new URL(url);
  const allowedHosts = ["sebi.gov.in", "www.sebi.gov.in", "scores.sebi.gov.in"];
  if (!allowedHosts.some((h) => parsedUrl.hostname === h)) {
    throw new Error("URL must be on sebi.gov.in or scores.sebi.gov.in");
  }

  const isPdf =
    url.toLowerCase().endsWith(".pdf") ||
    url.toLowerCase().includes("getdoc") ||
    parsedUrl.pathname.toLowerCase().includes(".pdf");

  if (isPdf) {
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
    const { data } = await http.get(url);
    const $ = load(data);

    $("script, style, nav, header, footer, .nav, #header, #footer, .breadcrumb").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const rawText = $("body")
      .text()
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

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
  { name: "legalant-sebi-scraper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_sebi",
      description:
        "Search SEBI (Securities and Exchange Board of India) for circulars, regulations, or enforcement orders matching a keyword. Returns title, date, document number, and URL for each match.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description:
              "Search keyword (e.g. 'insider trading', 'ICDR', 'mutual fund', 'listed entity')",
          },
          document_type: {
            type: "string",
            enum: ["circular", "regulation", "enforcement", "all"],
            default: "all",
            description:
              "Type of document to search: circular, regulation, enforcement, or all (default)",
          },
        },
      },
    },
    {
      name: "search_scores",
      description:
        "Search SEBI enforcement orders and SCORES (SEBI Complaints Redress System) for a specific company name. Returns enforcement actions, adjudication orders, and complaint data.",
      inputSchema: {
        type: "object",
        required: ["company_name"],
        properties: {
          company_name: {
            type: "string",
            description:
              "Name of the company to search (e.g. 'Infosys', 'ABC Securities Private Limited')",
          },
        },
      },
    },
    {
      name: "fetch_sebi_document",
      description:
        "Download and extract text from a SEBI document. Handles both PDFs and HTML pages. URL must be on sebi.gov.in or scores.sebi.gov.in. Returns full text (capped at 50,000 characters).",
      inputSchema: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            description:
              "Full URL of the SEBI document (must be on sebi.gov.in or scores.sebi.gov.in)",
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
    if (name === "search_sebi") {
      result = await searchSebi(args);
    } else if (name === "search_scores") {
      result = await searchScores(args);
    } else if (name === "fetch_sebi_document") {
      result = await fetchSebiDocument(args);
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
