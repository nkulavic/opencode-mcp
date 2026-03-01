# opencode-mcp Design Document

**Date:** 2026-02-28
**Status:** Approved

## Purpose

An MCP server that bridges the OpenCode SDK to Claude Code, enabling Claude (Opus 4.6) to orchestrate a Cerebras-powered coding agent (gpt-oss-120b at 3,000 tok/s) with full repo access. Claude acts as orchestrator and code reviewer; gpt-oss-120b handles fast code generation. No code ships without review.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Claude Code (Opus 4.6 — subscription)           │
│  Orchestrator + Code Reviewer                   │
│  ├── Plans tasks                                │
│  ├── Calls opencode_* MCP tools                 │
│  ├── Reviews diffs via file_status              │
│  ├── Reverts bad code via session revert        │
│  └── Sends feedback via session prompt          │
└──────────────────┬──────────────────────────────┘
                   │ MCP (stdio)
┌──────────────────▼──────────────────────────────┐
│ opencode-mcp (TypeScript + Node)                │
│  Self-contained: createOpencode() starts server │
│                                                 │
│  7 namespaced tools:                            │
│  opencode_session, opencode_message,            │
│  opencode_file, opencode_find,                  │
│  opencode_project, opencode_config,             │
│  opencode_auth                                  │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (localhost:4096)
┌──────────────────▼──────────────────────────────┐
│ OpenCode Server (headless, managed by SDK)       │
│  Agent: "coder" → cerebras/gpt-oss-120b         │
│  ├── Full file tools (read/write/edit/bash)     │
│  ├── Session memory                             │
│  └── 3,000 tok/s, 128k context                  │
└──────────────────┬──────────────────────────────┘
                   │ API
┌──────────────────▼──────────────────────────────┐
│ Cerebras Cloud — gpt-oss-120b                   │
└─────────────────────────────────────────────────┘
```

## MCP Tools (7 namespaced tools)

### opencode_session
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| create | session.create() | Start new session |
| get | session.get() | Get session state |
| list | session.list() | List all sessions |
| children | session.children() | Get child/forked sessions |
| update | session.update() | Update session |
| delete | session.delete() | Delete session |
| init | session.init() | Initialize session |
| abort | session.abort() | Stop generation |
| share | session.share() | Share a session |
| unshare | session.unshare() | Unshare a session |
| summarize | session.summarize() | Summarize session |
| revert | session.revert() | Revert changes |
| unrevert | session.unrevert() | Undo a revert |
| prompt | session.prompt() | Send task, get response |
| command | session.command() | Run OpenCode command |
| shell | session.shell() | Run shell command |

### opencode_message
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| list | session.messages() | All messages in session |
| get | session.message() | Single message |

### opencode_file
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| read | file.read() | Read file content |
| status | file.status() | Changed files |

### opencode_find
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| text | find.text() | Search file contents |
| files | find.files() | Search file names |
| symbols | find.symbols() | Search code symbols |

### opencode_project
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| current | project.current() | Current project info |
| list | project.list() | List all projects |

### opencode_config
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| get | config.get() | Get config |
| providers | config.providers() | List providers + defaults |

### opencode_auth
| Action | SDK Method | Purpose |
|--------|-----------|---------|
| set | auth.set() | Set provider API key |

## Project Structure

```
opencode-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── client.ts             # OpenCode SDK client wrapper (singleton)
│   └── tools/
│       ├── session.ts        # opencode_session tool
│       ├── message.ts        # opencode_message tool
│       ├── file.ts           # opencode_file tool
│       ├── find.ts           # opencode_find tool
│       ├── project.ts        # opencode_project tool
│       ├── config.ts         # opencode_config tool
│       └── auth.ts           # opencode_auth tool
├── opencode.json             # OpenCode config (Cerebras provider + agents)
├── package.json
├── tsconfig.json
└── .gitignore
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server framework
- `@opencode-ai/sdk` — OpenCode SDK (client + server launcher)
- `opencode-ai` — OpenCode CLI/binary
- `zod` — Schema validation for tool parameters
- `typescript` — Build tooling

## OpenCode Config (opencode.json)

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

## Claude Code Integration

`~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "opencode": {
      "command": "node",
      "args": ["/Users/nickkulavic/Projects/opencode-mcp/dist/index.js"],
      "env": {
        "CEREBRAS_API_KEY": "<key>"
      }
    }
  }
}
```

## Review Workflow

1. User gives Claude a task
2. Claude (Opus) plans the approach
3. Claude calls `opencode_session({ action: "create" })`
4. Claude calls `opencode_session({ action: "prompt", id, content: "..." })`
5. gpt-oss-120b reads files, writes code at 3,000 tok/s
6. Claude calls `opencode_file({ action: "status" })` to see changes
7. Claude calls `opencode_message({ action: "list", sessionId })` to read what was done
8. Claude reviews the diff:
   - **Good** → moves to next task
   - **Bad** → `opencode_session({ action: "revert" })` then `opencode_session({ action: "prompt", content: "Fix X..." })` (gpt-oss-120b retains session context)
9. Loop until all code passes review

## Design Decisions

- **gpt-oss-120b over zai-glm-4.7**: 3x faster, cheaper. Quality gap closed by Opus review.
- **7 grouped tools over 30 individual**: Lighter MCP context loading, same functionality.
- **createOpencode() over separate server**: Self-contained, no manual process management.
- **OpenCode writes directly**: Fastest path. Claude reviews after via diff and can revert.
- **Auto-fix loop**: Fully autonomous review cycle, no human intervention needed.
- **Session sync**: OpenCode sessions persist context across turns so gpt-oss-120b remembers what it built.
