# Approach: Writing Unit Tests for Authentication Middleware

## 1. Whether to Delegate to OpenCode or Write Directly, and Why

I would delegate the test generation to OpenCode rather than writing it directly.

**Reasoning:**

Writing unit tests for a JWT middleware is a well-scoped, self-contained coding task with predictable structure. OpenCode excels at code generation tasks like this because:

- The task requires reading an existing file, understanding its structure, and producing a corresponding test file — a pattern that maps well to code generation delegation.
- The test patterns for JWT middleware (valid token, expired token, missing token, invalid signature) are well-known and OpenCode can generate thorough coverage quickly.
- Delegating frees me from manually writing boilerplate (describe/it blocks, mock setup, assertion patterns) and lets me focus on reviewing correctness rather than authoring from scratch.
- If the generated output has gaps or issues, I can make targeted edits rather than starting from zero.

**When I would write directly instead:**
If the middleware had highly unusual or project-specific behavior not inferable from the file alone, or if the codebase had a bespoke test harness with non-standard conventions, I would read those first and potentially write tests manually or give OpenCode more explicit instructions.

---

## 2. Exact Sequence of Tool Calls

### Step 1: Read the middleware file

Before delegating, I need to understand what I'm testing. I would read the source file to understand its exports, the shape of the request/response objects it expects, how it reads the token (Authorization header vs. cookie), what it attaches to the request on success, and what HTTP status codes or error payloads it returns on failure.

Tool: `Read`
Path: `/Users/nickkulavic/Projects/opencode-mcp/src/middleware/auth.ts`

### Step 2: Scan for existing test infrastructure

I would look for an existing test config, test helper files, and existing test files to understand the testing framework in use (Jest, Vitest, Mocha, etc.), the import style (ESM vs. CJS), any global mocks or setup files, and naming conventions for test files.

Tool: `Glob`
Pattern: `**/*.test.ts` or `**/*.spec.ts`
Also: `Glob` for `jest.config.*`, `vitest.config.*`, `.mocharc.*`
Also: `Read` on `package.json` to confirm test runner and scripts.

### Step 3: Check for existing mock patterns or test utilities

Tool: `Grep`
Pattern: `jsonwebtoken` across test files to see if there is an established mock pattern for `jsonwebtoken` already in the codebase.

### Step 4: Create an OpenCode session and delegate test generation

With the middleware source and test infrastructure context in hand, I would start an OpenCode session and send a detailed message instructing it to write the test file.

Tool: `opencode_session` (create a new session)

Tool: `opencode_message` with a prompt along these lines:

> "Here is the source for an Express authentication middleware at src/middleware/auth.ts: [paste full file contents]. It uses the `jsonwebtoken` library. The project uses [Jest/Vitest — whatever was found in Step 2].
>
> Write a comprehensive unit test file at src/middleware/auth.test.ts that covers:
> 1. A valid JWT token — middleware calls next() and attaches the decoded payload to req.user (or whatever the middleware attaches).
> 2. An expired token — middleware returns HTTP 401 with an appropriate error message.
> 3. A missing token — middleware returns HTTP 401 when no Authorization header is present.
> 4. An invalid signature — middleware returns HTTP 401 when the token signature does not match.
> 5. Any additional edge cases visible in the source (e.g., malformed header format, wrong token type prefix).
>
> Mock `jsonwebtoken` using Jest's module mocking (jest.mock / vi.mock). Create minimal mock req, res, and next objects. Do not use a real secret or real token generation — use jest.fn() / vi.fn() for jwt.verify and control its behavior per test case."

### Step 5: Retrieve the generated file from OpenCode

Tool: `opencode_file` to read the file OpenCode produced, or read the session output to get the generated code.

### Step 6: Write the generated test file to disk

Tool: `Write`
Path: `/Users/nickkulavic/Projects/opencode-mcp/src/middleware/auth.test.ts`
Content: the code returned by OpenCode.

### Step 7: Run the tests to verify they pass

Tool: `Bash`
Command: `cd /Users/nickkulavic/Projects/opencode-mcp && npx jest src/middleware/auth.test.ts --no-coverage` (or the equivalent for Vitest: `npx vitest run src/middleware/auth.test.ts`)

---

## 3. What I Would Look for During Review

Before accepting the generated tests I would review for the following:

**Correctness of mocking:**
- `jsonwebtoken` must be fully mocked so no real cryptographic operations occur.
- `jwt.verify` mock must be configured to throw `TokenExpiredError`, `JsonWebTokenError`, or return a decoded payload depending on the test case.
- The mock setup must be reset between tests (`beforeEach` / `afterEach`) to prevent state leakage.

**Coverage of all specified cases:**
- Valid token path: `next()` is called, decoded payload is attached to the request object.
- Expired token: correct HTTP 401 response, error body indicates expiry.
- Missing token: correct HTTP 401 response when the Authorization header is absent or empty.
- Invalid signature: correct HTTP 401 response, using `JsonWebTokenError`.

**Accuracy of request/response mock shape:**
- The mock `req` object must match what the middleware actually reads (e.g., `req.headers.authorization` vs. a cookie).
- The mock `res` object must have `.status()` and `.json()` (or `.send()`) as jest mock functions so assertions can be made on them.

**Test isolation:**
- Each test must be independent. No shared mutable state between cases.

**Assertions are specific:**
- Tests should assert both the HTTP status code AND the response body content, not just one or the other.
- The valid-token test should assert the exact shape of what is attached to the request.

**No unnecessary real I/O or network calls:**
- No real file reads, database calls, or HTTP requests inside the tests.

---

## 4. How I Would Handle Issues Found

**If the tests fail to run (import/module errors):**
I would check whether the test file uses the correct module system (ESM import vs. `require`), verify the mock syntax matches the test runner version, and edit the file to fix import paths or mock syntax.

**If mock behavior is wrong (e.g., `jwt.verify` is not being intercepted):**
I would check the mock placement — `jest.mock('jsonwebtoken')` must be at the top of the file before imports are resolved. I would edit the file to move or correct the mock call.

**If the middleware attaches data differently than assumed:**
After reading the middleware source in Step 1 I would have the exact property names. If OpenCode guessed wrong (e.g., `req.user` vs. `req.auth`), I would use the `Edit` tool to correct the specific assertions.

**If a test case is missing:**
If the middleware has additional branches not covered (e.g., it checks token type prefix like "Bearer "), I would use `Edit` to add the missing test case rather than regenerating the entire file.

**If tests pass but coverage is insufficient:**
I would run with coverage (`--coverage`) and read the output to identify uncovered branches, then add targeted test cases for those branches using `Edit`.

**If OpenCode generates a completely wrong structure:**
In the unlikely case the output is unusable (wrong framework, wrong file structure), I would send a follow-up `opencode_message` with more specific constraints, or fall back to writing the tests directly using the patterns identified during the infrastructure scan in Step 2.
