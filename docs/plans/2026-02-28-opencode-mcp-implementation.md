# opencode-mcp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that exposes the full OpenCode SDK as 7 namespaced tools, powered by Cerebras gpt-oss-120b, for use inside Claude Code.

**Architecture:** Thin MCP proxy over OpenCode SDK. `createOpencode()` starts the server internally. 7 tools with action-based routing map to all SDK methods. Claude Code orchestrates and reviews.

**Tech Stack:** TypeScript, Node, `@modelcontextprotocol/sdk`, `@opencode-ai/sdk`, `opencode-ai`, `zod`

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `opencode.json`

**Step 1: Create package.json**

```json
{
  "name": "opencode-mcp",
  "version": "0.1.0",
  "description": "MCP server bridging OpenCode SDK to Claude Code",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "@opencode-ai/sdk": "latest",
    "opencode-ai": "latest",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.env
```

**Step 4: Create opencode.json**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "cerebras": {}
  },
  "agent": {
    "coder": {
      "description": "Fast coding agent powered by Cerebras gpt-oss-120b",
      "mode": "primary",
      "model": "cerebras/gpt-oss-120b",
      "tools": {
        "read": true,
        "write": true,
        "edit": true,
        "bash": true
      }
    }
  }
}
```

**Step 5: Install dependencies**

Run: `cd /Users/nickkulavic/Projects/opencode-mcp && npm install`
Expected: `node_modules/` created, lock file generated

**Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore opencode.json package-lock.json
git commit -m "feat: project scaffold with dependencies"
```

---

### Task 2: OpenCode Client Wrapper

**Files:**
- Create: `src/client.ts`

**Step 1: Create the singleton client**

```typescript
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";

let clientInstance: Awaited<ReturnType<typeof createOpencode>>["client"] | null = null;

export async function getClient() {
  if (clientInstance) return clientInstance;

  const { client } = await createOpencode({
    hostname: "127.0.0.1",
    port: 4096,
  });

  clientInstance = client;
  return client;
}

export type OpenCodeClient = Awaited<ReturnType<typeof getClient>>;
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or SDK type issues to resolve — adjust imports if needed)

**Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat: OpenCode SDK client singleton wrapper"
```

---

### Task 3: MCP Server Entry Point (Skeleton)

**Files:**
- Create: `src/index.ts`

**Step 1: Create the MCP server skeleton**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSessionTool } from "./tools/session.js";
import { registerMessageTool } from "./tools/message.js";
import { registerFileTool } from "./tools/file.js";
import { registerFindTool } from "./tools/find.js";
import { registerProjectTool } from "./tools/project.js";
import { registerConfigTool } from "./tools/config.js";
import { registerAuthTool } from "./tools/auth.js";

const server = new McpServer({
  name: "opencode-mcp",
  version: "0.1.0",
});

registerSessionTool(server);
registerMessageTool(server);
registerFileTool(server);
registerFindTool(server);
registerProjectTool(server);
registerConfigTool(server);
registerAuthTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 2: Create stub files for each tool**

Create all 7 stub files in `src/tools/` with this pattern:

```typescript
// src/tools/<name>.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register<Name>Tool(server: McpServer) {
  // TODO: implement
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/index.ts src/tools/
git commit -m "feat: MCP server skeleton with tool stubs"
```

---

### Task 4: opencode_session Tool

**Files:**
- Modify: `src/tools/session.ts`

**Step 1: Implement the session tool with all 16 actions**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerSessionTool(server: McpServer) {
  server.tool(
    "opencode_session",
    "Manage OpenCode sessions. Actions: create, get, list, children, update, delete, init, abort, share, unshare, summarize, revert, unrevert, prompt, command, shell",
    {
      action: z.enum([
        "create", "get", "list", "children", "update", "delete",
        "init", "abort", "share", "unshare", "summarize",
        "revert", "unrevert", "prompt", "command", "shell",
      ]),
      id: z.string().optional().describe("Session ID (required for most actions except create/list)"),
      content: z.string().optional().describe("Prompt content, command, or shell command"),
      body: z.record(z.unknown()).optional().describe("Additional body parameters"),
    },
    async ({ action, id, content, body }) => {
      const client = await getClient();

      switch (action) {
        case "create": {
          const session = await client.session.create({ body: body ?? {} });
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
          const session = await client.session.update({ path: { id }, body: body ?? {} });
          return { content: [{ type: "text" as const, text: JSON.stringify(session) }] };
        }
        case "delete": {
          if (!id) throw new Error("Session ID required");
          const result = await client.session.delete({ path: { id } });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        case "init": {
          if (!id) throw new Error("Session ID required");
          const result = await client.session.init({ path: { id }, body: body ?? {} });
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
          const result = await client.session.summarize({ path: { id }, body: body ?? {} });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        case "revert": {
          if (!id) throw new Error("Session ID required");
          const session = await client.session.revert({ path: { id }, body: body ?? {} });
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
          const result = await client.session.prompt({ path: { id }, body: { content, ...body } });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        case "command": {
          if (!id) throw new Error("Session ID required");
          if (!content) throw new Error("Content required for command");
          const result = await client.session.command({ path: { id }, body: { content, ...body } });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        case "shell": {
          if (!id) throw new Error("Session ID required");
          if (!content) throw new Error("Content required for shell");
          const result = await client.session.shell({ path: { id }, body: { content, ...body } });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/tools/session.ts
git commit -m "feat: opencode_session tool with all 16 actions"
```

---

### Task 5: opencode_message Tool

**Files:**
- Modify: `src/tools/message.ts`

**Step 1: Implement the message tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerMessageTool(server: McpServer) {
  server.tool(
    "opencode_message",
    "Read messages from an OpenCode session. Actions: list (all messages), get (single message)",
    {
      action: z.enum(["list", "get"]),
      sessionId: z.string().describe("Session ID"),
      messageId: z.string().optional().describe("Message ID (required for get)"),
    },
    async ({ action, sessionId, messageId }) => {
      const client = await getClient();

      switch (action) {
        case "list": {
          const messages = await client.session.messages({ path: { id: sessionId } });
          return { content: [{ type: "text" as const, text: JSON.stringify(messages) }] };
        }
        case "get": {
          if (!messageId) throw new Error("Message ID required for get");
          const message = await client.session.message({ path: { id: sessionId } });
          return { content: [{ type: "text" as const, text: JSON.stringify(message) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/message.ts
git commit -m "feat: opencode_message tool"
```

---

### Task 6: opencode_file Tool

**Files:**
- Modify: `src/tools/file.ts`

**Step 1: Implement the file tool**

```typescript
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
          const files = await client.file.status({});
          return { content: [{ type: "text" as const, text: JSON.stringify(files) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/file.ts
git commit -m "feat: opencode_file tool"
```

---

### Task 7: opencode_find Tool

**Files:**
- Modify: `src/tools/find.ts`

**Step 1: Implement the find tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerFindTool(server: McpServer) {
  server.tool(
    "opencode_find",
    "Search the codebase. Actions: text (search file contents), files (search file names), symbols (search code symbols)",
    {
      action: z.enum(["text", "files", "symbols"]),
      pattern: z.string().optional().describe("Search pattern (required for text)"),
      query: z.string().optional().describe("Search query (required for files/symbols)"),
      directory: z.string().optional().describe("Override search root directory"),
      limit: z.number().optional().describe("Max results (1-200)"),
      type: z.enum(["file", "directory"]).optional().describe("Filter by type (files action only)"),
    },
    async ({ action, pattern, query, directory, limit, type }) => {
      const client = await getClient();

      switch (action) {
        case "text": {
          if (!pattern) throw new Error("Pattern required for text search");
          const results = await client.find.text({ query: { pattern } });
          return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
        }
        case "files": {
          const results = await client.find.files({
            query: {
              ...(query ? { query } : {}),
              ...(directory ? { directory } : {}),
              ...(limit ? { limit } : {}),
              ...(type ? { type } : {}),
            },
          });
          return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
        }
        case "symbols": {
          if (!query) throw new Error("Query required for symbol search");
          const results = await client.find.symbols({ query: { query } });
          return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/find.ts
git commit -m "feat: opencode_find tool"
```

---

### Task 8: opencode_project Tool

**Files:**
- Modify: `src/tools/project.ts`

**Step 1: Implement the project tool**

```typescript
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
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/project.ts
git commit -m "feat: opencode_project tool"
```

---

### Task 9: opencode_config Tool

**Files:**
- Modify: `src/tools/config.ts`

**Step 1: Implement the config tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerConfigTool(server: McpServer) {
  server.tool(
    "opencode_config",
    "Get OpenCode configuration. Actions: get (full config), providers (list providers and default models)",
    {
      action: z.enum(["get", "providers"]),
    },
    async ({ action }) => {
      const client = await getClient();

      switch (action) {
        case "get": {
          const config = await client.config.get();
          return { content: [{ type: "text" as const, text: JSON.stringify(config) }] };
        }
        case "providers": {
          const providers = await client.config.providers();
          return { content: [{ type: "text" as const, text: JSON.stringify(providers) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/config.ts
git commit -m "feat: opencode_config tool"
```

---

### Task 10: opencode_auth Tool

**Files:**
- Modify: `src/tools/auth.ts`

**Step 1: Implement the auth tool**

```typescript
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
      type: z.string().describe("Auth type"),
      key: z.string().describe("API key"),
    },
    async ({ action, providerId, type, key }) => {
      const client = await getClient();

      switch (action) {
        case "set": {
          const result = await client.auth.set({
            path: { id: providerId },
            body: { type, key },
          });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/tools/auth.ts
git commit -m "feat: opencode_auth tool"
```

---

### Task 11: Build and Verify

**Step 1: Build the project**

Run: `cd /Users/nickkulavic/Projects/opencode-mcp && npm run build`
Expected: `dist/` directory created with compiled JS files, no errors

**Step 2: Fix any type errors**

If there are SDK type mismatches, adjust the tool implementations to match actual SDK signatures. The SDK is generated from OpenAPI so types should match the docs, but import paths may need tweaking.

**Step 3: Verify the MCP server starts**

Run: `node dist/index.js`
Expected: Server starts and waits for stdio input (no crash)

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: build passing, all tools implemented"
```

---

### Task 12: Claude Code Integration

**Step 1: Add MCP server to Claude Code settings**

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "opencode": {
    "command": "node",
    "args": ["/Users/nickkulavic/Projects/opencode-mcp/dist/index.js"],
    "env": {
      "CEREBRAS_API_KEY": "<your-cerebras-key>"
    }
  }
}
```

**Step 2: Restart Claude Code and verify tools appear**

Run: `claude` (new session)
Expected: 7 `opencode_*` tools available

**Step 3: Smoke test — create a session and send a prompt**

In Claude Code, ask it to:
1. Call `opencode_session({ action: "create" })`
2. Call `opencode_session({ action: "prompt", id: "<id>", content: "Write a hello world function in TypeScript" })`
3. Call `opencode_file({ action: "status" })` to see changes

**Step 4: Commit and push**

```bash
git add -A
git commit -m "docs: add Claude Code integration instructions"
git push -u origin master
```
