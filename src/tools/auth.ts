import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerAuthTool(server: McpServer) {
  server.tool(
    "opencode_auth",
    "Set provider authentication. Action: set (configure API key for a provider)",
    {
      action: z.enum(["set"]),
      providerId: z.string().describe("Provider ID (e.g. 'cerebras')"),
      type: z.enum(["api", "oauth", "wellknown"]).describe("Auth type"),
      key: z.string().describe("API key"),
    },
    async ({ action, providerId, type: authType, key }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "set": {
            const authBody =
              authType === "api"
                ? { type: "api" as const, key }
                : authType === "wellknown"
                  ? { type: "wellknown" as const, key, token: key }
                  : { type: "oauth" as const, refresh: key, access: key, expires: 0 };
            const result = await client.auth.set({
              path: { id: providerId },
              body: authBody,
            });
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
