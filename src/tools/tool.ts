import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerToolTool(server: McpServer) {
  server.tool(
    "opencode_tool",
    "Discover available tools in OpenCode. Actions: ids (list all tool IDs), list (get tools with JSON schema for a specific provider/model).",
    {
      action: z.enum(["ids", "list"]),
      provider: z.string().optional().describe("Provider ID (required for list)"),
      model: z.string().optional().describe("Model ID (required for list)"),
    },
    async ({ action, provider, model }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "ids": {
            const result = await client.tool.ids();
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "list": {
            if (!provider) throw new Error("Provider required for list");
            if (!model) throw new Error("Model required for list");
            const result = await client.tool.list({ query: { provider, model } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
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
