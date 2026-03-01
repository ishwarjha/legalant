/**
 * LegalAnt — SEBI Scraper MCP Server
 *
 * Exposes tools for fetching SEBI (Securities and Exchange Board of India) content:
 *  - sebi_search_circulars     Search SEBI circulars by keyword and date range
 *  - sebi_get_regulations      Fetch SEBI regulations list or a specific regulation
 *  - sebi_search_orders        Search SEBI orders, adjudication orders, or settlements
 *
 * Base URL: https://www.sebi.gov.in
 *
 * Run:  node index.js
 * Transport: stdio (Claude Code connects via stdin/stdout)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as cheerio from "cheerio";

const SEBI_BASE = "https://www.sebi.gov.in";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const http = axios.create({
  baseURL: SEBI_BASE,
  timeout: 20000,
  headers: {
    "User-Agent":
      "LegalAnt/1.0 (legal research bot; contact: admin@legalant.in)",
    Accept: "text/html,application/xhtml+xml,application/json",
  },
});

async function fetchPage(url) {
  const response = await http.get(url);
  return cheerio.load(response.data);
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * Search SEBI circulars by keyword.
 * Targets: https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=9&smid=0
 *
 * SEBI provides a JSON-friendly listing for some categories.
 * This implementation scrapes the HTML listing page.
 */
async function searchSebiCirculars({ query, date_from, date_to, limit = 20 }) {
  const results = [];

  try {
    // SEBI circulars listing — adjust path for the specific circular category as needed
    const $ = await fetchPage(
      "/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=9&smid=0"
    );

    $("table.tablesorter tr, .list_table tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const dateText = $(cells[0]).text().trim();
      const subject = $(cells[1]).text().trim();
      const link = $(cells[1]).find("a").attr("href");
      const circularNo =
        cells.length >= 3 ? $(cells[2]).text().trim() : "";

      if (query && !subject.toLowerCase().includes(query.toLowerCase()))
        return;

      if (date_from || date_to) {
        // SEBI dates: DD/MM/YYYY or YYYY-MM-DD
        const parts = dateText.includes("/")
          ? dateText.split("/")
          : dateText.split("-");
        if (parts.length === 3) {
          const [d, m, y] =
            parts[0].length === 4
              ? [parts[2], parts[1], parts[0]]
              : [parts[0], parts[1], parts[2]];
          const itemDate = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
          if (date_from && itemDate < new Date(date_from)) return;
          if (date_to && itemDate > new Date(date_to)) return;
        }
      }

      results.push({
        date: dateText,
        subject,
        circular_number: circularNo,
        url: link
          ? link.startsWith("http")
            ? link
            : `${SEBI_BASE}${link}`
          : null,
      });

      if (results.length >= limit) return false;
    });
  } catch (error) {
    throw new Error(`SEBI circular search failed: ${error.message}`);
  }

  return {
    query,
    date_from: date_from ?? null,
    date_to: date_to ?? null,
    total_results: results.length,
    results,
    source: "SEBI website (sebi.gov.in)",
    disclaimer: "Verify all circulars against the official SEBI website.",
  };
}

/**
 * Fetch SEBI regulations.
 * SEBI regulations are listed at: https://www.sebi.gov.in/legal/regulations.html
 */
async function getSebiRegulations({ regulation_name }) {
  const regulations = [];

  try {
    const $ = await fetchPage("/legal/regulations.html");

    $("ul li a, table tr td a, .regulations-list a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (!title) return;

      if (
        regulation_name &&
        !title.toLowerCase().includes(regulation_name.toLowerCase())
      )
        return;

      regulations.push({
        title,
        url: href
          ? href.startsWith("http")
            ? href
            : `${SEBI_BASE}${href}`
          : null,
      });
    });
  } catch (error) {
    throw new Error(`Failed to fetch SEBI regulations: ${error.message}`);
  }

  return {
    filter: regulation_name ?? "all",
    total: regulations.length,
    regulations,
    source: "SEBI Regulations page (sebi.gov.in/legal/regulations.html)",
    disclaimer:
      "SEBI regulations are amended periodically. Always check for the latest consolidated version.",
    key_regulations_reference: [
      "SEBI (LODR) Regulations, 2015 — listed company obligations",
      "SEBI (ICDR) Regulations, 2018 — public issues / rights issues",
      "SEBI (PIT) Regulations, 2015 — insider trading",
      "SEBI (SAST) Regulations, 2011 — takeovers",
      "SEBI (AIF) Regulations, 2012 — alternative investment funds",
      "SEBI (IA) Regulations, 2013 — investment advisers",
      "SEBI (RA) Regulations, 2014 — research analysts",
      "SEBI (Mutual Funds) Regulations, 1996",
    ],
  };
}

/**
 * Search SEBI enforcement orders and adjudication orders.
 * Targets: https://www.sebi.gov.in/enforcement/orders.html
 */
async function searchSebiOrders({ query, order_type, limit = 20 }) {
  const orders = [];

  try {
    const path =
      order_type === "adjudication"
        ? "/enforcement/adjudication-orders.html"
        : order_type === "settlement"
        ? "/enforcement/settlement-orders.html"
        : "/enforcement/orders.html";

    const $ = await fetchPage(path);

    $("table tr, .orders-list li").each((_, row) => {
      const cells = $(row).find("td");
      const text =
        cells.length >= 2
          ? $(cells[0]).text().trim()
          : $(row).text().trim();
      const subject =
        cells.length >= 2 ? $(cells[1]).text().trim() : text;
      const link =
        $(row).find("a").attr("href") ||
        (cells.length >= 2 ? $(cells[1]).find("a").attr("href") : null);

      if (!subject || subject.length < 5) return;

      if (query && !subject.toLowerCase().includes(query.toLowerCase()))
        return;

      orders.push({
        date: cells.length >= 2 ? text : null,
        subject,
        url: link
          ? link.startsWith("http")
            ? link
            : `${SEBI_BASE}${link}`
          : null,
      });

      if (orders.length >= limit) return false;
    });
  } catch (error) {
    throw new Error(`SEBI orders search failed: ${error.message}`);
  }

  return {
    query,
    order_type: order_type ?? "all",
    total_results: orders.length,
    orders,
    source: "SEBI Enforcement (sebi.gov.in)",
    disclaimer: "Verify all orders against the official SEBI website.",
  };
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "legalant-sebi-scraper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "sebi_search_circulars",
      description:
        "Search SEBI (Securities and Exchange Board of India) circulars by keyword and optional date range. Useful for securities law compliance research.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keyword to search (e.g., 'insider trading', 'LODR', 'listed entity')",
          },
          date_from: {
            type: "string",
            format: "date",
            description: "Start date filter (YYYY-MM-DD)",
          },
          date_to: {
            type: "string",
            format: "date",
            description: "End date filter (YYYY-MM-DD)",
          },
          limit: {
            type: "integer",
            default: 20,
            description: "Maximum results to return (default: 20)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "sebi_get_regulations",
      description:
        "Fetch the list of SEBI regulations, optionally filtered by name or topic (e.g., 'takeover', 'mutual fund', 'ICDR'). Returns regulation titles and URLs.",
      inputSchema: {
        type: "object",
        properties: {
          regulation_name: {
            type: "string",
            description:
              "Filter by regulation name/keyword. Leave empty for all regulations.",
          },
        },
      },
    },
    {
      name: "sebi_search_orders",
      description:
        "Search SEBI enforcement orders, adjudication orders, or settlement orders by keyword or respondent name.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword or respondent name to search",
          },
          order_type: {
            type: "string",
            enum: ["all", "adjudication", "settlement"],
            description:
              "Type of order: 'adjudication', 'settlement', or 'all' (default)",
            default: "all",
          },
          limit: {
            type: "integer",
            default: 20,
            description: "Maximum results to return (default: 20)",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "sebi_search_circulars":
        result = await searchSebiCirculars(args);
        break;
      case "sebi_get_regulations":
        result = await getSebiRegulations(args ?? {});
        break;
      case "sebi_search_orders":
        result = await searchSebiOrders(args);
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
            { error: error.message, tool: name, args },
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
