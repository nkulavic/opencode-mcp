# Approach: Change Button Color from Blue to Green

## Decision: Write Directly (No OpenCode Delegation)

For this task, I would NOT delegate to OpenCode. I would handle it directly using the standard Read and Edit tools.

### Reasoning

This is an extremely simple, surgical code change:
- The target location is precisely specified (line 45 of a known file)
- The change is trivial: swap one color value (blue -> green)
- No code generation is needed — this is pure find-and-replace
- Delegating to OpenCode would introduce unnecessary latency and overhead for a one-line edit
- The standard Edit tool is purpose-built for exactly this kind of targeted modification

OpenCode delegation is appropriate when:
- Generating substantial new code
- Implementing complex logic
- Making changes that require understanding large context across many files

None of those conditions apply here.

---

## Exact Sequence of Tool Calls

### Step 1: Read the file to understand the current state

```
Read(file_path="/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx")
```

Why: I need to see the actual content at line 45 to know the exact string to replace. The task says "blue" but the code might use a Tailwind class like `bg-blue-500`, a CSS variable, a hex value like `#0000ff`, or a named color string like `"blue"`. I must read it first before editing to ensure the old_string in my Edit call is accurate and unique.

### Step 2: Edit the file with a targeted replacement

After reading and confirming the exact text on line 45, I would call:

```
Edit(
  file_path="/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx",
  old_string="<exact text from line 45 containing the blue color value>",
  new_string="<same text with blue replaced by green>"
)
```

For example, if line 45 reads:
```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded">
```

Then the Edit call would be:
```
Edit(
  file_path="/Users/nickkulavic/Projects/opencode-mcp/src/components/Header.tsx",
  old_string='<button className="bg-blue-500 text-white px-4 py-2 rounded">',
  new_string='<button className="bg-green-500 text-white px-4 py-2 rounded">'
)
```

Or if it uses inline styles like `style={{ backgroundColor: 'blue' }}`, the replacement would target that value specifically.

---

## Special Considerations

1. **Read before editing** — The Edit tool requires that I have read the file at least once in the conversation before editing it. This is a hard requirement enforced by the tool.

2. **Exact string matching** — The Edit tool performs exact string replacement. The old_string must match the file content character-for-character, including whitespace and indentation. Reading the file first ensures I get this right.

3. **Uniqueness** — The old_string must be unique in the file so the edit applies to exactly the right location. If the same string appears elsewhere, I would need to include more surrounding context lines to make it unique.

4. **Color value format** — "Blue" could be represented many ways (Tailwind class, hex, RGB, CSS named color, a design token, etc.). Reading the file first is the only way to know the correct format and apply the analogous green value (e.g., `bg-blue-500` -> `bg-green-500`, `#3B82F6` -> `#22C55E`, `blue` -> `green`).

5. **No verification step needed** — For a change this simple, re-reading the file after editing is optional. The Edit tool's diff output confirms the change was applied correctly.

---

## Summary

Total tool calls: 2 (Read + Edit). No OpenCode delegation. Estimated time: seconds.
