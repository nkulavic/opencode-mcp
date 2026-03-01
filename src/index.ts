import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSessionTool } from "./tools/session.js";
import { registerMessageTool } from "./tools/message.js";
import { registerFileTool } from "./tools/file.js";
import { registerFindTool } from "./tools/find.js";
import { registerProjectTool } from "./tools/project.js";
import { registerConfigTool } from "./tools/config.js";
import { registerAuthTool } from "./tools/auth.js";

const server = new McpServer(
  {
    name: "opencode-mcp",
    version: "0.1.0",
  },
  {
    instructions: `# OpenCode MCP — AI Coding Agent

You have access to a fast coding agent through OpenCode. The model and provider are configured in the project's opencode.json — this MCP is model-agnostic. Use it to delegate code generation tasks while you focus on planning, reviewing, and orchestrating.

## Architecture
- YOU (Claude) = orchestrator + code reviewer. You plan, break down tasks, and review all code.
- OpenCode = fast code generator. It has full repo access (read/write/edit/bash) and runs whatever model is configured.
- NO CODE SHIPS WITHOUT YOUR REVIEW. Always check what OpenCode wrote before moving on.

## Workflow

### 1. Create a session (do this once per task)
Call opencode_session with action "create". Save the session ID — you'll reuse it for all subsequent calls so the agent retains context.

### 2. Send a task
Call opencode_session with action "prompt", passing the session ID and a clear, specific instruction. Be explicit about:
- Which files to create or modify (full paths)
- What the code should do
- Any constraints or patterns to follow
- The project's language, framework, and conventions

### 3. Review the output
After the agent completes:
- Call opencode_file with action "status" to see what files changed
- Call opencode_message with action "list" to read what the agent did and why
- Read the changed files yourself to review the code quality

### 4. Accept or reject
- If the code is GOOD: move on to the next task (keep using the same session)
- If the code is BAD: call opencode_session with action "revert" to undo changes, then call opencode_session with action "prompt" with feedback explaining what to fix. The agent retains session context so it knows what you're referring to.

### 5. Iterate
Repeat steps 2-4 until the task is complete. The agent remembers everything within the session.

## Best Practices
- ALWAYS create a session before prompting. Never prompt without a session ID.
- REUSE sessions for related work. The agent builds context over time.
- BE SPECIFIC in prompts. "Add auth" is bad. "Create JWT middleware in src/middleware/auth.ts that validates Bearer tokens from the Authorization header" is good.
- REVIEW EVERY CHANGE. You are the quality gate. The agent is fast but not infallible.
- USE REVERT freely. It's cheap and clean — better to revert and re-prompt than to manually fix bad code.
- USE session_summarize to get a summary of what the agent has done so far in a long session.
- USE session_abort if a prompt is taking too long or going in the wrong direction.

## When to Use OpenCode vs. Doing It Yourself
USE OPENCODE FOR: Boilerplate, repetitive code, initial implementations, file creation, test writing, refactoring
DO IT YOURSELF FOR: Small edits, config changes, architectural decisions, anything requiring deep judgment`,
  },
);

registerSessionTool(server);
registerMessageTool(server);
registerFileTool(server);
registerFindTool(server);
registerProjectTool(server);
registerConfigTool(server);
registerAuthTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
