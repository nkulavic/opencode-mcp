import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerProviderTool(server: McpServer) {
  server.tool(
    "opencode_provider",
    "Manage AI providers. Actions: list (all providers with models and connection status), auth (get auth methods per provider), authorize (start OAuth flow), callback (complete OAuth flow with authorization code).",
    {
      action: z.enum(["list", "auth", "authorize", "callback"]),
      id: z.string().optional().describe("Provider ID (required for authorize/callback)"),
      method: z.number().optional().describe("Auth method index (for authorize/callback)"),
      code: z.string().optional().describe("Authorization code (for callback)"),
    },
    async ({ action, id, method, code }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "list": {
            const result = await client.provider.list();
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "auth": {
            const result = await client.provider.auth();
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "authorize": {
            if (!id) throw new Error("Provider ID required");
            if (method === undefined) throw new Error("Auth method index required for authorize");
            const result = await client.provider.oauth.authorize({ path: { id }, body: { method } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "callback": {
            if (!id) throw new Error("Provider ID required");
            if (method === undefined) throw new Error("Auth method index required for callback");
            const result = await client.provider.oauth.callback({ path: { id }, body: { method, ...(code ? { code } : {}) } });
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
