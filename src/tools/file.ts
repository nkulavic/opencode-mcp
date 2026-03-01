import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerFileTool(server: McpServer) {
  server.tool(
    "opencode_file",
    "Check what files the OpenCode agent changed. Use 'status' AFTER a prompt to see which files were created/modified (like git status). Use 'read' to inspect specific file contents. Use 'list' to browse directories. This is your primary review tool — always check status after the agent writes code.",
    {
      action: z.enum(["read", "status", "list"]),
      path: z.string().optional().describe("File/directory path (required for read and list)"),
    },
    async ({ action, path }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "read": {
            if (!path) throw new Error("Path required for read");
            const file = await client.file.read({ query: { path } });
            return { content: [{ type: "text" as const, text: JSON.stringify(file) }] };
          }
          case "status": {
            const files = await client.file.status();
            return { content: [{ type: "text" as const, text: JSON.stringify(files) }] };
          }
          case "list": {
            if (!path) throw new Error("Path required for list");
            const entries = await client.file.list({ query: { path } });
            return { content: [{ type: "text" as const, text: JSON.stringify(entries) }] };
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
