import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerMcpServerTool(server: McpServer) {
  server.tool(
    "opencode_mcp_server",
    "Manage MCP servers within OpenCode. Actions: status (all server statuses), add (register new server), connect (connect to server), disconnect (disconnect from server), auth_remove (remove auth), auth_start (start auth flow), auth_callback (complete auth with code), auth_authenticate (authenticate with server).",
    {
      action: z.enum(["status", "add", "connect", "disconnect", "auth_remove", "auth_start", "auth_callback", "auth_authenticate"]),
      name: z.string().optional().describe("MCP server name (required for most actions except status)"),
      config: z.string().optional().describe("JSON — McpLocalConfig or McpRemoteConfig (for add)"),
      code: z.string().optional().describe("Authorization code (for auth_callback)"),
    },
    async ({ action, name, config, code }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "status": {
            const result = await client.mcp.status();
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "add": {
            if (!name) throw new Error("Server name required");
            if (!config) throw new Error("Config JSON required for add");
            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(config) as Record<string, unknown>; }
            catch { throw new Error("Invalid JSON for config — expected McpLocalConfig or McpRemoteConfig"); }
            const result = await client.mcp.add({ body: { name, config: parsed as Parameters<typeof client.mcp.add>[0] extends { body?: { config: infer C } } ? C : never } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "connect": {
            if (!name) throw new Error("Server name required");
            const result = await client.mcp.connect({ path: { name } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "disconnect": {
            if (!name) throw new Error("Server name required");
            const result = await client.mcp.disconnect({ path: { name } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "auth_remove": {
            if (!name) throw new Error("Server name required");
            const result = await client.mcp.auth.remove({ path: { name } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "auth_start": {
            if (!name) throw new Error("Server name required");
            const result = await client.mcp.auth.start({ path: { name } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "auth_callback": {
            if (!name) throw new Error("Server name required");
            if (!code) throw new Error("Authorization code required for auth_callback");
            const result = await client.mcp.auth.callback({ path: { name }, body: { code } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "auth_authenticate": {
            if (!name) throw new Error("Server name required");
            const result = await client.mcp.auth.authenticate({ path: { name } });
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
