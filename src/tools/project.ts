import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerProjectTool(server: McpServer) {
  server.tool(
    "opencode_project",
    "Get project information. Actions: current (current project), list (all projects)",
    {
      action: z.enum(["current", "list"]),
    },
    async ({ action }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "current": {
            const project = await client.project.current();
            return { content: [{ type: "text" as const, text: JSON.stringify(project) }] };
          }
          case "list": {
            const projects = await client.project.list();
            return { content: [{ type: "text" as const, text: JSON.stringify(projects) }] };
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
