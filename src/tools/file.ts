import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerFileTool(server: McpServer) {
  server.tool(
    "opencode_file",
    "Read files and check file status. Actions: read (file content), status (changed files like git status)",
    {
      action: z.enum(["read", "status"]),
      path: z.string().optional().describe("File path (required for read)"),
    },
    async ({ action, path }) => {
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
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
