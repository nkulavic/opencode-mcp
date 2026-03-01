# Approach: File Upload REST Endpoint

## Decision: Delegate to OpenCode

This task is a clear candidate for delegation to OpenCode because:

- The output will be well over 30 lines of TypeScript code
- It involves scaffolding a new file (`src/routes/upload.ts`) from scratch
- The requirements are well-specified (multipart/form-data, 5MB limit, image-only, disk storage, URL response)
- The boilerplate for multer configuration, error handling, and Express route wiring is repetitive and mechanical
- Writing it directly would take meaningful time with no architectural benefit from doing so manually

---

## Exact Sequence of Tool Calls

### Step 1: Create an OpenCode session

```
opencode_session action="create"
```

This gives back a session ID (e.g., `abc123`) that scopes all subsequent messages to an isolated coding context.

---

### Step 2: Explore the existing project structure (optional but recommended)

Before sending the prompt, I would use `opencode_find` or `opencode_file` to understand the project layout — specifically:

- What TypeScript config is in use (`tsconfig.json`)
- How other route files are structured (e.g., `src/routes/auth.ts` or `src/routes/index.ts`)
- What dependencies are already installed (`package.json`) — particularly whether `multer` and `@types/multer` are present
- How the Express app is wired up (`src/app.ts` or `src/index.ts`) to know the base URL pattern for file serving

This ensures the prompt I write is grounded in actual project conventions rather than guesses.

---

### Step 3: Send a detailed prompt to the session

```
opencode_session action="prompt" id="abc123" content="
Create a new Express route file at src/routes/upload.ts in TypeScript.

Requirements:
- Use multer for multipart/form-data handling
- Accept only image files (jpeg, jpg, png, gif, webp) — validate by mimetype AND file extension
- Reject files larger than 5MB (5 * 1024 * 1024 bytes) — return HTTP 400 with a descriptive error message
- Reject non-image files — return HTTP 400 with a descriptive error message
- Store accepted files to disk at uploads/ directory (relative to project root)
- Generate unique filenames using Date.now() + original extension to avoid collisions
- On success, return HTTP 200 JSON: { url: '/uploads/<filename>' }
- Handle multer errors explicitly (MulterError) and generic errors separately
- Export a single Express Router as the default export
- Use async/await where applicable; avoid callbacks
- Follow the same TypeScript style as existing routes (import type { Request, Response, Router } from 'express')

Reference the existing route files in src/routes/ for naming and export conventions.
Do not register this route in app.ts — only create the route file itself.
"
```

The prompt is specific about:
- Exact file path
- Validation rules (both mimetype AND extension — defense in depth)
- Error response shape and HTTP status codes
- Success response shape
- Storage details (directory, filename uniqueness strategy)
- What NOT to do (don't touch app.ts)
- TypeScript style cues

---

### Step 4: Check the output status

```
opencode_file action="status"
```

This confirms which files were written and whether the agent completed without error.

---

### Step 5: Read the generated file

```
Read /Users/.../src/routes/upload.ts
```

I would read the entire generated file carefully before accepting it.

---

## What to Look For During Review

### Security issues (highest priority)
- **File type bypass**: Does it validate mimetype AND extension, or only one? Validating only mimetype can be spoofed; validating only extension misses `Content-Type` tricks. Both should be checked.
- **Path traversal**: Is `destination` hardcoded to a safe path, or could a crafted filename escape the uploads directory? The `filename` callback should strip path separators.
- **Unrestricted file serving**: The response URL should point to a known static path, not an arbitrary filesystem path.

### Correctness issues
- **Size limit enforcement**: Confirm `limits: { fileSize: 5 * 1024 * 1024 }` is set on the multer instance, not just checked manually after the fact — multer's built-in limit triggers a `MulterError` with code `LIMIT_FILE_SIZE`.
- **MulterError handling**: The error handler must check `err instanceof multer.MulterError` before the generic `err instanceof Error` branch, otherwise LIMIT_FILE_SIZE errors get swallowed as 500s.
- **Missing uploads directory**: The code should either ensure the directory exists at startup or handle the ENOENT case gracefully.
- **Single vs. multiple files**: The route should use `upload.single('file')` (or whatever field name is appropriate) — not `upload.any()` which accepts arbitrary fields.

### TypeScript issues
- **Type assertions**: `req.file` is typed as `Express.Multer.File | undefined` — the code must guard against `undefined` before accessing `.filename` or `.path`.
- **Return type annotations**: Route handlers should be typed as `(req: Request, res: Response): void`.

### Operational issues
- **Hardcoded paths**: The uploads directory and base URL should ideally come from environment variables (`process.env.UPLOAD_DIR`, `process.env.BASE_URL`), not be hardcoded strings.
- **No filename sanitization**: Generated filenames using only `Date.now()` could collide under high concurrency; a UUID or random suffix is safer.

---

## How to Handle Issues Found

### If there are security issues (e.g., missing dual validation, path traversal)
Send a targeted fix prompt:

```
opencode_session action="prompt" id="abc123" content="
The file filter in src/routes/upload.ts only checks mimetype.
Add extension validation as well using path.extname(file.originalname).toLowerCase()
against an allowlist of ['.jpg', '.jpeg', '.png', '.gif', '.webp'].
Reject the file if either mimetype or extension fails the check.
"
```

### If the MulterError handling is wrong (wrong order or missing)
Send a focused fix prompt describing exactly which branch needs to move and why.

### If it's a small issue (e.g., missing `res: Response` type annotation, wrong field name)
Fix it directly with the Edit tool rather than re-prompting — faster for 1-3 line changes.

### If the output is fundamentally wrong (wrong library, wrong structure)
Revert the file, refine the prompt with more constraints, and re-prompt. Common prompt additions that help:
- Paste a snippet of an existing route file as a style reference
- Explicitly name the multer version if there are API differences
- Specify `"do not use express-fileupload or busboy — use multer only"`

---

## Summary

Delegate to OpenCode because this is new-file scaffolding exceeding 30 lines with well-defined requirements. Send a precise prompt that specifies file path, validation rules, error codes, response shapes, and style conventions. After generation, review for the two most common failure modes in file upload code: incomplete type validation (mimetype-only checks) and incorrect multer error handling order. Fix small issues directly with Edit; re-prompt for structural problems.
