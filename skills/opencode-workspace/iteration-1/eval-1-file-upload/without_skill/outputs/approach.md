# Approach: File Upload REST Endpoint

## Task Summary

Add a new REST endpoint to an Express app at `src/routes/upload.ts` that:
- Accepts `multipart/form-data`
- Validates file size (max 5MB)
- Validates file type (images only)
- Stores files to disk
- Returns the file URL

---

## 1. Whether to Delegate to OpenCode or Write Directly

**Decision: Delegate to OpenCode MCP.**

**Reasoning:**

This task involves writing a self-contained, well-defined TypeScript module. The requirements are explicit and complete (file size limit, type restriction, storage location, response shape). There is no ambiguity that requires iterative human judgment.

OpenCode is well-suited here because:

- The code to be generated is a single file (`src/routes/upload.ts`) with no output beyond that file.
- The task is a standard Express + Multer pattern that a code-generation model can produce correctly on the first pass.
- Writing it directly would require me to manually type out boilerplate (Multer configuration, router setup, error handling middleware) that a model can generate faster and with less risk of typos.
- The requirements map cleanly to a prompt, making delegation low-risk.

Writing directly would be preferred if:
- The codebase had unusual conventions I needed to match precisely.
- The task required deep understanding of many interconnected files before writing.
- OpenCode was unavailable or had produced poor results in prior iterations.

Since I have no prior context about this specific codebase's conventions, I will first do a small amount of reconnaissance using standard tools, then delegate the actual code generation to OpenCode.

---

## 2. Exact Sequence of Tool Calls

### Step 1: Reconnaissance — understand the existing codebase

Before delegating, I need to gather context so the OpenCode prompt is accurate and the generated code integrates cleanly.

**Tool call 1: Glob — find existing route files**

```
Glob("src/routes/**/*.ts")
```

Purpose: See what other route files exist, understand naming conventions, and check if there is already an upload route stub.

**Tool call 2: Glob — find the main app entry point**

```
Glob("src/**/*.ts", path="src")
```

or more targeted:

```
Glob("src/app.ts")
Glob("src/index.ts")
Glob("src/server.ts")
```

Purpose: Find the main Express app file so I can understand how routes are registered and whether there is a standard pattern (e.g., `app.use('/api', router)`).

**Tool call 3: Read — read the main app file**

```
Read("/Users/nickkulavic/Projects/opencode-mcp/src/app.ts")   // or whichever file Glob found
```

Purpose: Confirm the Express setup, understand existing middleware (body parsers, auth, error handlers), and learn the base URL prefix used for routes.

**Tool call 4: Read — read an existing route file for conventions**

```
Read("/Users/nickkulavic/Projects/opencode-mcp/src/routes/<existing_route>.ts")
```

Purpose: Match the code style — does the project use `express.Router()` exported as default? Does it use async/await with a try/catch pattern or a wrapper? Does it use a specific error class?

**Tool call 5: Glob — check package.json for installed dependencies**

```
Read("/Users/nickkulavic/Projects/opencode-mcp/package.json")
```

Purpose: Confirm whether `multer` is already installed. If it is, I instruct OpenCode to use it. If it is not, I note that `multer` must be added as a dependency and include that instruction in the prompt.

**Tool call 6: Grep — check for existing upload-related code**

```
Grep("upload", path="src", type="ts", output_mode="files_with_matches")
```

Purpose: Ensure there is no conflicting upload logic already present.

**Tool call 7: Bash — check for a TypeScript config and tsconfig paths**

```
Read("/Users/nickkulavic/Projects/opencode-mcp/tsconfig.json")
```

Purpose: Understand path aliases (e.g., `@/` mapped to `src/`) so the OpenCode prompt uses the correct import style.

---

### Step 2: Delegate code generation to OpenCode

With the reconnaissance complete, I open an OpenCode session and send a precise prompt.

**Tool call 8: opencode_session — create a new session**

```
opencode_session({ action: "create" })
```

Returns a session ID, e.g., `"session-abc123"`.

**Tool call 9: opencode_message — send the code generation prompt**

```
opencode_message({
  session_id: "session-abc123",
  role: "user",
  content: `
You are working in a TypeScript Express project located at /Users/nickkulavic/Projects/opencode-mcp.

Create the file src/routes/upload.ts. It must:

1. Use express.Router().
2. Use multer for multipart/form-data parsing (multer is already installed).
3. Accept POST requests at the path "/" (callers will mount this router at a chosen prefix).
4. Validate file size: reject files larger than 5MB (5 * 1024 * 1024 bytes). Return HTTP 400 with a JSON error message if the limit is exceeded.
5. Validate file type: accept only image MIME types (image/jpeg, image/png, image/gif, image/webp). Reject anything else with HTTP 400 and a JSON error message.
6. Store accepted files to disk in the directory "uploads/" at the project root. Create the directory if it does not exist.
7. On success, return HTTP 200 with JSON: { "url": "/uploads/<filename>" } where <filename> is the stored file's name on disk.
8. Handle multer errors (MulterError) separately from general errors, mapping them to HTTP 400.
9. Handle the case where no file is provided: return HTTP 400 with a descriptive message.
10. Export the router as the default export.
11. Use async/await and TypeScript types throughout. Import types from 'express' and 'multer' as needed.
12. Match the code style of the existing routes in src/routes/ (use express.Router(), default export, try/catch error handling).

Do not install any packages. Do not modify any other files. Only produce src/routes/upload.ts.
`
})
```

**Tool call 10: opencode_message — poll or await the response**

Wait for OpenCode to return the generated file content. If the tool streams responses, read until completion.

---

### Step 3: Review the generated file

**Tool call 11: opencode_file — read the file OpenCode created**

```
opencode_file({ session_id: "session-abc123", path: "src/routes/upload.ts" })
```

Or, if OpenCode wrote directly to disk:

```
Read("/Users/nickkulavic/Projects/opencode-mcp/src/routes/upload.ts")
```

**What I look for during review:**

- **Multer configuration correctness**: Is `dest` set to `"uploads/"`? Is `limits.fileSize` set to exactly `5 * 1024 * 1024`?
- **File filter implementation**: Does the `fileFilter` callback correctly check `req.file.mimetype` against the allowed list? Does it call `cb(null, true)` for valid types and `cb(new Error(...), false)` for invalid ones?
- **Error handler middleware**: Is there a dedicated error-handling middleware with the signature `(err, req, res, next)` that catches `MulterError` instances (specifically `LIMIT_FILE_SIZE`) and returns 400? Does it also handle the custom mime-type error?
- **Directory creation**: Is there a call to `fs.mkdirSync('uploads/', { recursive: true })` or equivalent before the router is used?
- **Success response shape**: Does the route return `{ url: "/uploads/<filename>" }` using the actual stored filename from `req.file.filename`?
- **No-file case**: Does the route check `if (!req.file)` and return 400?
- **TypeScript correctness**: Are `Request`, `Response`, `NextFunction` imported? Is `req.file` typed correctly (it comes from `Express.Multer.File`)?
- **Export**: Is the router the default export?
- **No modification of other files**: Confirm OpenCode only produced this one file.
- **Style consistency**: Does the code match the conventions found in other route files during reconnaissance?

---

### Step 4: Handle any issues found

**Issue: multer not installed**

If `package.json` shows multer is absent, I would run:

```
Bash("npm install multer @types/multer")
```

before reviewing the generated file, and ensure the OpenCode prompt already stated this so the generated imports are correct.

**Issue: generated code uses wrong import style or path aliases**

If the generated code uses `import { something } from '@/middleware/...'` but the project doesn't have that alias, I would use Edit to fix the import path directly rather than regenerating.

**Issue: fileFilter error propagation is broken**

A common bug is passing a plain `Error` through multer's `fileFilter` callback — Express won't surface it through the multer error handler. I would check and, if broken, edit the error handler to also catch generic `Error` instances with a known message string, or restructure the fileFilter to use a `MulterError` subclass.

**Issue: filename collision**

If OpenCode uses `multer`'s default storage (which uses random filenames), that is acceptable. If it uses `diskStorage` with `filename` set to the original name, there is a collision risk. I would edit the filename callback to include a timestamp or UUID prefix: `Date.now() + '-' + file.originalname`.

**Issue: uploads/ directory not created**

If the directory creation is missing, I would add:

```typescript
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
```

at the top of the file using the Edit tool.

**Issue: the route is not registered in the app**

The task says only to create `src/routes/upload.ts`, so I would not modify the app file. However, I would note in my response to the user that they need to add `app.use('/uploads', uploadRouter)` (or their chosen prefix) in their main app file, and import the router from `src/routes/upload.ts`.

---

## Summary

| Step | Tool | Purpose |
|------|------|---------|
| 1 | Glob | Find existing route files |
| 2 | Glob | Find main app entry point |
| 3 | Read | Read main app file for middleware/routing conventions |
| 4 | Read | Read an existing route for code style |
| 5 | Read | Check package.json for multer |
| 6 | Grep | Check for existing upload code |
| 7 | Read | Check tsconfig for path aliases |
| 8 | opencode_session | Create OpenCode session |
| 9 | opencode_message | Send detailed code generation prompt |
| 10 | opencode_message | Await generated output |
| 11 | Read / opencode_file | Read the generated file |
| 12 | Edit (if needed) | Fix any issues in the generated code |
