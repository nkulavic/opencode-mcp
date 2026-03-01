import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerMessageTool(server: McpServer) {
  server.tool(
    "opencode_message",
    "Read the conversation history from an OpenCode session. Use 'list' AFTER a prompt completes to see what the agent did — its reasoning, tool calls, and code changes. Use 'get' for a specific message. Essential for reviewing the agent's work before accepting changes.",
    {
      action: z.enum(["list", "get"]),
      sessionId: z.string().describe("Session ID"),
      messageId: z.string().optional().describe("Message ID (required for get)"),
    },
    async ({ action, sessionId, messageId }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "list": {
            const messages = await client.session.messages({ path: { id: sessionId } });
            return { content: [{ type: "text" as const, text: JSON.stringify(messages) }] };
          }
          case "get": {
            if (!messageId) throw new Error("Message ID required for get");
            const message = await client.session.message({
              path: { id: sessionId, messageID: messageId },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(message) }] };
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
