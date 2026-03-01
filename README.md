# opencode-mcp

An MCP server that bridges [OpenCode](https://opencode.ai) to Claude Code — giving Claude access to fast AI coding agents powered by Cerebras, together, and other providers.

```
Claude Code (Opus) ──MCP──▶ opencode-mcp ──SDK──▶ OpenCode ──API──▶ Cerebras / any provider
   orchestrator                bridge              agent           fast inference
```

Claude plans and reviews. OpenCode generates code at 2,000+ tokens/sec. You get the best of both: quality reasoning with blazing speed.

## What It Does

- **12 MCP tools** exposing the full OpenCode SDK to Claude Code
- **Dynamic model switching** — change models per-prompt without config changes
- **Session management** — agents retain context across multiple prompts
- **Full repo access** — the coding agent can read, write, edit files and run shell commands
- **Team workflows** — OpenCode drafts fast, Claude reviews and polishes

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [OpenCode](https://opencode.ai) — `brew install opencode-ai/tap/opencode`
- A provider API key (e.g., [Cerebras](https://cloud.cerebras.ai))

### Install

```bash
git clone https://github.com/nkulavic/opencode-mcp.git
cd opencode-mcp
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
# Edit .env and add your API key:
# CEREBRAS_API_KEY=your-key-here
```

### Add to Claude Code

Add this to your Claude Code MCP settings (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "opencode": {
      "command": "/path/to/opencode-mcp/start.sh"
    }
  }
}
```

The `start.sh` script handles everything — starts `opencode serve` if needed, waits for it to be ready, then launches the MCP server.

### Use It

In Claude Code, you now have access to a fast coding agent:

```
You: "Create a REST API with Express and TypeScript"

Claude: Creates a session, sends the task to OpenCode (Cerebras),
        reviews the generated code, iterates if needed.
```

## Tools Reference

| Tool | Actions | Description |
|------|---------|-------------|
| `opencode_session` | create, prompt, revert, diff, fork, + 17 more | Core tool — manage coding agent sessions |
| `opencode_message` | list, get | Read agent conversation history |
| `opencode_file` | status, read, list | Review file changes, read files, browse dirs |
| `opencode_find` | text, files, symbols | Search codebase — grep, find by name, find symbols |
| `opencode_project` | current, list, agents, commands, vcs | Project info, available agents, git status |
| `opencode_config` | get, providers, update | Manage configuration |
| `opencode_auth` | set | Set provider API credentials |
| `opencode_provider` | list, auth, authorize, callback | Provider management with OAuth |
| `opencode_tool` | ids, list | Discover available tools with JSON schema |
| `opencode_mcp_server` | status, add, connect, disconnect, + 4 more | Manage MCP servers within OpenCode |
| `opencode_pty` | list, create, get, update, remove | Terminal session management |
| `opencode_instructions` | *(static)* | On-demand workflow guide |

## Dynamic Model Switching

Switch models on the fly without changing config:

```
opencode_session prompt with model="gpt-oss-120b" provider="cerebras"
opencode_session prompt with model="zai-glm-4.7" provider="cerebras"
opencode_session prompt with model="llama3.1-8b" provider="cerebras"
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Claude Code (Opus)                             │
│  - Plans and breaks down tasks                  │
│  - Reviews all generated code                   │
│  - Catches bugs, fixes security issues          │
│  - Polishes UX and code quality                 │
├─────────────────────────────────────────────────┤
│  opencode-mcp (this project)                    │
│  - 12 MCP tools bridging the full SDK           │
│  - Stdio transport for Claude Code              │
│  - Connect-only client with retry logic         │
├─────────────────────────────────────────────────┤
│  OpenCode Server (opencode serve)               │
│  - Manages coding agent sessions                │
│  - Full repo access (read/write/edit/bash)      │
│  - Handles provider authentication              │
├─────────────────────────────────────────────────┤
│  Inference Providers                            │
│  - Cerebras (2,000+ tok/sec)                    │
│  - Any OpenCode-compatible provider             │
└─────────────────────────────────────────────────┘
```

## Team Workflow: Write + Polish

The most powerful pattern — use OpenCode for fast drafts, Claude for quality:

1. **OpenCode writes** (gpt-oss-120b on Cerebras) — generates a working app in ~2 seconds
2. **Claude reviews** — identifies bugs, security issues, UX gaps
3. **Claude polishes** — rewrites with production-quality UX, proper error handling, accessibility

Results from testing:

| Phase | Model | Time | Output |
|-------|-------|------|--------|
| Draft | gpt-oss-120b | ~2s | 308 lines, working but rough |
| Polish | Claude Opus | ~6min | 1,684 lines, production quality |

## Examples

The `examples/` directory contains apps built during development to test the MCP bridge:

| Example | How It Was Built |
|---------|-----------------|
| `todo-app/` | OpenCode + gpt-oss-120b |
| `kanban-opencode/` | OpenCode + gpt-oss-120b |
| `kanban-direct/` | Claude directly (for comparison) |
| `drawing-gpt-oss/` | OpenCode + gpt-oss-120b, restyled |
| `drawing-glm/` | OpenCode + zai-glm-4.7, restyled |
| `drawing-claude/` | Claude directly (for comparison) |
| `spreadsheet/` | OpenCode draft + Claude review |
| `finance-dashboard/` | Team workflow: gpt-oss-120b draft → Claude polish |
| `finance-dashboard-glm/` | Team workflow: zai-glm-4.7 draft → Claude polish |

Each example is a single HTML file — open directly in a browser.

## Configuration

### `opencode.json`

Controls which model and provider OpenCode uses by default:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "cerebras": {}
  },
  "agent": {
    "coder": {
      "model": "cerebras/gpt-oss-120b",
      "tools": { "read": true, "write": true, "edit": true, "bash": true }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CEREBRAS_API_KEY` | Cerebras API key | *(required)* |
| `OPENCODE_HOST` | OpenCode server host | `127.0.0.1` |
| `OPENCODE_PORT` | OpenCode server port | `4096` |

## Development

```bash
npm run dev    # Watch mode
npm run build  # Build once
npm start      # Run MCP server (needs opencode serve running)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on adding tools and examples.

## License

[MIT](LICENSE)
