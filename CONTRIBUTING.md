# Contributing to opencode-mcp

Thanks for your interest in contributing! This project bridges AI coding agents to Claude Code via MCP, and we welcome improvements.

## Getting Started

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Install [OpenCode](https://opencode.ai): `brew install opencode-ai/tap/opencode`
4. Copy `.env.example` to `.env` and add your provider API key
5. Build: `npm run build`
6. Run: `./start.sh`

## Development

```bash
npm run dev    # Watch mode — recompiles on save
npm run build  # One-time build
npm start      # Run the MCP server (requires opencode serve running)
```

### Adding a New Tool

1. Create `src/tools/your-tool.ts` following the pattern in existing tool files
2. Export a `registerYourTool(server: McpServer)` function
3. Import and register it in `src/index.ts`
4. Update the instructions string in `src/index.ts` to document it
5. Build and test

Every tool follows the same pattern:
- Single tool name with an `action` enum for multiple operations
- Zod schema for parameter validation
- Switch on action, try/catch with `isError: true` on failure
- Return `{ content: [{ type: "text", text: JSON.stringify(result) }] }`

### Adding Examples

Put example apps in `examples/<name>/index.html`. Single-file HTML apps work best for demos.

## Pull Requests

- Keep PRs focused on a single change
- Ensure `npm run build` passes with zero errors
- Test your changes against a running OpenCode server
- Update the instructions in `src/index.ts` if you add or modify tools

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OpenCode version (`opencode --version`)
