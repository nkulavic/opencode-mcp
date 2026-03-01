import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerConfigTool(server: McpServer) {
  server.tool(
    "opencode_config",
    "Manage OpenCode configuration. Actions: get (full config), providers (list providers and default models), update (modify config)",
    {
      action: z.enum(["get", "providers", "update"]),
      body: z.record(z.unknown()).optional().describe("Config object to merge (for update action)"),
    },
    async ({ action, body }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "get": {
            const config = await client.config.get();
            return { content: [{ type: "text" as const, text: JSON.stringify(config) }] };
          }
          case "providers": {
            const providers = await client.config.providers();
            return { content: [{ type: "text" as const, text: JSON.stringify(providers) }] };
          }
          case "update": {
            if (!body) throw new Error("Body required for update");
            const config = await client.config.update({ body: body as Record<string, unknown> });
            return { content: [{ type: "text" as const, text: JSON.stringify(config) }] };
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
