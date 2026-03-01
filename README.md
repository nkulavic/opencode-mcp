# opencode-mcp

An MCP server that gives Claude Code access to fast AI coding agents — letting it delegate code generation to models running at 2,000+ tokens/sec on Cerebras while it focuses on what it's best at: planning, reviewing, and reasoning.

```
Claude Code (Opus) ──MCP──▶ opencode-mcp ──SDK──▶ OpenCode ──API──▶ Cerebras / any provider
   orchestrator                bridge              agent           fast inference
```

## Why I Built This

Claude Code is the best coding agent I've used. It plans well, catches subtle bugs, writes production-quality code, and reasons through complex architectures. But it's slow. A feature that takes Claude 5-10 minutes to generate can be drafted by a fast model in 2 seconds.

Meanwhile, fast open-source models on Cerebras (gpt-oss-120b, zai-glm-4.7) can generate hundreds of lines of working code almost instantly — but they make mistakes. Operator precedence bugs, missing edge cases, security issues, rough UX. They're fast but not careful.

The insight: **these aren't competing approaches — they're complementary.** A fast model generates 80% of the code in seconds. Claude catches the bugs, fixes the security issues, and polishes the UX. You get Claude-quality output at near-Cerebras speed.

This project makes that workflow seamless. It bridges [OpenCode](https://opencode.ai) (an open-source coding agent) to Claude Code via [MCP](https://modelcontextprotocol.io) (Model Context Protocol), so Claude can delegate tasks to fast models without leaving the conversation.

### The Problem It Solves

Without this tool, you pick one:

| Approach | Speed | Quality | Cost |
|----------|-------|---------|------|
| Claude Code alone | Slow (minutes) | Excellent | High |
| Fast model alone | Instant (seconds) | Good but buggy | Low |

With this tool, you get both:

| Approach | Speed | Quality | Cost |
|----------|-------|---------|------|
| Fast model drafts + Claude reviews | Fast (seconds + review) | Excellent | Low |

### Real Numbers

From actual testing during development:

| Task | Fast Model (Cerebras) | Claude Alone | Team (Fast + Claude) |
|------|----------------------|--------------|---------------------|
| Finance dashboard | 2s, 308 lines, 9 bugs | ~8min, 1,684 lines, 0 bugs | 2s draft + 6min polish = production quality |
| Drawing app | 1.4s, 471 lines | ~7.5min, 1,380 lines | 1.4s draft + restyle prompt = matching quality |
| Spreadsheet | 2s, 442 lines, 6 bugs | N/A | 2s draft + 1.8s fix = working app |

The fast model does the heavy lifting. Claude does the thinking.

## How It Works

### The Stack

There are four layers:

1. **Claude Code** (the orchestrator) — you talk to this. It plans, breaks tasks down, reviews code, catches bugs, and decides what to do next. It calls the MCP tools to delegate work.

2. **opencode-mcp** (this project) — a Node.js MCP server that translates Claude's tool calls into OpenCode SDK calls. It exposes 12 tools covering the full OpenCode API surface. Runs as a stdio process managed by Claude Code.

3. **OpenCode** (the coding agent) — an open-source AI coding agent with full repo access. It can read files, write files, edit files, run shell commands, and manage sessions. It runs as a local HTTP server (`opencode serve`).

4. **Inference providers** (the muscle) — Cerebras, or any OpenCode-compatible provider. Cerebras runs open-source models at 2,000+ tokens/sec on custom hardware. You can swap providers or models per-prompt.

### The Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  You                                                         │
│  "Build me a finance dashboard"                              │
└─────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│  Claude Code (Opus)                                          │
│                                                              │
│  1. Plans the approach                                       │
│  2. Creates an OpenCode session via MCP                      │
│  3. Sends a detailed prompt to gpt-oss-120b on Cerebras      │
│  4. Reviews the generated code                               │
│  5. Identifies bugs and UX issues                            │
│  6. Sends fix prompts or rewrites directly                   │
│  7. Repeats until production quality                         │
│                                                              │
│  Tools used: opencode_session, opencode_file, opencode_find  │
└─────────────────────┬────────────────────────────────────────┘
                      │ MCP (stdio)
┌─────────────────────▼────────────────────────────────────────┐
│  opencode-mcp (this project)                                 │
│                                                              │
│  - 12 tools covering full OpenCode SDK                       │
│  - Zod schema validation on every call                       │
│  - Connect-only client with retry logic                      │
│  - Singleton connection, lazy initialization                 │
│                                                              │
│  src/tools/session.ts  — 22 actions (prompt, revert, diff…)  │
│  src/tools/file.ts     — read, status, list                  │
│  src/tools/find.ts     — grep, file search, symbol search    │
│  src/tools/project.ts  — project info, agents, vcs           │
│  src/tools/provider.ts — model/provider management           │
│  … and 7 more                                                │
└─────────────────────┬────────────────────────────────────────┘
                      │ HTTP (localhost:4096)
┌─────────────────────▼────────────────────────────────────────┐
│  OpenCode Server (opencode serve)                            │
│                                                              │
│  - Session-based coding agent                                │
│  - Full repo access: read, write, edit, bash                 │
│  - Context retention across prompts                          │
│  - Revert/unrevert for safe iteration                        │
│  - Dynamic model switching per-prompt                        │
└─────────────────────┬────────────────────────────────────────┘
                      │ API
┌─────────────────────▼────────────────────────────────────────┐
│  Cerebras (or any provider)                                  │
│                                                              │
│  - gpt-oss-120b: 2,000+ tok/sec                             │
│  - zai-glm-4.7: fast reasoning model                        │
│  - Any model OpenCode supports                               │
└──────────────────────────────────────────────────────────────┘
```

### How Sessions Work

Sessions are the core concept. A session is a persistent conversation with the coding agent:

```
Create session → Get session ID
    │
    ▼
Send prompt (with session ID) → Agent generates code → Files change on disk
    │
    ▼
Review changes (read files, check diff, check status)
    │
    ├─ Good → Send next prompt (same session, agent remembers context)
    │
    └─ Bad → Revert changes → Send new prompt with feedback
```

The agent retains full context within a session. If you say "make the header blue" in prompt #3, it remembers what header you're talking about from prompt #1. This is what makes iteration fast — you don't re-explain context each time.

### Dynamic Model Switching

You can change models per-prompt without touching config:

```
// Default model (from opencode.json)
opencode_session prompt → uses gpt-oss-120b

// Override for this prompt only
opencode_session prompt model="zai-glm-4.7" provider="cerebras"

// Try a different model
opencode_session prompt model="llama3.1-8b" provider="cerebras"
```

This lets Claude pick the right model for each task: a fast model for boilerplate, a reasoning model for complex logic, or the default for everything else.

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- A provider API key (e.g., [Cerebras](https://cloud.cerebras.ai))

### Install

```bash
git clone https://github.com/nkulavic/opencode-mcp.git
cd opencode-mcp
cp .env.example .env   # Add your API key
npm run setup          # Installs deps (including OpenCode CLI), builds, and verifies
```

`npm install` automatically downloads the OpenCode CLI binary for your platform via the `opencode-ai` npm package. No separate install needed.

> **Already have OpenCode installed globally?** That works too. `start.sh` checks `node_modules/.bin/opencode` first, then falls back to your global install.

### Add to Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "opencode": {
      "command": "/absolute/path/to/opencode-mcp/start.sh"
    }
  }
}
```

`start.sh` handles the full lifecycle:
1. Finds the `opencode` binary (local or global)
2. Checks if `opencode serve` is already running
3. If not, starts it in the background and waits for it to be ready
4. Launches the MCP server on stdio
5. Cleans up the OpenCode server process on exit

### Verify It Works

In Claude Code:

```
You: "Use opencode to create a hello world HTML file at examples/test/index.html"

Claude will:
1. Call opencode_session create → gets session ID
2. Call opencode_session prompt → sends task to Cerebras
3. Review the generated file
4. Report back
```

## Tools Reference

12 tools covering the full OpenCode SDK (~62 methods across 12 namespaces).

### Core Workflow Tools

| Tool | Actions | What It Does |
|------|---------|--------------|
| `opencode_session` | create, prompt, promptAsync, revert, unrevert, diff, fork, abort, summarize, + 13 more | The main tool. Create sessions, send coding tasks, review diffs, revert bad changes, fork sessions. Supports `model` and `provider` params for dynamic model switching. |
| `opencode_message` | list, get | Read the agent's conversation history. See what it did and why. Use `limit` to get recent messages only. |
| `opencode_file` | status, read, list | Check what files changed (`status`), read file contents (`read`), browse directories (`list`). |
| `opencode_find` | text, files, symbols | Search the codebase. `text` is grep, `files` finds by name, `symbols` finds functions/classes. |

### Configuration & Auth Tools

| Tool | Actions | What It Does |
|------|---------|--------------|
| `opencode_project` | current, list, agents, commands, vcs | Get project info, discover available agents, list commands, get git status/branch info. |
| `opencode_config` | get, providers, update | Read and update OpenCode configuration. |
| `opencode_auth` | set | Set provider API credentials. |
| `opencode_provider` | list, auth, authorize, callback | List providers with models and connection status. OAuth flow for providers that need it. |

### Advanced Tools

| Tool | Actions | What It Does |
|------|---------|--------------|
| `opencode_tool` | ids, list | Discover what tools the agent has available. `list` returns full JSON schema per tool. |
| `opencode_mcp_server` | status, add, connect, disconnect, + 4 auth actions | Manage MCP servers running inside OpenCode itself. |
| `opencode_pty` | list, create, get, update, remove | Manage terminal sessions within OpenCode. |
| `opencode_instructions` | *(static)* | Returns the full workflow guide. Claude can call this when it needs a refresher on how to use the tools. |

### Full Session Actions

The `opencode_session` tool has 22 actions — here's what each does:

| Action | Purpose |
|--------|---------|
| `create` | Start a new session. Returns a session ID. |
| `prompt` | Send a coding task. The agent generates code. |
| `promptAsync` | Send a task without waiting for completion. |
| `revert` | Undo changes from a specific message. Pass `messageId`. |
| `unrevert` | Undo a revert. |
| `diff` | See what changed. Optional `messageId` to diff a specific prompt. |
| `fork` | Fork a session at a specific message to try a different approach. |
| `abort` | Cancel a running prompt. |
| `summarize` | Get a summary of what the agent has done so far. |
| `get` | Get session details. |
| `list` | List all sessions. |
| `status` | Overall status. |
| `children` | List child/forked sessions. |
| `update` | Update session metadata. |
| `delete` | Delete a session. |
| `init` | Re-initialize a session. |
| `share` / `unshare` | Share/unshare a session. |
| `command` | Run an agent command. |
| `shell` | Run a shell command in the session. |
| `todo` | Get the session's todo list. |
| `permission` | Respond to tool permission requests (once/always/reject). |

## Workflows

### Basic: Delegate and Review

The simplest pattern — send a task, review the result:

```
1. opencode_session create → session ID
2. opencode_session prompt "Create a REST API at src/api/users.ts with GET/POST/DELETE endpoints"
3. Read src/api/users.ts → review the code
4. If good → done
5. If bad → opencode_session revert → opencode_session prompt "Fix: the DELETE endpoint doesn't validate the ID param"
```

### Team: Fast Draft + Claude Polish

The most powerful pattern. A fast model generates code instantly, Claude elevates it to production quality:

```
1. opencode_session create
2. opencode_session prompt (gpt-oss-120b) → "Build a dashboard with charts and dark mode"
   └─ 2 seconds, 300+ lines generated
3. Claude reads the code, finds:
   - Operator precedence bug in toggle logic
   - XSS vulnerability via innerHTML
   - No keyboard accessibility
   - Rough visual design
4. Claude rewrites the file directly with:
   - All bugs fixed
   - Glassmorphism UI, animated charts, responsive grid
   - Proper error handling and accessibility
   └─ 1,600+ lines, production quality
```

### Parallel: Multiple Models

Send the same task to multiple models and compare:

```
Session A → gpt-oss-120b → fast, concise output
Session B → zai-glm-4.7  → different approach, more verbose
Session C → Claude direct → highest quality, slowest

Compare outputs, pick the best, iterate from there.
```

### Iterative: Restyle and Refine

Use OpenCode for rapid iteration — send fix prompts and the agent applies them in seconds:

```
1. Generate initial version (2s)
2. "Make the toolbar wider with icon sections" (1.5s)
3. "Add a gradient header and pill-shaped toggle" (1.8s)
4. "Fix the chart colors for dark mode" (1.2s)
```

Each prompt builds on the session context. The agent remembers everything.

## Examples

The `examples/` directory contains apps built during development to test the MCP bridge. Each is a single HTML file you can open directly in a browser.

### Direct Comparisons

These pairs show the same app built two ways:

| App | Via OpenCode (Cerebras) | Via Claude (Direct) |
|-----|------------------------|-------------------|
| Kanban Board | `kanban-opencode/` | `kanban-direct/` |
| Drawing App | `drawing-gpt-oss/`, `drawing-glm/` | `drawing-claude/` |

### Team Workflow Results

These were built using the "fast draft + Claude polish" pattern:

| App | Draft Model | Draft Time | Final Lines |
|-----|------------|------------|-------------|
| `finance-dashboard/` | gpt-oss-120b | ~2s | 1,684 |
| `finance-dashboard-glm/` | zai-glm-4.7 | ~2.5s | 1,318 |
| `spreadsheet/` | gpt-oss-120b | ~2s | 544 |

### Single-Model Examples

| App | Model | Notes |
|-----|-------|-------|
| `todo-app/` | gpt-oss-120b | Drag-and-drop, filters, localStorage |

## Configuration

### `opencode.json`

Controls the default model and provider. This file lives in your project root:

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

You can define multiple agents with different models and select them per-prompt using the `agent` parameter.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CEREBRAS_API_KEY` | Cerebras API key | *(required)* |
| `OPENCODE_HOST` | OpenCode server bind address | `127.0.0.1` |
| `OPENCODE_PORT` | OpenCode server port | `4096` |

### Using Other Providers

OpenCode supports multiple providers. To use a different one:

1. Add the provider to `opencode.json`
2. Set the appropriate API key in `.env`
3. Either change the default model or use dynamic switching per-prompt

## Project Structure

```
opencode-mcp/
├── src/
│   ├── index.ts              # MCP server setup, tool registration, instructions
│   ├── client.ts             # OpenCode SDK client (singleton, retry logic)
│   └── tools/
│       ├── session.ts        # 22 actions — the core tool
│       ├── message.ts        # Conversation history
│       ├── file.ts           # File operations
│       ├── find.ts           # Code search
│       ├── project.ts        # Project info + VCS
│       ├── config.ts         # Configuration
│       ├── auth.ts           # Provider auth
│       ├── provider.ts       # Provider management
│       ├── tool.ts           # Tool discovery
│       ├── mcp-server.ts     # MCP server management
│       ├── pty.ts            # Terminal sessions
│       └── instructions.ts   # Static workflow guide
├── scripts/
│   └── postinstall.mjs       # Post-install verification
├── examples/                  # Demo apps built with the tool
├── start.sh                   # Startup script (manages opencode serve lifecycle)
├── opencode.json              # OpenCode agent/provider config
├── package.json
├── tsconfig.json
└── .env.example
```

Every tool file follows the same pattern:
- Import `McpServer`, `z`, and `getClient`
- Export `registerXTool(server: McpServer)`
- Define a Zod schema with an `action` enum
- Switch on action, call the SDK, return JSON
- Wrap errors with `isError: true`

## Development

```bash
npm run dev    # Watch mode — recompiles TypeScript on save
npm run build  # One-time build
npm start      # Run MCP server (requires opencode serve running separately)
./start.sh     # Run both opencode serve and MCP server
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on adding tools, extending the SDK coverage, and submitting examples.

## License

[MIT](LICENSE)
