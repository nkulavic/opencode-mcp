import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerFindTool(server: McpServer) {
  server.tool(
    "opencode_find",
    "Search the codebase through OpenCode. Use 'text' to grep file contents, 'files' to find files by name, 'symbols' to find code symbols (functions, classes, etc). Useful for understanding the codebase before sending tasks to the agent.",
    {
      action: z.enum(["text", "files", "symbols"]),
      pattern: z.string().optional().describe("Search pattern (required for text)"),
      query: z.string().optional().describe("Search query (required for files/symbols)"),
      directory: z.string().optional().describe("Override search root directory"),
      dirs: z.enum(["true", "false"]).optional().describe("Include directories in results (files action only)"),
    },
    async ({ action, pattern, query, directory, dirs }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "text": {
            if (!pattern) throw new Error("Pattern required for text search");
            const results = await client.find.text({
              query: {
                pattern,
                ...(directory ? { directory } : {}),
              },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
          }
          case "files": {
            if (!query) throw new Error("Query required for file search");
            const results = await client.find.files({
              query: {
                query,
                ...(directory ? { directory } : {}),
                ...(dirs ? { dirs } : {}),
              },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
          }
          case "symbols": {
            if (!query) throw new Error("Query required for symbol search");
            const results = await client.find.symbols({
              query: {
                query,
                ...(directory ? { directory } : {}),
              },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
          }
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
