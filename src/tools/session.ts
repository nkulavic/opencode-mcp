import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerSessionTool(server: McpServer) {
  server.tool(
    "opencode_session",
    "Manage OpenCode coding agent sessions. START HERE: use action 'create' to get a session ID, then 'prompt' to send coding tasks. The agent has full file access (read/write/edit/bash). Use 'model' and 'provider' params on prompt to switch models on the fly (e.g. model='gpt-oss-120b' for speed, model='zai-glm-4.7' for quality). Use 'revert' to undo bad changes, 'abort' to stop a running task, 'summarize' to get a session recap. Always reuse session IDs for related work.",
    {
      action: z.enum([
        "create", "get", "list", "children", "update", "delete",
        "init", "abort", "share", "unshare", "summarize",
        "revert", "unrevert", "prompt", "command", "shell",
      ]),
      id: z.string().optional().describe("Session ID (required for most actions except create/list)"),
      content: z.string().optional().describe("Prompt content, command, or shell command"),
      model: z.string().optional().describe("Model ID to use (e.g. 'gpt-oss-120b', 'zai-glm-4.7', 'llama3.1-8b'). Overrides the default model for this prompt."),
      provider: z.string().optional().describe("Provider ID (e.g. 'cerebras', 'opencode'). Required when specifying model."),
      body: z.record(z.unknown()).optional().describe("Additional body parameters"),
    },
    async ({ action, id, content, model, provider, body }) => {
      try {
        const client = await getClient();

        switch (action) {
          case "create": {
            const session = await client.session.create({ body: body as { parentID?: string; title?: string } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "get": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.get({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "list": {
            const sessions = await client.session.list();
            return { content: [{ type: "text" as const, text: JSON.stringify(sessions) }] };
          }
          case "children": {
            if (!id) throw new Error("Session ID required");
            const children = await client.session.children({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(children) }] };
          }
          case "update": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.update({ path: { id }, body: body as { title?: string } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "delete": {
            if (!id) throw new Error("Session ID required");
            const result = await client.session.delete({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "init": {
            if (!id) throw new Error("Session ID required");
            const result = await client.session.init({
              path: { id },
              body: body as { modelID: string; providerID: string; messageID: string } | undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "abort": {
            if (!id) throw new Error("Session ID required");
            const result = await client.session.abort({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "share": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.share({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "unshare": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.unshare({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "summarize": {
            if (!id) throw new Error("Session ID required");
            const result = await client.session.summarize({
              path: { id },
              body: body as { providerID: string; modelID: string } | undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "revert": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.revert({
              path: { id },
              body: body as { messageID: string; partID?: string } | undefined,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "unrevert": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.unrevert({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "prompt": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for prompt");
            const promptBody = {
              ...(body as Record<string, unknown>),
              parts: [{ type: "text" as const, text: content }],
              ...(model ? { model: { modelID: model, providerID: provider ?? "cerebras" } } : {}),
            };
            const result = await client.session.prompt({
              path: { id },
              body: promptBody as typeof promptBody & { parts: [{ type: "text"; text: string }] },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "command": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for command");
            const result = await client.session.command({
              path: { id },
              body: {
                ...(body as Record<string, unknown>),
                command: content,
                arguments: (body?.["arguments"] as string) ?? "",
              },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "shell": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for shell");
            const result = await client.session.shell({
              path: { id },
              body: {
                ...(body as Record<string, unknown>),
                command: content,
                agent: (body?.["agent"] as string) ?? "default",
              },
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
