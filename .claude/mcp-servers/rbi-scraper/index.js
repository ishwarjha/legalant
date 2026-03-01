/**
 * LegalAnt — RBI Scraper MCP Server
 *
 * Exposes tools for fetching RBI (Reserve Bank of India) regulatory content:
 *  - rbi_search_circulars      Search RBI circulars by keyword and date range
 *  - rbi_get_master_directions  List / fetch master directions by category
 *  - rbi_get_press_release     Fetch a specific press release by URL or ID
 *
 * Base URL: https://www.rbi.org.in
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

const RBI_BASE = "https://www.rbi.org.in";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const http = axios.create({
  baseURL: RBI_BASE,
  timeout: 20000,
  headers: {
    "User-Agent":
      "LegalAnt/1.0 (legal research bot; contact: admin@legalant.in)",
    Accept: "text/html,application/xhtml+xml",
  },
});

/**
 * Fetch a URL and return a Cheerio root for parsing.
 */
async function fetchPage(url) {
  const response = await http.get(url);
  return cheerio.load(response.data);
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * Search RBI circulars / notifications by keyword.
 * Targets: https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx
 *
 * NOTE: RBI's search is form-based. This implementation scrapes the listing
 * page and filters client-side. For production, consider using the RBI
 * API or a dedicated search endpoint if made available.
 */
async function searchRbiCirculars({ query, date_from, date_to, limit = 20 }) {
  const results = [];

  try {
    const $ = await fetchPage("/Scripts/BS_CircularIndexDisplay.aspx");

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const dateText = $(cells[0]).text().trim();
      const subject = $(cells[1]).text().trim();
      const refNo = $(cells[2]).text().trim();
      const link = $(cells[1]).find("a").attr("href");

      // Basic keyword filter (case-insensitive)
      if (query && !subject.toLowerCase().includes(query.toLowerCase())) return;

      // Date range filter (DD-MM-YYYY format on RBI site)
      if (date_from || date_to) {
        const parts = dateText.split("-");
        if (parts.length === 3) {
          const itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (date_from && itemDate < new Date(date_from)) return;
          if (date_to && itemDate > new Date(date_to)) return;
        }
      }

      results.push({
        date: dateText,
        subject,
        reference_number: refNo,
        url: link ? `${RBI_BASE}${link}` : null,
      });

      if (results.length >= limit) return false; // break
    });
  } catch (error) {
    throw new Error(`RBI circular search failed: ${error.message}`);
  }

  return {
    query,
    date_from: date_from ?? null,
    date_to: date_to ?? null,
    total_results: results.length,
    results,
    source: "RBI website (rbi.org.in)",
    disclaimer:
      "Always verify against the official RBI website before reliance.",
  };
}

/**
 * Get RBI Master Directions by category.
 * Listing page: https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx
 */
async function getMasterDirections({ category }) {
  const directions = [];

  try {
    const $ = await fetchPage("/Scripts/BS_ViewMasDirections.aspx");

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const title = $(cells[0]).text().trim();
      const link = $(cells[0]).find("a").attr("href");
      const updatedDate = $(cells[1]).text().trim();

      if (
        category &&
        !title.toLowerCase().includes(category.toLowerCase())
      )
        return;

      directions.push({
        title,
        updated_date: updatedDate,
        url: link ? `${RBI_BASE}${link}` : null,
      });
    });
  } catch (error) {
    throw new Error(`Failed to fetch RBI Master Directions: ${error.message}`);
  }

  return {
    category: category ?? "all",
    total: directions.length,
    directions,
    source: "RBI Master Directions (rbi.org.in)",
    disclaimer:
      "Master Directions are updated periodically. Verify the current version on the RBI website.",
  };
}

/**
 * Fetch the text content of a specific RBI press release or circular URL.
 */
async function getPressRelease({ url }) {
  if (!url) throw new Error("url is required");

  // Only allow RBI domain to prevent SSRF
  if (!url.startsWith(RBI_BASE) && !url.startsWith("https://rbi.org.in")) {
    throw new Error("URL must be from rbi.org.in domain");
  }

  try {
    const $ = await fetchPage(url);

    const title =
      $("title").text().trim() ||
      $("h1").first().text().trim() ||
      "Untitled";

    // Extract main content — RBI pages typically use table-based layout
    const contentEl = $(".MainContent, #mainContent, .content_section, body");
    const textContent = contentEl
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // cap to avoid context overflow

    return {
      url,
      title,
      content_excerpt: textContent,
      fetched_at: new Date().toISOString(),
      disclaimer:
        "Content extracted from RBI website. Verify against the official source.",
    };
  } catch (error) {
    throw new Error(`Failed to fetch RBI page: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "legalant-rbi-scraper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "rbi_search_circulars",
      description:
        "Search RBI (Reserve Bank of India) circulars and notifications by keyword and optional date range. Returns titles, reference numbers, and URLs.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword to search (e.g., 'FEMA', 'NBFC', 'interest rate')",
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
            description: "Maximum results to return (default: 20, max: 100)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "rbi_get_master_directions",
      description:
        "Fetch the list of RBI Master Directions, optionally filtered by category/topic (e.g., 'NBFC', 'KYC', 'lending').",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Topic filter (e.g., 'NBFC', 'KYC', 'Foreign Investment'). Leave empty for all.",
          },
        },
      },
    },
    {
      name: "rbi_get_press_release",
      description:
        "Fetch the text content of a specific RBI press release, circular, or notification from its URL. URL must be on rbi.org.in.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Full URL of the RBI page (must be on rbi.org.in)",
          },
        },
        required: ["url"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "rbi_search_circulars":
        result = await searchRbiCirculars(args);
        break;
      case "rbi_get_master_directions":
        result = await getMasterDirections(args ?? {});
        break;
      case "rbi_get_press_release":
        result = await getPressRelease(args);
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
// Server is now running on stdio — Claude Code will connect automatically
