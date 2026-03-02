# opencode-mcp

An MCP server that gives Claude Code access to fast AI coding agents — letting it delegate code generation to models running at 2,000+ tokens/sec on Cerebras while it focuses on what it's best at: planning, reviewing, and reasoning.

```mermaid
graph LR
    A["Claude Code<br/>(Opus)"] -->|MCP| B["opencode-mcp<br/>(bridge)"]
    B -->|SDK| C["OpenCode<br/>(agent)"]
    C -->|API| D["Cerebras<br/>(2,000+ tok/s)"]
    style A fill:#6C5CE7,color:#fff,stroke:none
    style B fill:#00CEC9,color:#fff,stroke:none
    style C fill:#00B894,color:#fff,stroke:none
    style D fill:#FDCB6E,color:#333,stroke:none
```

---

## Why I Built This

Claude Code is the best coding agent I've used. It plans well, catches subtle bugs, writes production-quality code, and reasons through complex architectures. But it's slow — a feature that takes Claude 5-10 minutes to generate can be drafted by a fast model in 2 seconds.

Meanwhile, fast open-source models on Cerebras (gpt-oss-120b, zai-glm-4.7) generate hundreds of lines of working code almost instantly — but they make mistakes. Operator precedence bugs, missing edge cases, security issues, rough UX. They're fast but not careful.

**The insight: these aren't competing approaches — they're complementary.**

```mermaid
graph TD
    subgraph "Without opencode-mcp"
        X1["Claude Code alone"] -.->|"Slow (minutes)"| X2["Excellent quality"]
        X3["Fast model alone"] -.->|"Instant (seconds)"| X4["Good but buggy"]
    end
    subgraph "With opencode-mcp"
        Y1["Fast model drafts"] -->|"~2 seconds"| Y2["80% complete, has bugs"]
        Y2 --> Y3["Claude reviews + polishes"]
        Y3 -->|"minutes"| Y4["Excellent quality"]
    end
    style Y4 fill:#00B894,color:#fff,stroke:none
    style X2 fill:#6C5CE7,color:#fff,stroke:none
    style X4 fill:#FDCB6E,color:#333,stroke:none
```

A fast model generates 80% of the code in seconds. Claude catches the bugs, fixes the security issues, and polishes the UX. You get Claude-quality output at near-Cerebras speed.

### Real Numbers

From actual testing during development:

| Task | Fast Model (Cerebras) | Claude Alone | Team (Fast + Claude) |
|------|----------------------|--------------|---------------------|
| Finance dashboard | 2s, 308 lines, 9 bugs | ~8min, 1,684 lines, 0 bugs | 2s draft + 6min polish = production quality |
| Drawing app | 1.4s, 471 lines | ~7.5min, 1,380 lines | 1.4s draft + restyle prompt = matching quality |
| Spreadsheet | 2s, 442 lines, 6 bugs | N/A | 2s draft + 1.8s fix = working app |

The fast model does the heavy lifting. Claude does the thinking.

---

## How It Works

### Architecture

Four layers, each with a clear responsibility:

```mermaid
graph TB
    subgraph "Layer 1 — You"
        U["'Build me a finance dashboard'"]
    end
    subgraph "Layer 2 — Claude Code (Opus)"
        C1["Plans the approach"]
        C2["Creates OpenCode session"]
        C3["Sends prompt to Cerebras"]
        C4["Reviews generated code"]
        C5["Identifies bugs & UX gaps"]
        C6["Polishes to production quality"]
        C1 --> C2 --> C3 --> C4 --> C5 --> C6
    end
    subgraph "Layer 3 — opencode-mcp (this project)"
        M["12 MCP tools • Zod validation • Singleton client"]
    end
    subgraph "Layer 4 — OpenCode Server"
        O["Session management • File read/write/edit • Shell commands"]
    end
    subgraph "Layer 5 — Inference"
        I["Cerebras • gpt-oss-120b • zai-glm-4.7 • Any provider"]
    end
    U --> C1
    C6 -.->|"deliver"| U
    C2 -->|"MCP stdio"| M
    C3 -->|"MCP stdio"| M
    C4 -->|"MCP stdio"| M
    M -->|"HTTP :4096"| O
    O -->|"API"| I
    style U fill:#f8f9fa,color:#333,stroke:#ddd
    style M fill:#00CEC9,color:#fff,stroke:none
    style O fill:#00B894,color:#fff,stroke:none
    style I fill:#FDCB6E,color:#333,stroke:none
```

### Session Lifecycle

Sessions are the core concept — a persistent conversation with the coding agent that retains context across prompts:

```mermaid
graph TD
    A["opencode_session create"] -->|"returns session ID"| B["opencode_session prompt"]
    B -->|"agent generates code"| C["Files change on disk"]
    C --> D{"Review the code"}
    D -->|"Good"| E["Send next prompt<br/>(agent remembers context)"]
    D -->|"Bad"| F["opencode_session revert"]
    F --> G["Send improved prompt"]
    E --> B
    G --> B
    style A fill:#6C5CE7,color:#fff,stroke:none
    style D fill:#FDCB6E,color:#333,stroke:none
    style E fill:#00B894,color:#fff,stroke:none
    style F fill:#E17055,color:#fff,stroke:none
```

If you say "make the header blue" in prompt #3, the agent remembers what header you're talking about from prompt #1. This makes iteration fast — you don't re-explain context each time.

### Dynamic Model Switching

Change models per-prompt without touching config:

```
// Default model (from opencode.json)
opencode_session prompt → uses gpt-oss-120b

// Override for this prompt only
opencode_session prompt model="zai-glm-4.7" provider="cerebras"

// Try a different model
opencode_session prompt model="llama3.1-8b" provider="cerebras"
```

Claude picks the right model for each task — fast model for boilerplate, reasoning model for complex logic.

---

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- A provider API key (e.g., [Cerebras](https://cloud.cerebras.ai))

### Install

```bash
git clone https://github.com/nkulavic/opencode-mcp.git
cd opencode-mcp
cp .env.example .env   # Add your API key
npm run setup          # Installs deps, builds, verifies, configures MCP + skills
```

```mermaid
graph LR
    A["npm run setup"] --> B["npm install<br/>(+ OpenCode CLI)"]
    B --> C["tsc build"]
    C --> D["Environment check"]
    D --> E["Configure skills<br/>+ MCP server"]
    style A fill:#6C5CE7,color:#fff,stroke:none
    style E fill:#00CEC9,color:#fff,stroke:none
```

The setup script handles everything in one step:

1. **Installs dependencies** — downloads the OpenCode CLI binary for your platform via `opencode-ai`
2. **Builds the project** — compiles TypeScript to `dist/`
3. **Runs environment check** — verifies OpenCode CLI, `.env`, and build output
4. **Configures Claude Code** — prompts you to install the MCP server config + skills

You'll be asked where to install:

```
  Where would you like to install?

  1. Global (~/.claude/ — available in all projects)
  2. This project only (.mcp.json + .claude/skills/)
  3. Both
  4. Cancel
```

After setup completes, **restart Claude Code** to pick up the new MCP server.

> **Already have OpenCode installed globally?** That works too. `start.sh` checks `node_modules/.bin/opencode` first, then falls back to your global install.

### Verify It Works

After restarting Claude Code, try:

```
You: "Use opencode to create a hello world HTML file at examples/test/index.html"

Claude will:
1. Call opencode_session create → gets session ID
2. Call opencode_session prompt → sends task to Cerebras
3. Review the generated file
4. Report back
```

If Claude doesn't recognize `opencode_session`, the MCP server isn't connected. See [Managing the MCP Server](#managing-the-mcp-server) below.

---

## Managing the MCP Server

The setup script configures the MCP server automatically, but you can also add, remove, or move the config manually.

### How the MCP Config Works

Claude Code discovers MCP servers from two config files. The setup script writes to one or both depending on your choice:

```mermaid
graph TD
    CC["Claude Code starts"] --> G{"Check global config"}
    CC --> L{"Check project config"}
    G -->|"~/.claude/settings.json"| GF["mcpServers.opencode"]
    L -->|".mcp.json in repo root"| LF["mcpServers.opencode"]
    GF --> S["start.sh"]
    LF --> S
    S --> OC["OpenCode serve<br/>(port 4096)"]
    S --> MCP["MCP server<br/>(stdio to Claude Code)"]
    OC --> I["Cerebras / any provider"]
    style CC fill:#6C5CE7,color:#fff,stroke:none
    style S fill:#00CEC9,color:#fff,stroke:none
    style MCP fill:#00B894,color:#fff,stroke:none
    style I fill:#FDCB6E,color:#333,stroke:none
```

| Install type | Config file | Scope |
|---|---|---|
| **Global** | `~/.claude/settings.json` | Every Claude Code session on your machine |
| **Project** | `.mcp.json` (repo root) | Only when working in this repo |

Both files use the same format — a JSON object with `mcpServers.opencode.command` pointing to the absolute path of `start.sh`.

### Add Manually

If you skipped the setup prompt, or want to add the MCP server to a different location:

**Global** — edit `~/.claude/settings.json` and add the `mcpServers` key (keep your existing settings):

```json
{
  "permissions": { ... },
  "mcpServers": {
    "opencode": {
      "command": "/absolute/path/to/opencode-mcp/start.sh"
    }
  }
}
```

**Project** — create or edit `.mcp.json` in your repo root:

```json
{
  "mcpServers": {
    "opencode": {
      "command": "/absolute/path/to/opencode-mcp/start.sh"
    }
  }
}
```

> **Important:** The `command` must be an absolute path to `start.sh`. Relative paths won't work because Claude Code doesn't resolve them from the MCP project directory.

Restart Claude Code after editing either file.

### Remove the MCP Server

To disconnect OpenCode from Claude Code, remove the `opencode` entry from whichever config file has it:

**Global** — edit `~/.claude/settings.json` and delete the `"opencode": { ... }` block from `mcpServers`. If `opencode` was the only MCP server, you can delete the entire `mcpServers` key.

**Project** — delete `.mcp.json`, or edit it to remove the `opencode` entry.

```mermaid
graph LR
    R["Want to remove?"] --> RG["Global: edit ~/.claude/settings.json"]
    R --> RL["Project: delete .mcp.json"]
    RG --> D1["Delete mcpServers.opencode"]
    RL --> D2["Or edit out the opencode entry"]
    D1 --> RS["Restart Claude Code"]
    D2 --> RS
    style R fill:#E17055,color:#fff,stroke:none
    style RS fill:#00B894,color:#fff,stroke:none
```

Restart Claude Code after removing.

### Move Between Global and Project

To move from global to project-only (or vice versa), run the setup script again:

```bash
npm run install-skills
```

It will detect the existing config and ask whether to overwrite. Choose your new target, then manually remove the old config from the other location.

### Troubleshooting

```mermaid
graph TD
    P["MCP not working?"] --> C1{"opencode_session<br/>recognized?"}
    C1 -->|"No"| F1["Config not loaded"]
    C1 -->|"Yes but errors"| C2{"Server starts?"}
    F1 --> FIX1["Check config file exists<br/>and path to start.sh is correct"]
    FIX1 --> FIX1a["Restart Claude Code"]
    C2 -->|"No"| F2["OpenCode CLI missing<br/>or not built"]
    C2 -->|"Yes"| F3["API key or provider issue"]
    F2 --> FIX2["Run: npm run setup"]
    F3 --> FIX3["Check .env has your API key"]
    style P fill:#E17055,color:#fff,stroke:none
    style FIX1a fill:#00B894,color:#fff,stroke:none
    style FIX2 fill:#00B894,color:#fff,stroke:none
    style FIX3 fill:#00B894,color:#fff,stroke:none
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| Claude doesn't recognize `opencode_session` | MCP config not loaded | Check config file, restart Claude Code |
| `start.sh` errors on launch | Project not built | `npm run build` |
| `opencode not found` in start.sh | CLI not installed | `npm install` in the project directory |
| Session creates but prompts fail | API key missing or invalid | Check `.env` and provider credentials |
| Port 4096 already in use | Another OpenCode instance running | Kill it or set `OPENCODE_PORT` to a different port |

### How `start.sh` Works

`start.sh` is the entry point Claude Code calls. It handles the full server lifecycle automatically:

```mermaid
graph TD
    A["Claude Code calls start.sh"] --> B{"opencode binary<br/>found?"}
    B -->|"node_modules/.bin"| C["Use local"]
    B -->|"global PATH"| C
    B -->|"not found"| X["Error: install instructions"]
    C --> D{"opencode serve<br/>already running<br/>on port 4096?"}
    D -->|"yes"| F["Launch MCP server"]
    D -->|"no"| E["Start opencode serve<br/>in background"]
    E --> G["Wait for ready<br/>(up to 10s)"]
    G --> F
    F --> H["stdio transport<br/>to Claude Code"]
    style X fill:#E17055,color:#fff,stroke:none
    style H fill:#00B894,color:#fff,stroke:none
```

You don't need to start any servers manually. `start.sh` boots the OpenCode server on demand and connects the MCP bridge — all triggered automatically when Claude Code starts.

---

## Claude Code Skills

The project includes two optional skills (slash commands) that teach Claude how to use the MCP tools effectively.

Skills are installed alongside the MCP config during `npm run setup`, or anytime with:

```bash
npm run install-skills
```

### `/opencode` — Delegation Guidance

An always-on advisor that helps Claude decide when to delegate vs write directly.

```mermaid
graph TD
    A["Claude is about to<br/>write code"] --> B{"How much code?"}
    B -->|"> 30 lines"| C["Delegate to OpenCode"]
    B -->|"< 30 lines"| D["Write directly"]
    C --> E["Create/reuse session"]
    E --> F["Write specific prompt"]
    F --> G["Send to fast model"]
    G --> H["Review output"]
    H --> I{"Quality?"}
    I -->|"Good"| J["Accept & continue"]
    I -->|"Bad"| K["Revert & re-prompt"]
    D --> L["Use Edit/Write tool"]
    style C fill:#00CEC9,color:#fff,stroke:none
    style D fill:#6C5CE7,color:#fff,stroke:none
    style J fill:#00B894,color:#fff,stroke:none
    style K fill:#E17055,color:#fff,stroke:none
```

**What it provides:**
- **Decision heuristic** — delegate for new files, boilerplate, tests, scaffolding. Write directly for small edits, config, security-critical code.
- **Prompt engineering** — how to write specific prompts that produce good output from fast models.
- **Review checklist** — what bugs to look for: operator precedence, XSS, missing accessibility, timezone issues.
- **Session management** — reuse sessions, fork for alternatives, summarize long sessions.

### `/opencode-build` — Team Build Pipeline

Runs the full "fast draft + Claude polish" workflow end to end. Just describe what you want.

```mermaid
graph TD
    A["User: 'Build me a<br/>weather dashboard'"] --> B["Phase 1: SPEC<br/>Claude writes detailed spec"]
    B --> C["Phase 2: DRAFT<br/>OpenCode generates in ~2s"]
    C --> D["Phase 3: REVIEW<br/>Claude reads every line"]
    D --> E{"Bugs found?"}
    E -->|"Always yes"| F["Operator precedence<br/>XSS vulnerabilities<br/>Missing accessibility<br/>Rough visual design"]
    F --> G["Phase 4: POLISH<br/>Claude rewrites to<br/>production quality"]
    G --> H["Deliver finished product"]
    style A fill:#f8f9fa,color:#333,stroke:#ddd
    style C fill:#FDCB6E,color:#333,stroke:none
    style D fill:#6C5CE7,color:#fff,stroke:none
    style G fill:#00B894,color:#fff,stroke:none
    style H fill:#00CEC9,color:#fff,stroke:none
```

**The pipeline:**
1. **Spec** — Claude writes a detailed specification from your description
2. **Draft** — Sends to gpt-oss-120b on Cerebras (~2s generation, 300-500 lines)
3. **Review** — Claude reads every line, identifies bugs, security issues, UX gaps
4. **Polish** — Claude rewrites with animations, accessibility, responsive design, micro-interactions

---

## Tools Reference

12 tools covering the full OpenCode SDK (~62 methods across 12 namespaces).

```mermaid
graph LR
    subgraph "Core Workflow"
        S["opencode_session<br/>22 actions"]
        MSG["opencode_message"]
        F["opencode_file"]
        FIND["opencode_find"]
    end
    subgraph "Config & Auth"
        P["opencode_project"]
        CFG["opencode_config"]
        AUTH["opencode_auth"]
        PROV["opencode_provider"]
    end
    subgraph "Advanced"
        T["opencode_tool"]
        MCP["opencode_mcp_server"]
        PTY["opencode_pty"]
        INS["opencode_instructions"]
    end
    style S fill:#6C5CE7,color:#fff,stroke:none
```

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

The `opencode_session` tool has 22 actions:

| Action | Purpose |
|--------|---------|
| `create` | Start a new session. Returns a session ID. |
| `prompt` | Send a coding task. The agent generates code. Accepts `model` + `provider` for dynamic switching. |
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

---

## Workflows

### Basic: Delegate and Review

```mermaid
sequenceDiagram
    participant You
    participant Claude
    participant OpenCode
    participant Cerebras

    You->>Claude: "Create a REST API for users"
    Claude->>OpenCode: session.create()
    OpenCode-->>Claude: session ID
    Claude->>OpenCode: session.prompt("Create REST API at src/api/users.ts...")
    OpenCode->>Cerebras: Generate code
    Cerebras-->>OpenCode: 200 lines in ~2s
    OpenCode-->>Claude: Done
    Claude->>Claude: Read & review generated code
    Claude-->>You: "Here's what was generated, I found 2 issues and fixed them"
```

### Team: Fast Draft + Claude Polish

The most powerful pattern — used by the `/opencode-build` skill:

```mermaid
sequenceDiagram
    participant You
    participant Claude
    participant OpenCode
    participant Cerebras

    You->>Claude: "Build me a finance dashboard"
    Note over Claude: Phase 1: Write detailed spec
    Claude->>OpenCode: session.create()
    OpenCode-->>Claude: session ID

    Note over Claude,Cerebras: Phase 2: Fast draft (~2s)
    Claude->>OpenCode: session.prompt(spec, model="gpt-oss-120b")
    OpenCode->>Cerebras: Generate
    Cerebras-->>OpenCode: 308 lines, 2 seconds
    OpenCode-->>Claude: Done

    Note over Claude: Phase 3: Deep review
    Claude->>Claude: Read every line
    Note over Claude: Found: 9 bugs, XSS vuln,<br/>no keyboard nav, rough UX

    Note over Claude: Phase 4: Polish & rewrite
    Claude->>Claude: Rewrite with production UX
    Note over Claude: 1,684 lines, glassmorphism,<br/>animations, accessibility

    Claude-->>You: "Done! 2s draft → found 9 bugs → polished to production quality"
```

### Parallel: Multiple Models

```mermaid
graph LR
    A["Same spec"] --> B["Session A<br/>gpt-oss-120b"]
    A --> C["Session B<br/>zai-glm-4.7"]
    A --> D["Session C<br/>Claude direct"]
    B --> E["Compare"]
    C --> E
    D --> E
    E --> F["Pick best,<br/>iterate"]
    style B fill:#FDCB6E,color:#333,stroke:none
    style C fill:#00CEC9,color:#fff,stroke:none
    style D fill:#6C5CE7,color:#fff,stroke:none
```

### Iterative: Rapid Refinement

Each prompt builds on session context — the agent remembers everything:

```mermaid
graph LR
    A["Generate v1<br/>(2s)"] --> B["'Wider toolbar<br/>with icons' (1.5s)"]
    B --> C["'Gradient header,<br/>pill toggle' (1.8s)"]
    C --> D["'Fix dark mode<br/>chart colors' (1.2s)"]
    style A fill:#E17055,color:#fff,stroke:none
    style B fill:#FDCB6E,color:#333,stroke:none
    style C fill:#00CEC9,color:#fff,stroke:none
    style D fill:#00B894,color:#fff,stroke:none
```

---

## Examples

The `examples/` directory contains apps built during development. Each is a single HTML file — open directly in a browser.

### How Each Example Was Built

```mermaid
graph TD
    subgraph "Direct Comparisons"
        K1["kanban-opencode"] ---|"vs"| K2["kanban-direct"]
        D1["drawing-gpt-oss"] ---|"vs"| D3["drawing-claude"]
        D2["drawing-glm"] ---|"vs"| D3
    end
    subgraph "Team Workflow (draft → polish)"
        F1["finance-dashboard<br/>gpt-oss-120b → Claude"]
        F2["finance-dashboard-glm<br/>zai-glm-4.7 → Claude"]
        S1["spreadsheet<br/>gpt-oss-120b → Claude"]
    end
    subgraph "Single Model"
        T1["todo-app<br/>gpt-oss-120b"]
    end
    style K1 fill:#FDCB6E,color:#333,stroke:none
    style K2 fill:#6C5CE7,color:#fff,stroke:none
    style D1 fill:#FDCB6E,color:#333,stroke:none
    style D2 fill:#00CEC9,color:#fff,stroke:none
    style D3 fill:#6C5CE7,color:#fff,stroke:none
    style F1 fill:#00B894,color:#fff,stroke:none
    style F2 fill:#00B894,color:#fff,stroke:none
    style S1 fill:#00B894,color:#fff,stroke:none
```

| Example | Build Method | Draft Time | Final Lines |
|---------|-------------|------------|-------------|
| `finance-dashboard/` | Team: gpt-oss-120b → Claude polish | ~2s | 1,684 |
| `finance-dashboard-glm/` | Team: zai-glm-4.7 → Claude polish | ~2.5s | 1,318 |
| `spreadsheet/` | Team: gpt-oss-120b → Claude review | ~2s | 544 |
| `kanban-opencode/` | OpenCode (gpt-oss-120b) | ~2s | — |
| `kanban-direct/` | Claude directly | ~5min | — |
| `drawing-gpt-oss/` | OpenCode (gpt-oss-120b), restyled | ~1.4s | — |
| `drawing-glm/` | OpenCode (zai-glm-4.7), restyled | ~2.3s | — |
| `drawing-claude/` | Claude directly | ~7.5min | — |
| `todo-app/` | OpenCode (gpt-oss-120b) | ~2s | — |

---

## Configuration

### `opencode.json`

Controls the default model and provider:

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
      "tools": { "read": true, "write": true, "edit": true, "bash": true }
    }
  }
}
```

You can define multiple agents with different models and select them per-prompt with the `agent` parameter.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CEREBRAS_API_KEY` | Cerebras API key | *(required)* |
| `OPENCODE_HOST` | OpenCode server bind address | `127.0.0.1` |
| `OPENCODE_PORT` | OpenCode server port | `4096` |

### Using Other Providers

OpenCode supports multiple providers. To use a different one, add the provider to `opencode.json`, set the API key in `.env`, and either change the default model or use dynamic switching per-prompt.

---

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
├── skills/
│   ├── opencode/SKILL.md     # /opencode — delegation guidance
│   └── opencode-build/SKILL.md  # /opencode-build — team build pipeline
├── scripts/
│   ├── postinstall.mjs       # Post-install environment check (inc. MCP config)
│   └── install-skills.mjs    # Unified setup: skills + MCP server config
├── examples/                  # Demo apps (open index.html in browser)
├── start.sh                   # Startup script (manages opencode serve)
├── opencode.json              # Default model/provider config
├── package.json
├── tsconfig.json
└── .env.example
```

Every tool file follows the same pattern:

```mermaid
graph LR
    A["Import McpServer,<br/>z, getClient"] --> B["Export<br/>registerXTool()"]
    B --> C["Zod schema<br/>with action enum"]
    C --> D["Switch on action"]
    D --> E["Call SDK,<br/>return JSON"]
    D --> F["Catch errors<br/>with isError: true"]
    style A fill:#f8f9fa,color:#333,stroke:#ddd
    style C fill:#00CEC9,color:#fff,stroke:none
    style E fill:#00B894,color:#fff,stroke:none
    style F fill:#E17055,color:#fff,stroke:none
```

---

## Development

```bash
npm run dev            # Watch mode — recompiles on save
npm run build          # One-time build
npm start              # Run MCP server (needs opencode serve running)
./start.sh             # Run both opencode serve + MCP server
npm run install-skills # Configure MCP server + install skills for Claude Code
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on adding tools, extending SDK coverage, and submitting examples.

## License

[MIT](LICENSE)
