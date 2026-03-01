# Approach: Unit Tests for Authentication Middleware

## 1. Delegation Decision: Delegate to OpenCode

**Why delegate:**

Writing unit tests for an authentication middleware is a perfect delegation target for several reasons:

- The output will be well over 30 lines of code (each test case for JWT expired, missing, invalid signature, and valid token needs setup, assertions, and mocks).
- Test suites are inherently boilerplate-heavy: describe blocks, beforeEach/afterEach setup, mock configurations, and assertion patterns repeat predictably across cases.
- The structure is well-defined: the test cases are explicitly enumerated in the task (expired tokens, missing tokens, invalid signatures, valid tokens), giving OpenCode a clear specification to implement against.
- The file path and library (`src/middleware/auth.ts`, `jsonwebtoken`) are known, so the prompt can be precise.
- Writing this manually would take several minutes; OpenCode can generate it in seconds and I can spend my time reviewing rather than typing.

---

## 2. Exact Sequence of Tool Calls

### Step 1: Read the middleware source file first

Before delegating, I would read `src/middleware/auth.ts` to understand:
- The function signature (Express middleware? Koa? Custom?)
- What the middleware returns or calls (`next()`, throws an error, returns a response)
- How it uses `jsonwebtoken` (which specific methods: `verify`, `decode`)
- What error types it distinguishes (does it check `err.name === 'TokenExpiredError'` or `JsonWebTokenError`?)
- What it attaches to the request object on success (e.g., `req.user`)

This is critical context I need to write a precise prompt.

### Step 2: Create an OpenCode session

```
opencode_session action="create"
```

### Step 3: Send the delegation prompt (see Section 3 below)

```
opencode_message session_id="<id from step 2>" content="<prompt below>"
```

### Step 4: Review the generated output

```
opencode_file session_id="<id from step 2>" path="src/middleware/auth.test.ts"
```

---

## 3. The Specific Prompt to Send to OpenCode

```
Write a complete unit test file for the authentication middleware at src/middleware/auth.ts.

Context from the source file:
[I would insert the actual function signature, key logic, and error handling patterns I found when reading auth.ts]

Requirements:
- Test file location: src/middleware/__tests__/auth.test.ts (or src/middleware/auth.test.ts if colocated tests are used in this project)
- Test framework: Jest (assume unless the project config says otherwise)
- Mock the `jsonwebtoken` library using jest.mock('jsonwebtoken') — do NOT make real JWT calls
- Use a mock Express request/response/next pattern (mockRequest, mockResponse, mockNext)

Test cases to cover:

1. Valid token:
   - Mock jwt.verify to call its callback with no error and a decoded payload (e.g., { userId: '123', role: 'user' })
   - Assert that next() is called with no arguments
   - Assert that req.user is set to the decoded payload

2. Missing token:
   - Simulate a request with no Authorization header (or no token in the expected location)
   - Assert that next() is NOT called (or is called with an error, depending on middleware behavior)
   - Assert the response sends a 401 status

3. Expired token:
   - Mock jwt.verify to call its callback with a TokenExpiredError (new jsonwebtoken.TokenExpiredError('jwt expired', new Date()))
   - Assert the response sends a 401 status with an appropriate "token expired" message

4. Invalid signature:
   - Mock jwt.verify to call its callback with a JsonWebTokenError (new jsonwebtoken.JsonWebTokenError('invalid signature'))
   - Assert the response sends a 401 status with an appropriate "invalid token" message

Include:
- A beforeEach that resets all mocks
- Type annotations (TypeScript)
- Clear describe/it block naming following the pattern: describe('authMiddleware', () => { describe('when token is missing', () => { it('should return 401', ...) }) })

Do not add unnecessary dependencies. Keep mocks minimal and focused.
```

---

## 4. What to Look for During Review

### Correctness of mock setup
- Verify that `jest.mock('jsonwebtoken')` is at the top level, not inside a test or describe block.
- Check that `jwt.verify` is mocked correctly — it could be callback-based or promise-based depending on the actual middleware. If the source uses `jwt.verify(token, secret, callback)`, the mock must simulate a callback invocation, not a return value.

### Coverage of all four cases
- Confirm all four test cases are present: valid, missing, expired, invalid signature.
- Check that the `TokenExpiredError` and `JsonWebTokenError` are instantiated correctly, since these are subclasses exported from `jsonwebtoken` and are easy to mock incorrectly.

### Request/response mock shape
- Ensure `mockRequest` includes the headers or cookie field where the middleware actually reads the token from (e.g., `Authorization: 'Bearer <token>'`). If the middleware reads from `req.headers.authorization`, the mock must reflect that exactly.
- Ensure `mockResponse` includes `status()` and `json()` chainable mocks (common pattern: `status: jest.fn().mockReturnThis(), json: jest.fn()`).

### TypeScript types
- Check that the file compiles without type errors — specifically that the mock request/response objects satisfy the Express `Request`/`Response` types, or are cast appropriately.

### No real JWT secrets or real network calls
- Confirm there are no hardcoded production secrets and no real `jwt.sign` calls creating real tokens.

### Test isolation
- Verify `jest.clearAllMocks()` or `jest.resetAllMocks()` is in a `beforeEach` so mock call counts don't bleed between tests.

---

## 5. How to Handle Issues Found

### Issue: Wrong mock style (e.g., mocking return value instead of callback)

If the source middleware uses `jwt.verify(token, secret, (err, decoded) => { ... })` but OpenCode generated `(jwt.verify as jest.Mock).mockReturnValue(decoded)`, I would make a targeted edit directly: change the mock to use `mockImplementation((token, secret, cb) => cb(null, mockPayload))`.

### Issue: Missing test case

If one of the four cases is absent, I would either write it directly (it's a small addition at that point) or send a follow-up message to OpenCode:
```
opencode_message session_id="<id>" content="The test for invalid signature (JsonWebTokenError) is missing. Add a test case that mocks jwt.verify to call the callback with new jsonwebtoken.JsonWebTokenError('invalid signature') and asserts a 401 response."
```

### Issue: Type errors

If the mock request/response objects cause TypeScript compilation errors, I would edit the relevant lines directly — casting with `as unknown as Request` is a standard and safe pattern for test mocks.

### Issue: Tests pass but assertions are too weak (e.g., only checking status code, not response body)

I would strengthen assertions directly in the file by adding `expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))` after the status check.

### Issue: Secret key not configurable

If OpenCode hardcoded the JWT secret as a string literal, I would edit it to read from `process.env.JWT_SECRET` or whatever the middleware uses, ensuring the test environment matches the middleware's expectations.
