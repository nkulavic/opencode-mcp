---
name: opencode
description: "Delegate code generation to fast AI models via OpenCode MCP. Use this skill whenever you're about to write substantial code (more than ~30 lines), generate boilerplate, create new files, write tests, or scaffold features. Also use it when the user says 'use opencode', 'delegate this', 'have opencode do it', or mentions fast code generation. This skill teaches you when and how to delegate vs write directly, how to manage sessions, and how to review generated code. If the opencode MCP tools are available (opencode_session, opencode_file, etc.), this skill almost certainly applies to any code generation task."
---

# OpenCode Delegation

You have access to a fast coding agent through the OpenCode MCP tools. It runs models at 2,000+ tokens/sec on Cerebras — code that takes you minutes to write, it generates in seconds. Your job is to use it as your fast hands while you stay the brain.

## When to Delegate vs Write Directly

This is the core judgment call. Here's the heuristic:

**Delegate to OpenCode when:**
- Creating new files (components, endpoints, pages, tests)
- Writing boilerplate or repetitive code
- Generating initial implementations you'll review
- Building UI components, forms, layouts
- Writing test suites
- Scaffolding features across multiple files
- Any task where the output is more than ~30 lines of code

**Write directly when:**
- Small edits (a few lines)
- Config changes
- Architectural decisions that need careful reasoning
- Security-critical code that needs deep judgment
- Fixing a specific bug where you already know the fix
- Anything that needs nuanced understanding of the full context

When in doubt, delegate. It's faster to review generated code than to write it from scratch, and you can always revert.

## How to Delegate

### Step 1: Create a session (once per task)

```
opencode_session action="create"
```

Save the session ID. Reuse it for all related work — the agent builds context over time.

### Step 2: Write a specific prompt

The quality of the output depends entirely on how specific your prompt is. Compare:

**Bad:** "Add user authentication"
**Good:** "Create JWT middleware at src/middleware/auth.ts that: validates Bearer tokens from the Authorization header, extracts the user ID from the payload, attaches it to req.user, returns 401 for missing/invalid tokens. Use jsonwebtoken library. Follow the existing middleware pattern in src/middleware/cors.ts."

Include:
- Exact file paths to create or modify
- What the code should do (behavior, not implementation)
- Constraints: language, framework, patterns to follow
- Reference files the agent should look at for conventions

### Step 3: Send the prompt

```
opencode_session action="prompt" id="<session-id>" content="<your detailed prompt>"
```

You can switch models per-prompt:
```
opencode_session action="prompt" id="<session-id>" model="gpt-oss-120b" provider="cerebras" content="..."
```

### Step 4: Review the output

After the agent completes, always review:

1. **Check what changed:** `opencode_file action="status"` shows modified files
2. **Read the code:** Use the Read tool on the generated files — actually read them
3. **Look for common issues:**
   - Operator precedence bugs (e.g., `!x === 'y'` instead of `x !== 'y'`)
   - XSS via innerHTML with user input
   - Missing error handling at system boundaries
   - Hardcoded values that should be configurable
   - Missing accessibility (keyboard navigation, ARIA labels)
   - Timezone bugs in date handling

### Step 5: Accept or fix

- **Code is good:** Move on. Use the same session for the next task.
- **Code has issues:** Either:
  - Send a fix prompt: `opencode_session action="prompt" content="Fix: the toggle logic has an operator precedence bug on line 297..."`
  - Revert and re-prompt: `opencode_session action="revert"` then send an improved prompt
  - Fix it yourself with the Edit tool if it's a small change

### Step 6: Iterate

The agent remembers everything within the session. You can say "make the header blue" without re-explaining which header. This makes iteration fast — generate, review, fix, repeat.

## Session Management

- **One session per task.** Don't create a new session for each prompt.
- **Reuse sessions** for related work. Context accumulates.
- **Fork sessions** to try alternative approaches: `opencode_session action="fork" id="<id>" messageId="<msg-id>"`
- **Summarize** long sessions: `opencode_session action="summarize" id="<id>"`
- **Abort** stuck prompts: `opencode_session action="abort" id="<id>"`

## Model Selection

Different models have different strengths. When using the `model` and `provider` params:

- **gpt-oss-120b** (default): Fast, good for most code generation tasks. Best for initial drafts, boilerplate, UI components.
- **zai-glm-4.7**: Reasoning-focused. Better for complex logic, algorithms, multi-step implementations.

Pick the right model for the task, or just use the default and iterate.

## What Not to Do

- Don't send vague prompts. "Make it better" wastes a round trip. Be specific about what to change.
- Don't skip review. Fast models make subtle mistakes — operator precedence, missing edge cases, security issues. You are the quality gate.
- Don't create a new session for every prompt. Reuse sessions so the agent retains context.
- Don't try to use OpenCode for tiny edits. It's faster to use the Edit tool for 1-3 line changes.
