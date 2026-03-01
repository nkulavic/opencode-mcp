# Approach: Change Button Color from Blue to Green

## Decision: Write Directly (Do NOT Delegate to OpenCode)

### Why Not Delegate

The skill document is explicit on this point:

> Write directly when: Small edits (a few lines), config changes, ... fixing a specific bug, anything needing nuanced understanding of full context

> Don't try to use OpenCode for tiny edits. It's faster to use the Edit tool for 1-3 line changes.

This task is a single-line change — swapping a color class or value on line 45 of one file. Delegating to OpenCode would introduce unnecessary overhead (session creation, message passing, waiting for a response) for something that takes seconds to do directly with the Edit tool.

---

## Exact Sequence of Tool Calls

### Step 1: Read the file to understand context

Use the Read tool to inspect the relevant section of the file:

```
Read(
  file_path: "/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx",
  offset: 40,
  limit: 15
)
```

This lets me see line 45 and a few lines around it to understand:
- Whether the color is expressed as a Tailwind class (e.g., `bg-blue-500`), an inline style (`backgroundColor: 'blue'`), a CSS variable, or a named constant.
- The exact string I need to replace.

### Step 2: Make the targeted edit

Using the Edit tool with the exact old and new strings identified in Step 1. For example, if the button uses Tailwind classes:

```
Edit(
  file_path: "/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx",
  old_string: "bg-blue-500",   // or whatever blue variant is on line 45
  new_string: "bg-green-500"
)
```

Or if it uses an inline style:

```
Edit(
  file_path: "/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx",
  old_string: "backgroundColor: 'blue'",
  new_string: "backgroundColor: 'green'"
)
```

The `old_string` must be unique in the file (or sufficiently surrounded by context) to ensure only the intended line is changed.

---

## Special Considerations

- **Verify uniqueness**: If the color string (e.g., `bg-blue-500`) appears multiple times in the file, I would include more surrounding context in `old_string` to target only line 45 precisely.
- **Color shade matching**: "Blue to green" is intentionally vague. I would preserve the same shade/intensity — if the original is `blue-600`, the replacement would be `green-600`, not an arbitrary green.
- **No rebuild or test run needed for the plan**: This is purely a visual/styling change, but in a real workflow I would note that the developer should verify the rendered result in a browser.
- **Total tool calls**: 2 (Read + Edit). No OpenCode session, no delegation overhead.
