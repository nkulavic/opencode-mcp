---
name: opencode-build
description: "Build polished, production-quality apps using a team of AI agents — fast model drafts the code in seconds, Claude reviews and polishes it. Use this skill when the user wants to build something substantial: 'build me a dashboard', 'create an app', 'make a landing page', 'build a tool', 'create a component'. Also triggers on '/opencode-build' or when the user says 'use the team workflow', 'have opencode build it', or 'fast draft then polish'. This runs the full pipeline: generate → review → identify bugs → polish to production quality. The result is Claude-quality code at near-instant speed."
---

# OpenCode Build: Team Workflow

This skill runs a two-agent pipeline: a fast model (gpt-oss-120b on Cerebras) generates a working draft in ~2 seconds, then you (Claude) review it for bugs and polish it to production quality.

The user describes what they want. You handle the entire pipeline.

## The Pipeline

```
User describes what they want
    │
    ▼
Phase 1: SPEC — You write a detailed specification
    │
    ▼
Phase 2: DRAFT — OpenCode generates code in ~2 seconds
    │
    ▼
Phase 3: REVIEW — You read the code, identify every bug
    │
    ▼
Phase 4: POLISH — You rewrite it to production quality
    │
    ▼
Deliver the finished product
```

### Phase 1: Write the Spec

Before sending anything to OpenCode, write a detailed spec. The quality of the draft depends entirely on this. Include:

- **What to build** — the complete feature set, not vague descriptions
- **File path** — exact output location (e.g., `examples/my-app/index.html`)
- **Technical constraints** — single-file HTML, or React components, or Node.js API, etc.
- **Data requirements** — sample data to pre-populate, schemas, mock APIs
- **UI details** — layout structure, color scheme, responsive breakpoints
- **Interactions** — what happens on click, hover, submit, keyboard shortcuts

Example spec:
```
Create a single-file HTML/CSS/JS app at examples/finance-dashboard/index.html

Features:
- Monthly budget overview with circular SVG progress rings for 5 categories:
  Food ($500), Transport ($300), Entertainment ($200), Bills ($600), Shopping ($400)
- Transaction list with Add/Edit/Delete via modal form (date, category, description, amount)
- 7-day spending line chart using pure SVG (no libraries)
- Category breakdown horizontal bar chart
- Dark mode toggle persisted to localStorage
- All transactions saved to localStorage
- Responsive CSS Grid layout (3-col desktop, 2-col tablet, 1-col mobile)
- Pre-populate with 15-20 sample transactions across all categories
- Use CSS custom properties for theming
- Include viewport meta tag
```

### Phase 2: Send to OpenCode

Create a session and send the spec:

```
opencode_session action="create"
opencode_session action="prompt" id="<session-id>" model="gpt-oss-120b" provider="cerebras" content="<your spec>"
```

This typically completes in 1-3 seconds and generates 300-500 lines of working code.

### Phase 3: Review the Draft

Read the entire generated file. Do not skim. Look for these categories of issues:

**Bugs (always present in fast-model output):**
- Operator precedence: `!x === 'y'` (always false) vs `x !== 'y'`
- Missing parentheses in reduce/map: `a + Number(b) || 0` vs `a + (Number(b) || 0)`
- Function hoisting issues: function used before defined (with `const`, not `function`)
- Template literal injection / XSS via innerHTML with user content
- Date timezone bugs: `new Date('2026-03-01')` parses as UTC, can shift days
- Missing null checks on DOM queries
- Event listeners on elements that don't exist yet

**Security:**
- innerHTML with user-supplied strings (use textContent or escape)
- Unsafe dynamic code execution with user-controllable input
- localStorage key collisions (use namespaced keys)
- Missing input validation on forms

**UX gaps (always present):**
- No keyboard navigation (arrow keys, Tab, Escape)
- No empty states
- Hardcoded colors that break in dark mode
- No loading states or error states
- Missing hover/focus states
- Not responsive or poorly responsive
- No animations or transitions (feels static)

**Code quality:**
- Minified or cramped CSS (hard to maintain)
- Redundant code paths
- Missing error handling around JSON.parse, fetch, etc.

Compile a complete list of everything you find. This is the most important phase — it's where Claude's reasoning ability earns its keep.

### Phase 4: Polish

You have two options for fixing the issues:

**Option A: Send fix prompts to OpenCode** (fast, good for targeted fixes)
```
opencode_session action="prompt" id="<session-id>" content="Fix these bugs in <file>:
1. Line 297: operator precedence bug, change !x==='bold' to x!=='bold'
2. Line 193: SUM reduce precedence, wrap Number(b)||0 in parens
3. Add keyboard navigation: arrow keys, Tab/Shift+Tab, Enter
..."
```

**Option B: Rewrite the file yourself** (slower, but higher quality for UX polish)

Use the Write tool to rewrite the entire file with production-quality UX:
- CSS custom properties for theming
- Inter or system font stack with proper hierarchy
- Smooth transitions (0.2s ease) on all interactive elements
- Animated elements on load (staggered fade-in, progress ring animation)
- Glassmorphism or modern card design
- Responsive grid with proper breakpoints
- Micro-interactions (hover lift, press scale, focus ring)
- Proper accessibility (keyboard nav, ARIA, focus management)

**Recommended approach:** Option A for bug fixes, Option B for full UX polish. The fast model can fix logic bugs in seconds, but visual design polish benefits from Claude's judgment.

### Deliver

After polishing, tell the user:
- What was built
- How long the draft took (typically ~2s)
- What bugs you found and fixed (be specific — this demonstrates the value of the review step)
- How to run/view it (e.g., "open index.html in a browser")

If appropriate, open the result in the browser:
```bash
open <path-to-file>
```

## Choosing the Right Model

For the draft phase:
- **gpt-oss-120b** — Default. Fast, generates working code reliably. Best for UI, web apps, standard patterns.
- **zai-glm-4.7** — More verbose output, sometimes better architecture. Good for complex backends or multi-component systems.

For the polish phase:
- Always Claude (you). The whole point is that you bring quality the fast models can't.

## When This Skill Applies

Use this pipeline when:
- The user asks to "build", "create", "make", or "generate" something substantial
- The output will be more than ~50 lines of code
- The task is well-defined enough to write a spec
- Quality matters (not a throwaway script)

Don't use this pipeline when:
- The user wants a small edit or fix
- The task requires deep architectural reasoning before any code is written
- The user explicitly wants you to write it directly
