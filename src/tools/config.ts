import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerConfigTool(server: McpServer) {
  server.tool(
    "opencode_config",
    "Get OpenCode configuration. Actions: get (full config), providers (list providers and default models)",
    {
      action: z.enum(["get", "providers"]),
    },
    async ({ action }) => {
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
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
