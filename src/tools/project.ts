import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerProjectTool(server: McpServer) {
  server.tool(
    "opencode_project",
    "Get project info and available agents/commands. Actions: current (current project), list (all projects), agents (list available agents — use to know what agent names to pass to prompt/shell), commands (list available slash commands for session command action), vcs (git/VCS info — branch, status, etc.)",
    {
      action: z.enum(["current", "list", "agents", "commands", "vcs"]),
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
          case "agents": {
            const agents = await client.app.agents();
            return { content: [{ type: "text" as const, text: JSON.stringify(agents) }] };
          }
          case "commands": {
            const commands = await client.command.list();
            return { content: [{ type: "text" as const, text: JSON.stringify(commands) }] };
          }
          case "vcs": {
            const vcs = await client.vcs.get();
            return { content: [{ type: "text" as const, text: JSON.stringify(vcs) }] };
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
