import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerSessionTool(server: McpServer) {
  server.tool(
    "opencode_session",
    "Manage OpenCode coding agent sessions. START HERE: use action 'create' to get a session ID, then 'prompt' to send coding tasks. The agent has full file access (read/write/edit/bash). Use 'model' and 'provider' params on prompt/shell/command to switch models on the fly. Actions: create, get, list, status (overall status), children, update, delete, init, abort, share, unshare, summarize, revert (undo changes, pass messageId), unrevert, prompt (send task), promptAsync (send task, return immediately), command (run agent command), shell (run shell command), diff (get code diff, optional messageId), fork (fork session at a message), todo (get session todo list), permission (respond to tool permission requests — once/always/reject). Always reuse session IDs for related work.",
    {
      action: z.enum([
        "create", "get", "list", "children", "update", "delete",
        "init", "abort", "share", "unshare", "summarize",
        "revert", "unrevert", "prompt", "promptAsync", "command", "shell",
        "diff", "fork", "todo", "status", "permission",
      ]),
      id: z.string().optional().describe("Session ID (required for most actions except create/list/status)"),
      content: z.string().optional().describe("Prompt content, command, or shell command"),
      messageId: z.string().optional().describe("Message ID (for diff, fork, revert)"),
      model: z.string().optional().describe("Model ID to use (e.g. 'gpt-oss-120b', 'zai-glm-4.7', 'llama3.1-8b'). Overrides the default model for this prompt."),
      provider: z.string().optional().describe("Provider ID (e.g. 'cerebras', 'opencode'). Required when specifying model."),
      agent: z.string().optional().describe("Agent to use for prompt/shell (e.g. 'coder', 'build'). Defaults to the configured agent."),
      body: z.record(z.unknown()).optional().describe("Additional body parameters (noReply, system, tools, etc.)"),
      permissionId: z.string().optional().describe("Permission ID (for permission action)"),
      response: z.enum(["once", "always", "reject"]).optional().describe("Permission response (for permission action)"),
    },
    async ({ action, id, content, messageId, model, provider, agent, body, permissionId, response }) => {
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
            let initBody: { modelID: string; providerID: string; messageID: string } | undefined;
            if (model && messageId) {
              initBody = { modelID: model, providerID: provider ?? "cerebras", messageID: messageId };
            } else if (body) {
              initBody = body as { modelID: string; providerID: string; messageID: string };
            }
            const result = await client.session.init({
              path: { id },
              body: initBody,
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
            const sumBody = model
              ? { modelID: model, providerID: provider ?? "cerebras" }
              : (body as { providerID: string; modelID: string } | undefined);
            const result = await client.session.summarize({
              path: { id },
              body: sumBody,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "revert": {
            if (!id) throw new Error("Session ID required");
            const revertBody = messageId
              ? { messageID: messageId, ...(body?.["partID"] ? { partID: body["partID"] as string } : {}) }
              : (body as { messageID: string; partID?: string } | undefined);
            const session = await client.session.revert({
              path: { id },
              body: revertBody,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "unrevert": {
            if (!id) throw new Error("Session ID required");
            const session = await client.session.unrevert({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
          }
          case "prompt":
          case "promptAsync": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for prompt");
            const promptBody: Record<string, unknown> = {
              ...(body as Record<string, unknown>),
              parts: [{ type: "text" as const, text: content }],
            };
            if (model) promptBody.model = { modelID: model, providerID: provider ?? "cerebras" };
            if (agent) promptBody.agent = agent;
            const typedBody = promptBody as typeof promptBody & { parts: [{ type: "text"; text: string }] };
            const result = action === "promptAsync"
              ? await client.session.promptAsync({ path: { id }, body: typedBody })
              : await client.session.prompt({ path: { id }, body: typedBody });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "command": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for command");
            const cmdBody: Record<string, unknown> = {
              command: content,
              arguments: (body?.["arguments"] as string) ?? "",
            };
            if (agent) cmdBody.agent = agent;
            if (body?.["messageID"]) cmdBody.messageID = body["messageID"];
            if (model) cmdBody.model = model;
            const result = await client.session.command({
              path: { id },
              body: cmdBody as { command: string; arguments: string },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "shell": {
            if (!id) throw new Error("Session ID required");
            if (!content) throw new Error("Content required for shell");
            const shellBody: Record<string, unknown> = {
              command: content,
              agent: agent ?? (body?.["agent"] as string) ?? "default",
            };
            if (model) {
              shellBody.model = { modelID: model, providerID: provider ?? "cerebras" };
            }
            const result = await client.session.shell({
              path: { id },
              body: shellBody as { command: string; agent: string },
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          }
          case "diff": {
            if (!id) throw new Error("Session ID required");
            const diff = await client.session.diff({
              path: { id },
              ...(messageId ? { query: { messageID: messageId } } : {}),
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(diff) }] };
          }
          case "fork": {
            if (!id) throw new Error("Session ID required");
            const forked = await client.session.fork({
              path: { id },
              ...(messageId ? { body: { messageID: messageId } } : {}),
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(forked) }] };
          }
          case "todo": {
            if (!id) throw new Error("Session ID required");
            const todo = await client.session.todo({ path: { id } });
            return { content: [{ type: "text" as const, text: JSON.stringify(todo) }] };
          }
          case "status": {
            const sessionStatus = await client.session.status();
            return { content: [{ type: "text" as const, text: JSON.stringify(sessionStatus) }] };
          }
          case "permission": {
            if (!id) throw new Error("Session ID required");
            if (!permissionId) throw new Error("Permission ID required");
            if (!response) throw new Error("Response required (once, always, or reject)");
            const result = await client.postSessionIdPermissionsPermissionId({
              path: { id, permissionID: permissionId },
              body: { response },
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
