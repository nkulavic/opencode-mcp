import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerPtyTool(server: McpServer) {
  server.tool(
    "opencode_pty",
    "Manage terminal (PTY) sessions. Actions: list (all PTY sessions), create (new terminal with command/args/cwd), get (session by ID), update (resize or rename), remove (close session). Skip 'connect' — it's a WebSocket upgrade.",
    {
      action: z.enum(["list", "create", "get", "update", "remove"]),
      id: z.string().optional().describe("PTY session ID (required for get/update/remove)"),
      command: z.string().optional().describe("Command to run (for create)"),
      args: z.string().optional().describe("JSON array of arguments (for create)"),
      cwd: z.string().optional().describe("Working directory (for create)"),
      title: z.string().optional().describe("Session title (for create/update)"),
      env: z.string().optional().describe("JSON object of environment variables (for create)"),
      rows: z.number().optional().describe("Terminal rows (for update — resize)"),
      cols: z.number().optional().describe("Terminal columns (for update — resize)"),
    },
    async ({ action, id, command, args, cwd, title, env, rows, cols }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "list": {
            const result = await client.pty.list();
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "create": {
            const body: Record<string, unknown> = {};
            if (command) body.command = command;
            if (args) {
              try { body.args = JSON.parse(args) as string[]; }
              catch { throw new Error("Invalid JSON for args — expected a JSON array like [\"--flag\", \"value\"]"); }
            }
            if (cwd) body.cwd = cwd;
            if (title) body.title = title;
            if (env) {
              try { body.env = JSON.parse(env) as Record<string, string>; }
              catch { throw new Error("Invalid JSON for env — expected a JSON object like {\"KEY\": \"value\"}"); }
            }
            const result = await client.pty.create({ body: body as { command?: string; args?: string[]; cwd?: string; title?: string; env?: Record<string, string> } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "get": {
            if (!id) throw new Error("PTY session ID required");
            const result = await client.pty.get({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "update": {
            if (!id) throw new Error("PTY session ID required");
            const body: Record<string, unknown> = {};
            if (title) body.title = title;
            if (rows !== undefined && cols !== undefined) body.size = { rows, cols };
            const result = await client.pty.update({ path: { id }, body: body as { title?: string; size?: { rows: number; cols: number } } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "remove": {
            if (!id) throw new Error("PTY session ID required");
            const result = await client.pty.remove({ path: { id } });
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
