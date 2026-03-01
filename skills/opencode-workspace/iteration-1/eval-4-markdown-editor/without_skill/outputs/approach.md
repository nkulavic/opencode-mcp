# Approach: Markdown Editor with Live Preview

## 1. Overall Approach and Architecture Decisions

The task requires a single-file, zero-dependency markdown editor. This means all functionality — parsing, highlighting, and exporting — must be implemented using only vanilla JavaScript, HTML, and CSS bundled into one `.html` file.

**Architecture: Single HTML file with inline CSS and JS**

- The file will be a self-contained `index.html`.
- Layout: a two-panel split view (editor on the left, live preview on the right) using CSS flexbox or grid.
- Markdown parsing: implemented from scratch as a lightweight custom parser (no marked.js, no showdown) since no dependencies are allowed.
- Syntax highlighting in the editor: achieved via a textarea overlaid with a div that mirrors content but applies syntax highlighting spans using CSS classes — a common trick used by libraries like CodeMirror but done manually here.
- Live preview: powered by an `input` event listener on the textarea that re-renders the preview div on every keystroke.
- Export to HTML: a button that takes the current rendered preview HTML, wraps it in a full HTML document structure, and triggers a download via a Blob URL.

**Key design decisions:**
- Use a textarea for the editor (simple, accessible, handles cursor/selection natively).
- The "syntax highlighting" in the editor panel will be a visual overlay technique: the textarea is transparent and sits atop a pre element that is kept in sync. CSS transforms the pre's text into highlighted spans.
- The markdown parser will support: headings (h1-h6), bold, italic, bold+italic, inline code, code blocks (fenced), blockquotes, unordered lists, ordered lists, horizontal rules, links, images, and paragraphs.
- The preview will render into a div with id "preview" by setting its inner content to the parser's output.
- A toolbar will include an "Export HTML" button and optionally quick-insert buttons for common markdown syntax.

## 2. Exact Sequence of Tool Calls

### Step 1: Verify the output directory exists

**Tool: Bash**
Command: `ls /Users/nickkulavic/Projects/opencode-mcp/skills/opencode-workspace/iteration-1/eval-4-markdown-editor/without_skill/outputs/`

This confirms the directory is present before writing any files into it.

### Step 2: Write the single-file implementation

**Tool: Write**
File path: `/Users/nickkulavic/Projects/opencode-mcp/skills/opencode-workspace/iteration-1/eval-4-markdown-editor/without_skill/outputs/index.html`

This is the main (and only) deliverable. The full content is written in one shot.

### Step 3: Verify the file was written correctly

**Tool: Read**
File path: `/Users/nickkulavic/Projects/opencode-mcp/skills/opencode-workspace/iteration-1/eval-4-markdown-editor/without_skill/outputs/index.html`

Scan through the output to confirm structure, no truncation, and that all major sections (HTML skeleton, CSS, JS parser, event listeners, export function) are present.

### Step 4: Spot-check key logic with Grep

**Tool: Grep**
Pattern: `function parseMarkdown` (or similar)
File: the output index.html

Confirms the parser function exists and is named correctly. Repeat for `exportHTML`, `updatePreview`, and the event listener wiring (`addEventListener`).

### Step 5: Open in a browser to smoke test

**Tool: Bash**
Command: `open /Users/nickkulavic/Projects/opencode-mcp/skills/opencode-workspace/iteration-1/eval-4-markdown-editor/without_skill/outputs/index.html`

This launches the file in the default browser for a quick visual sanity check.

## 3. What the Implementation Includes

### HTML Structure

```
DOCTYPE html
html[lang=en]
  head
    meta[charset=UTF-8]
    meta[name=viewport]
    title: Markdown Editor
    style: (all CSS inline)
  body
    div#toolbar
      span#app-title: Markdown Editor
      button#export-btn: Export HTML
    div#container
      div#editor-panel
        div#editor-wrapper
          pre#highlight-layer [aria-hidden=true]
          textarea#editor [spellcheck=false]
      div#divider
      div#preview-panel
        div#preview
    script: (all JS inline)
```

### CSS (inline in style tag)

- CSS reset / box-sizing
- `body`, `html`: height 100%, no margin, font-family monospace for editor, sans-serif for preview
- `#toolbar`: fixed top bar, flexbox, space-between, with title and export button styled
- `#container`: flexbox row, takes remaining height (calc 100vh minus toolbar height)
- `#editor-panel`, `#preview-panel`: each flex: 1, overflow auto
- `#editor-wrapper`: position relative to stack the highlight layer and textarea
- `#highlight-layer` (the pre element): position absolute, top/left 0, full width/height, pointer-events none, same font/size/padding as textarea, white-space pre-wrap, word-wrap break-word, overflow hidden
- `#editor` (the textarea): position absolute, top/left 0, full width/height, background transparent, color transparent, caret-color: black or white depending on theme, same font/padding/size as the pre, resize none, border none, outline none
- Syntax highlight CSS classes: `.md-heading` (bold, colored), `.md-bold` (font-weight bold), `.md-italic` (font-style italic), `.md-code` (monospace background), `.md-blockquote` (color gray), `.md-link` (color blue, underline), `.md-list-marker` (color orange)
- `#preview` padding, prose styling: h1-h6 font sizes, blockquote left border, code background, pre code block styling, ul/ol list-style, anchor color, img max-width 100%, hr border
- `#divider`: 4px wide, background color #ccc, cursor col-resize
- Dark theme via `@media (prefers-color-scheme: dark)` with appropriate color overrides
- Export button styled with hover state

### JavaScript (inline in script tag)

**Markdown Parser (`parseMarkdown(text)`):**

Processes text line-by-line and with regex substitutions for inline elements. Parsing order matters — block elements first, then inline:

1. Escape HTML entities in raw text before processing (ampersand, less-than, greater-than, double-quote) to prevent injection
2. Fenced code blocks: detect triple-backtick opening and closing lines, accumulate lines, emit pre/code block (no inline parsing inside code blocks)
3. Headings: regex `/^(#{1,6})\s+(.+)/` maps to h1 through h6 tags
4. Horizontal rule: regex `/^(-{3,}|\*{3,}|_{3,})$/` emits an hr tag
5. Blockquote: regex `/^>\s?(.*)$/` accumulates lines, wraps in blockquote
6. Unordered list: regex `/^[-*+]\s+(.+)/` accumulates li items, wraps in ul
7. Ordered list: regex `/^\d+\.\s+(.+)/` accumulates li items, wraps in ol
8. Blank lines: flush any open list or blockquote context
9. Remaining non-empty lines: wrap in p tags
10. Inline substitutions applied to non-code-block content:
    - Bold+italic: triple asterisks around text -> strong+em tags
    - Bold: double asterisks around text -> strong tags
    - Italic: single asterisk around text -> em tags
    - Inline code: single backticks around text -> code tags
    - Images: `![alt](url)` pattern -> img tags
    - Links: `[text](url)` pattern -> anchor tags
    - Strikethrough: double tilde around text -> del tags

**Editor Syntax Highlighter (`highlightEditor(text)`):**

Applies regex-based span wrapping to the raw markdown text to colorize it in the overlay pre element. Since the textarea is transparent and sits on top, users see the colors through the background. Steps:

1. Escape HTML entities in the text first
2. Apply span wrappers using regex replace — similar set of patterns as the parser but producing `<span class="md-X">` elements instead of semantic HTML
3. Set the highlight layer's content to the result
4. Keep the pre in sync with textarea scroll position

**Event Wiring:**

```javascript
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const highlightLayer = document.getElementById('highlight-layer');

function updateAll() {
  const text = editor.value;
  // set preview content to parsed markdown output
  // set highlight layer content to syntax-highlighted markdown
  // sync scroll position
}

editor.addEventListener('input', updateAll);
editor.addEventListener('scroll', () => {
  highlightLayer.scrollTop = editor.scrollTop;
});

// Initialize with sample markdown content
editor.value = '# Welcome to Markdown Editor\n\n...sample content...';
updateAll();
```

**Export Function:**

```javascript
document.getElementById('export-btn').addEventListener('click', () => {
  // Build a complete HTML document string using the current preview content
  // Create a Blob of type text/html
  // Create an object URL from the blob
  // Create a temporary anchor element, set its href to the object URL,
  //   set download attribute to 'document.html', click it programmatically
  // Revoke the object URL to free memory
});
```

The exported file is a complete standalone HTML5 document with embedded CSS for clean prose rendering. It does not depend on the editor being open.

**Sample Initial Content:**

The editor is pre-populated with a markdown document that exercises all supported features: headings at multiple levels, bold, italic, inline code, a fenced code block, a blockquote, an unordered list, an ordered list, a link, an image reference, and a horizontal rule. This lets users immediately see the live preview in action on load.

## 4. How Quality is Ensured

### Correctness of the parser

- HTML entity encoding of the raw input happens before any other regex processing, which prevents script injection via markdown content.
- Code blocks (both fenced and inline) are exempted from further inline substitution, preventing double-processing of their contents.
- List and blockquote state is tracked across lines so consecutive list items are grouped into a single ul or ol element rather than emitting individual wrapper tags per line.
- The parser processes block elements in a priority order that prevents, for example, a heading pattern matching inside a blockquote.

### Editor highlighting accuracy

- The highlight layer pre element uses the exact same font family, font size, line-height, padding, and white-space rules as the textarea, ensuring pixel-perfect alignment between the invisible cursor and the colored text beneath it.
- Scroll sync on both the `input` and `scroll` events keeps the two layers aligned even for long documents.

### Export quality

- The exported HTML is a complete, valid HTML5 document with its own embedded CSS for basic prose styling (max-width container, line-height, code backgrounds, blockquote left border, image max-width).
- It uses only the rendered output of the parser, so it is clean semantic HTML — not raw markdown text.

### Visual design

- The layout is responsive within the viewport using flexbox and viewport-relative units.
- Both light and dark color schemes are supported via `@media (prefers-color-scheme: dark)` overrides.
- The export button has a clear hover state for visual feedback.

### Manual verification steps

1. Type markdown in the editor and confirm the preview updates in real time without lag.
2. Exercise each supported feature: headings, bold, italic, code spans, fenced code blocks, blockquotes, unordered lists, ordered lists, links, images, and horizontal rules — verify each renders correctly in the preview.
3. Click "Export HTML", open the downloaded file in a browser, and confirm it looks correct as a standalone document independent of the editor.
4. Scroll a long document in the editor and confirm the highlight layer stays in sync.
5. Confirm no external network requests are made and the file works offline (fully self-contained).
6. Test in Chrome, Firefox, and Safari to verify cross-browser compatibility of the textarea overlay technique.
7. Verify that pasting potentially malicious content (e.g., raw HTML tags) does not execute in the preview due to entity encoding.
