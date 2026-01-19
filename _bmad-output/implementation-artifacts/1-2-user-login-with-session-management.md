# Story 1.2: User Login with Session Management

**Status:** done  
**Epic:** 1 - Authentication & Team Onboarding  
**Story ID:** 1.2  
**Created:** 2026-01-19

---

## Story

**As a** developer,  
**I want** to log in with email and password,  
**So that** I can access my teams and resume my work.

---

## Acceptance Criteria

### AC1: Successful Login Flow
- **Given** I'm on the login page
- **When** I enter a valid email and correct password that exists in the system
- **Then** the backend validates credentials against bcrypt-hashed password
- **And** I'm redirected to the Teams view (shows all teams I belong to)
- **And** I receive a new JWT access token (1-hour expiry) and refresh token (7-day expiry)
- **And** my session is active (subsequent API calls include JWT in Authorization header)

### AC2: Invalid Credentials Handling
- **Given** I'm on the login page
- **When** I enter an invalid email or incorrect password
- **Then** I see a generic error message: "Invalid email or password" (no user enumeration)
- **And** the form is not cleared (user can try again without re-typing)
- **And** no details about which field is wrong are revealed (prevents account enumeration attacks)

### AC3: Current Session Details Endpoint
- **Given** I'm logged in
- **When** I request `GET /api/v1/auth/me`
- **Then** I receive my user details:
  ```json
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-01-15T10:30:00Z",
    "requestId": "req-xyz"
  }
  ```
- **And** the response includes my user ID (for subsequent API calls)
- **And** no sensitive information (like password) is included

### AC4: Logout & Session Invalidation
- **Given** I'm logged in
- **When** I click "Logout" button
- **Then** my JWT tokens are invalidated (cleared from HTTP-only cookies)
- **And** my Zustand auth state is reset (user = null, isAuthenticated = false)
- **And** I'm redirected to the login page
- **And** subsequent API calls (without valid JWT) return 401 Unauthorized

### AC5: Multi-Device Independent Sessions
- **Given** I've logged in on device A (browser/laptop)
- **When** I log in on device B (tablet/mobile)
- **Then** both sessions are active independently
- **And** no session limit is enforced per user (each device has separate JWT)
- **And** logging out on device A does NOT affect device B's session
- **Note:** Post-MVP: can add session limit or force logout on new device

### AC6: Refresh Token Lifecycle
- **Given** my access token has expired (1 hour)
- **When** I make an API request
- **Then** the frontend detects 401 response
- **And** automatically exchanges my refresh token for a new access token
- **And** the API request is retried with the new token
- **And** the user experience is seamless (no logout required)

### AC7: Refresh Token Rotation
- **Given** I use my refresh token to get a new access token
- **When** the refresh endpoint processes the request
- **Then** a new refresh token is issued (optional: for enhanced security)
- **And** the old refresh token remains valid (for MVP; post-MVP can implement strict rotation)
- **And** multiple simultaneous refresh requests are handled correctly (no race conditions)

### AC8: Invalid Session Recovery
- **Given** my JWT is manually deleted from storage (or browser cleared)
- **When** I try to access a protected route
- **Then** I'm redirected to the login page
- **And** I see a message: "Session expired. Please log in again."
- **And** I can log in as normal

### AC9: Security - No Credentials in Logs
- **Given** authentication operations occur (login, refresh token, logout)
- **When** server-side logs are generated
- **Then** no passwords, JWT tokens, or refresh tokens appear in logs
- **And** logs contain only: timestamp, endpoint, HTTP status, request ID, user ID (if authenticated)

### AC10: Audit Trail Event Logging
- **Given** I successfully log in
- **When** the login is processed
- **Then** an event is logged:
  ```json
  {
    "eventType": "user.login_success",
    "actorId": <user_id>,
    "teamId": null,
    "entityType": "user",
    "entityId": <user_id>,
    "action": "login",
    "payload": {
      "email": "<email>",
      "timestamp": "<ISO 8601>",
      "ipAddress": "<X-Forwarded-For or socket.remoteAddress>"
    },
    "schemaVersion": "v1",
    "createdAt": "<ISO 8601 timestamp>"
  }
  ```
- **And** failed login attempts (invalid credentials) are NOT logged (prevent audit spam from brute-force attacks)
- **Note:** Brute-force protection via rate-limiting middleware handles attack mitigation

---

## Learning from Previous Story (1.1)

### Knowledge Transfer from User Registration
The Story 1.1 (User Registration) established critical patterns we'll reuse and extend:

#### Database & ORM Patterns
- ✅ **Prisma 7.x with @prisma/adapter-pg:** Connection pooling configured in `lib/prisma.ts`
- ✅ **snake_case DB columns mapped to camelCase TS:** Use `@map("created_at")` in schema for every timestamp
- ✅ **Atomic transactions for data + event logging:** Pattern proven in user.create() + events.insert()

**Why This Matters for Story 1.2:**
- Login queries must use the same Prisma client singleton (connection pool efficiency)
- Event logging for successful login reuses the same transaction pattern from registration
- Password verification (bcrypt.compare) follows the same security standard (10 rounds minimum)

#### Authentication Architecture Learnings
- ✅ **JWT with HS256:** Access tokens (1h), refresh tokens (7d)
- ✅ **HTTP-only secure cookies:** Set by Express via cookie-parser middleware; XSS-safe
- ✅ **Structured AppError class:** code, message, details, statusCode for consistency

**Why This Matters for Story 1.2:**
- Refresh token endpoint reuses JWT validation/generation logic from Story 1.1
- Error responses (invalid credentials) must match the same AppError format (code: "invalid_credentials")
- Cookie middleware already configured; login just needs to set new cookies

#### Backend Layering Proven
- ✅ **Service layer:** `auth.service.ts` with pure functions (bcrypt hashing, token generation)
- ✅ **Repository layer:** Prisma queries only (no business logic)
- ✅ **Controller layer:** Thin, delegates to services, formats responses

**Git Recent Commits (Inferred from Story 1.1):**
```
- commit abc123: "Story 1.1 Complete: User Registration with Email Validation"
- Files modified:
  - server/prisma/schema.prisma (added User, Event models)
  - server/src/services/auth.service.ts (registerUser, generateTokens)
  - server/src/controllers/auth.controller.ts (POST /register)
  - server/src/routes/auth.routes.ts (route registration)
  - client/src/features/auth/components/SignupForm.tsx
  - client/src/features/auth/api/authApi.ts
  - client/src/features/auth/state/authSlice.ts
```

**Code Pattern Reuse Opportunities:**
1. **Validation schema:** Can extend Zod schema from `auth.schema.ts` with loginSchema
2. **Error handling:** Duplicate AppError for "invalid_credentials" (code)
3. **API client:** `authApi.ts` already has fetch wrapper; add `loginUser(email, password)`
4. **Zustand store:** `authSlice.ts` already has `register()` action; add `login()` action
5. **Routes:** Add POST `/api/v1/auth/login` to existing `auth.routes.ts`

---

## Lessons to Avoid Regressions

### From Story 1.1 Implementation Experience

**Anti-Pattern Risk #1: Password Exposed in Error Messages**
- ❌ **Risk:** Return password in error response (e.g., "Password invalid because...")
- ✅ **Mitigation:** Generic message only: "Invalid email or password" (applies to both fields)
- ✅ **Test:** Verify error response never contains password or hashed password

**Anti-Pattern Risk #2: Credential Enumeration**
- ❌ **Risk:** Different error for "user not found" vs "password wrong"
- ✅ **Mitigation:** Same error message for both cases (prevents attackers from enumerating registered emails)
- ✅ **Test:** Try login with non-existent email; should get same message as wrong password

**Anti-Pattern Risk #3: JWT Token in Logs**
- ❌ **Risk:** Log middleware logs entire Authorization header with token
- ✅ **Mitigation:** Redact Authorization header in logs; log only "Authorization: Bearer [REDACTED]"
- ✅ **Test:** Check server logs contain no actual JWT tokens

**Anti-Pattern Risk #4: Bcrypt Hash Verification Timing Attack**
- ❌ **Risk:** Use string comparison (===) on bcrypt results (timing varies based on match)
- ✅ **Mitigation:** bcrypt.compare() handles timing-safe comparison automatically
- ✅ **Best Practice:** Always use bcrypt.compare(), never === on hashes

**Anti-Pattern Risk #5: Session Fixation**
- ❌ **Risk:** Don't invalidate old session on login; allow multiple tokens from different logins
- ✅ **Mitigation:** Each login issues new tokens; old tokens remain valid until expiry (acceptable for MVP)
- ✅ **Post-MVP:** Can implement token revocation list if needed

**Anti-Pattern Risk #6: Refresh Token Scope Creep**
- ❌ **Risk:** Use same refresh token across different teams/instances
- ✅ **Mitigation:** Refresh token scope limited to single team (team_id embedded in JWT)
- ✅ **Verification:** Refresh endpoint validates team_id matches

---

## Developer Context Section

### Critical Architecture Constraints & Tech Stack

This story builds on the tech stack and architectural decisions established in the Project Context document and Story 1.1 implementation:

#### Technology Stack (LOCKED for MVP)
- **Backend:** Node.js 18+ LTS + Express 4.18 + TypeScript 5.2+
- **Frontend:** React 18.2 + TypeScript 5.2+ + TailwindCSS 3.3+
- **Database:** PostgreSQL 14+ (single normalized schema, per-team isolation via app layer)
- **Authentication:** JWT (HS256) with bcrypt password hashing (10+ rounds)
- **ORM:** Prisma 5.0+ with @prisma/adapter-pg for connection pooling
- **State Management:** Zustand 4.4+ for frontend auth state (with localStorage persistence)
- **HTTP Client:** Fetch API with custom wrapper (requestId injection, error handling)

**Version Pinning Rationale:**
- React 18.2 locked (MVP stability; don't upgrade to 19)
- TypeScript 5.2+ (strict mode required in tsconfig.json)
- Prisma 5.0+ (breaking change from 4.x; schema @map required for camelCase)
- bcrypt 5.1+ (version 4.x has performance issues; 10 rounds minimum security)

#### Security Requirements (NON-NEGOTIABLE per NFR1-4)
- **NFR1: Password Hashing** - bcrypt with minimum 10 rounds
  ```typescript
  // Generation (Story 1.1): await bcrypt.hash(password, 10)
  // Verification (Story 1.2): await bcrypt.compare(inputPassword, hashedPassword)
  ```
- **NFR2: JWT Over HTTPS** - Access/refresh tokens in HTTP-only secure cookies
  ```typescript
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
  ```
- **NFR3: SQL Injection Prevention** - Parameterized queries via Prisma ORM only
  ```typescript
  // GOOD: Prisma query
  const user = await prisma.user.findUnique({where: {email}});
  // BAD: Raw SQL (never use this)
  // const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
  ```
- **NFR4: Team Isolation** - Application-level enforcement (separate databases per team)

#### API Contract & Error Handling (CRITICAL - Architectural ADR)
All API responses must follow strict format to enable research data integrity and developer debugging:

**Success Response (200 OK):**
```typescript
GET /api/v1/auth/me → 200
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2026-01-15T10:30:00Z",
  "requestId": "req-xyz"
}
```

**Error Response (4xx/5xx):**
```typescript
POST /api/v1/auth/login → 401 Unauthorized
{
  "code": "invalid_credentials",
  "message": "Invalid email or password",
  "details": { "field": "credentials" },
  "requestId": "req-abc"
}
```

**Error Format Rules:**
- `code`: Machine-readable identifier (never changes, used by frontend for i18n)
- `message`: Human-readable message (can change, shown to user)
- `details`: Optional object for field-specific info
- `requestId`: Always included (for logging correlation)
- `statusCode`: Implicit from HTTP status header (401, 400, 500, etc.)

#### Middleware Architecture (Authentication Flow)
```typescript
// Request flow with middleware stack
POST /api/v1/auth/login
  ↓
requestIdMiddleware        // Inject X-Request-Id header
  ↓
jsonBodyParser            // Parse JSON body
  ↓
validateLoginSchema       // Zod schema: email (valid format), password (8+ chars)
  ↓
authController.login()    // Call service
  ↓
authService.login()       // Find user, verify password, generate tokens
  ↓
eventsRepository.log()    // Log successful login event (in transaction)
  ↓
response + setCookie()    // Set HTTP-only cookies with JWT
  ↓
200 OK response sent
```

#### State Management Pattern (Zustand)
```typescript
// authSlice.ts structure (established in Story 1.1, extended for Story 1.2)
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  register(name, email, password): Promise<void>;
  login(email, password): Promise<void>;      // NEW for Story 1.2
  logout(): void;                              // NEW for Story 1.2
  refreshSession(): Promise<void>;             // NEW for Story 1.2
  reset(): void;
}

// Persistence rule: Only non-sensitive data to localStorage
// Tokens in HTTP-only cookies (backend handles)
// Reset on logout clears localStorage + cookies
```

#### Event Logging Schema (Research Integrity)
```sql
-- Events table (established in Story 1.0/1.1)
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,  -- "user.login_success", "user.login_failed"
  actor_id INT,                      -- User ID (NULL for login attempts without valid credentials)
  team_id INT,                       -- NULL for user-level events
  entity_type VARCHAR(50),           -- "user"
  entity_id INT,                     -- User ID
  action VARCHAR(50),                -- "login"
  payload JSONB,                     -- {email, timestamp, ipAddress}
  schema_version VARCHAR(10) DEFAULT 'v1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexing for audit queries
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_actor ON events(actor_id);
```

#### Database Query Performance (Coverage & Optimization)
```typescript
// Story 1.2 queries must be optimized
// User lookup by email (should be indexed from Story 1.1)
const user = await prisma.user.findUnique({
  where: { email },
  select: {id: true, email: true, password: true, name: true, createdAt: true}
});
// Index expectation: UNIQUE on users(email) from schema

// Event insertion (append-only, no WHERE clause)
await prisma.event.create({
  data: {
    eventType: 'user.login_success',
    actorId: user.id,
    entityType: 'user',
    entityId: user.id,
    action: 'login',
    payload: {email: user.email, timestamp: new Date().toISOString(), ipAddress}
  }
});
// Performance: < 10ms (event table indexes on event_type, actor_id)
```

#### Frontend API Client Pattern (Reused from Story 1.1)
```typescript
// api/authApi.ts extends with new login function
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': generateRequestId() // Injected by wrapper
    },
    body: JSON.stringify({email, password}),
    credentials: 'include' // CRITICAL: include cookies for JWT
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.code, error.message, error.details);
  }

  return response.json(); // Returns {user, requestId}
};
```

#### TypeScript Type Safety (Strict Mode)
```typescript
// All types must be explicit; no implicit 'any'
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  };
  requestId: string;
}

interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

// tsconfig.json requirements (enforced by linting)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Testing Requirements (Coverage & Quality Gates)
```typescript
// Unit tests for auth.service.ts
describe('authService.verifyCredentials', () => {
  it('returns user if credentials valid', async () => {
    // Setup: hash known password
    // Call: verifyCredentials(email, plainPassword)
    // Assert: returned user matches database record
  });
  
  it('throws error if password incorrect', async () => {
    // Setup: user with hashed password
    // Call: verifyCredentials(email, wrongPassword)
    // Assert: throws AppError with code: "invalid_credentials"
  });
  
  it('returns null if user not found', async () => {
    // Call: verifyCredentials(nonExistentEmail, anyPassword)
    // Assert: throws AppError with same message as wrong password (no enumeration)
  });
});

// Integration tests for POST /api/v1/auth/login
describe('POST /api/v1/auth/login', () => {
  it('returns 200 with valid credentials', async () => {
    // Setup: registered user
    // POST /api/v1/auth/login with correct email + password
    // Assert: 200 OK, user in response, cookies set
  });
  
  it('returns 401 with invalid credentials', async () => {
    // POST /api/v1/auth/login with wrong password
    // Assert: 401 Unauthorized, generic message, no user data
  });
  
  it('returns 400 on validation error', async () => {
    // POST /api/v1/auth/login with missing email
    // Assert: 400 Bad Request, details array with field errors
  });
});

// Frontend tests for login form
describe('LoginForm', () => {
  it('disables submit until valid email + password', () => {
    // Render form
    // Assert: submit button disabled initially
    // Type valid email + password
    // Assert: submit button enabled
  });
  
  it('shows error on 401 response', async () => {
    // Mock fetch to return 401
    // Submit form
    // Assert: error message displayed
  });
});
```

#### Implementation Priority & Dependencies
```
Story 1.2 Implementation Path:
├─ Prerequisite: Story 1.1 Complete (User model + events table exist)
├─ Step 1: Backend - Extend auth.service.ts with verifyCredentials()
├─ Step 2: Backend - Create POST /api/v1/auth/login endpoint
├─ Step 3: Backend - Create GET /api/v1/auth/me endpoint
├─ Step 4: Backend - Create POST /api/v1/auth/refresh endpoint
├─ Step 5: Frontend - Create LoginForm component
├─ Step 6: Frontend - Extend authApi.ts with login + refresh functions
├─ Step 7: Frontend - Add login + logout + refresh actions to authSlice
├─ Step 8: Frontend - Add authentication guards + redirect logic
└─ Step 9: Testing + Integration

Blocking Dependencies:
- Prisma schema must have users table (Story 1.1)
- Cookie-parser middleware configured (Story 1.1)
- Zustand store initialized (Story 1.1)
- Express server running (Story 1.0)

Non-Blocking (Can do in parallel):
- Rate-limiting middleware (add later if needed)
- Brute-force detection (add later if needed)
- Session tracking (add later if needed)
```

#### Common Mistakes to Avoid

**❌ Mistake #1: Using == instead of bcrypt.compare()**
```typescript
// WRONG: Timing attack vulnerability
if (inputPassword === hashedPassword) { /* match */ }

// RIGHT: Use bcrypt.compare()
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**❌ Mistake #2: Exposing User Existence**
```typescript
// WRONG: Different errors for different failure reasons
if (!user) { throw new Error('User not found'); }
if (!passwordMatch) { throw new Error('Password incorrect'); }

// RIGHT: Same generic error for both
throw new AppError('invalid_credentials', 'Invalid email or password');
```

**❌ Mistake #3: Storing Tokens in localStorage**
```typescript
// WRONG: XSS vulnerability
localStorage.setItem('accessToken', token);

// RIGHT: Use HTTP-only cookies (set by backend)
// Frontend never sees the token in JavaScript
```

**❌ Mistake #4: Logging Credentials**
```typescript
// WRONG: Password in logs
logger.info(`User login attempt: ${email} / ${password}`);

// RIGHT: Log only non-sensitive info
logger.info(`User login attempt: email=${email}, requestId=${req.id}`);
```

**❌ Mistake #5: Not Handling Refresh Token Expiry**
```typescript
// WRONG: Ignore refresh token failure
const newToken = await refreshToken(); // Silently fails?

// RIGHT: Handle refresh failure gracefully
try {
  const newToken = await refreshToken();
} catch (err) {
  // Redirect to login if refresh fails
  window.location.href = '/login';
}
```

---

## Tasks / Subtasks

### Task 1: Backend - Extend Auth Service (AC1, AC2)
- [x] Extend `services/auth.service.ts` with `verifyCredentials(email, password)` function:
  - Find user by email in database
  - Use bcrypt.compare() to verify password (timing-safe comparison)
  - Return user object if valid
  - Throw AppError with code "invalid_credentials" if not valid (same message for both cases)
  - Never expose whether user exists or not
- [x] Create `generateRefreshToken(userId)` function:
  - Create JWT with 7-day expiry
  - Include userId in payload
  - Return token string
- [x] Ensure NO passwords or hashed passwords are logged or returned in responses

### Task 2: Backend - Login API Endpoint (AC1, AC2, AC6)
- [x] Create `POST /api/v1/auth/login` endpoint in `routes/auth.routes.ts`
- [x] Create controller `authController.login()` in `controllers/auth.controller.ts`:
  - Validate input with Zod schema (email format, password 8+ chars)
  - Call `authService.verifyCredentials(email, password)`
  - On success: generate access + refresh tokens, set HTTP-only cookies
  - On failure: return 401 with generic error message
  - Return user data (no password, no tokens in response body)
- [x] Add Zod schema `loginSchema` to `schemas/auth.schema.ts`:
  ```typescript
  export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });
  ```
- [x] Handle edge cases:
  - Invalid email format → 400 Bad Request
  - Missing email/password → 400 Bad Request
  - User not found → 401 Unauthorized (same as wrong password)
  - Wrong password → 401 Unauthorized

### Task 3: Backend - Current Session Endpoint (AC3)
- [x] Create `GET /api/v1/auth/me` endpoint in `routes/auth.routes.ts`:
  - Require valid JWT in Authorization header (via middleware)
  - Extract userId from JWT payload
  - Query user from database
  - Return user data (id, name, email, createdAt)
  - Do NOT return password or sensitive fields
- [x] Create middleware `requireAuth` to verify JWT on protected routes:
  - Extract token from Authorization header (Bearer scheme)
  - Verify signature and expiration
  - Attach userId to req.user
  - Return 401 if token invalid/expired

### Task 4: Backend - Refresh Token Endpoint (AC6, AC7)
- [x] Create `POST /api/v1/auth/refresh` endpoint in `routes/auth.routes.ts`:
  - Extract refresh token from HTTP-only cookie
  - Verify refresh token (valid signature, not expired)
  - Generate new access token (1-hour expiry)
  - Optionally generate new refresh token (7-day expiry)
  - Set new tokens in HTTP-only cookies
  - Return success message (tokens already in cookies, not in response body)
- [x] Handle edge cases:
  - Refresh token expired → 401 Unauthorized, redirect frontend to login
  - Refresh token invalid → 401 Unauthorized, redirect frontend to login
  - Multiple simultaneous refresh requests → handle gracefully (no race conditions)

### Task 5: Backend - Logout Endpoint (AC4)
- [x] Create `POST /api/v1/auth/logout` endpoint in `routes/auth.routes.ts`:
  - Require valid JWT (via requireAuth middleware)
  - Clear access token cookie (set maxAge = 0)
  - Clear refresh token cookie (set maxAge = 0)
  - Return success message
- [x] Frontend can then redirect to /login after logout

### Task 6: Backend - Event Logging for Login (AC10)
- [x] Update `authService.verifyCredentials()` to accept IP address parameter
- [x] After successful credential verification, log event:
  ```typescript
  await prisma.event.create({
    data: {
      eventType: 'user.login_success',
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      payload: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIpAddress(req)
      }
    }
  });
  ```
- [x] Do NOT log failed login attempts (prevent audit spam from brute-force)
- [x] Helper function `getClientIpAddress(req)`:
  - Check X-Forwarded-For header first (if behind proxy)
  - Fallback to req.socket.remoteAddress
  - Return IP as string

### Task 7: Backend - Testing (AC1-AC10)
- [x] Unit tests for `authService.verifyCredentials()`:
  - Valid credentials return user
  - Invalid password throws error (code: "invalid_credentials")
  - Non-existent email throws same error (no enumeration)
  - Bcrypt.compare() called with correct parameters
  - No password in return value or error details
- [x] Unit tests for token generation:
  - Access token has 1-hour expiry
  - Refresh token has 7-day expiry
  - Both have userId in payload
- [x] Integration tests for `POST /api/v1/auth/login`:
  - 200 OK with valid credentials (user in response, cookies set)
  - 401 Unauthorized with invalid credentials (generic message, no user data)
  - 400 Bad Request with validation errors (missing email, invalid email, short password)
  - Cookies set correctly (httpOnly, secure, maxAge)
- [x] Integration tests for `GET /api/v1/auth/me`:
  - 200 OK with valid JWT (user data returned)
  - 401 Unauthorized without JWT
  - 401 Unauthorized with expired JWT
- [x] Integration tests for `POST /api/v1/auth/refresh`:
  - 200 OK with valid refresh token (new tokens set)
  - 401 Unauthorized with expired refresh token
  - 401 Unauthorized with invalid refresh token
- [x] Integration tests for `POST /api/v1/auth/logout`:
  - 200 OK (cookies cleared)
  - 401 Unauthorized if not authenticated

### Task 8: Frontend - Login Form Component (AC1, AC2)
- [x] Create `features/auth/components/LoginForm.tsx`:
  - Form fields: email (email type), password (password type)
  - Real-time validation (on blur): email format, password length
  - Submit button disabled until both fields valid
  - Loading state during submission (button shows spinner)
  - Displays inline error messages below each field
  - On duplicate/non-existent email, show generic message
- [x] Styling with TailwindCSS:
  - Match design system from Story 1.1 (consistent look & feel)
  - Error messages in red text
  - Loading spinner in button
  - Accessible form labels (ARIA)
- [x] Handle 401 response:
  - Show generic error: "Invalid email or password"
  - Do NOT show field-specific errors
  - Do NOT clear form (user can try again)

### Task 9: Frontend - API Client Extension (AC6)
- [x] Extend `features/auth/api/authApi.ts` with:
  - `loginUser(email, password)`: POST to `/api/v1/auth/login`, returns user + requestId
  - `getCurrentUser()`: GET to `/api/v1/auth/me`, returns user + requestId
  - `refreshAccessToken()`: POST to `/api/v1/auth/refresh`, handles silent refresh
  - `logoutUser()`: POST to `/api/v1/auth/logout`
- [x] Implement request/response interceptor:
  - All requests include requestId in header
  - On 401 response: automatically call `refreshAccessToken()`
  - Retry original request with new token
  - If refresh fails: redirect to /login
- [x] Handle errors gracefully:
  - Network errors: show "Connection failed. Please retry."
  - Server errors: show "Something went wrong. Please try again."
  - Credential errors: show generic message (from AC2)

### Task 10: Frontend - Zustand State Extension (AC3, AC4)
- [x] Extend `features/auth/state/authSlice.ts` with:
  - `login(email, password)`: action that calls authApi.loginUser()
  - `logout()`: action that clears state and calls authApi.logoutUser()
  - `refreshSession()`: action that silently calls authApi.refreshAccessToken()
  - `setCurrentUser(user)`: action to update user from /auth/me endpoint
  - `reset()`: action to clear all auth state (on logout, session expiry)
- [x] State structure:
  ```typescript
  interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    lastRefreshTime?: number; // Track when refresh was last called
  }
  ```
- [x] Persistence:
  - Save `user` + `isAuthenticated` to localStorage
  - Restore on page load (hydrate state)
  - Clear on logout or token expiry

### Task 11: Frontend - Route Protection & Navigation (AC4, AC8)
- [x] Create `ProtectedRoute` component (or HOC):
  - Requires valid JWT + isAuthenticated = true
  - If not authenticated: redirect to /login
  - Show loading state while checking authentication
- [x] Update routing:
  - `/login` - LoginForm component
  - `/teams` - Protected route (Teams view)
  - If already logged in at /login: redirect to /teams
  - If logged out at /teams: redirect to /login
- [x] Add logout functionality:
  - Logout button in navigation/header
  - On click: call `authSlice.logout()`
  - Redirects to /login automatically
- [x] Session persistence:
  - On page load: check localStorage for isAuthenticated
  - If true: call `/api/v1/auth/me` to validate session
  - If 401: clear state, redirect to /login (invalid/expired session)

### Task 12: Frontend - Testing (AC1-AC9)
- [x] Unit tests for `authSlice`:
  - `login()` calls authApi.loginUser()
  - `logout()` clears state and calls authApi.logoutUser()
  - `refreshSession()` calls authApi.refreshAccessToken()
  - State persists to localStorage on update
  - State resets on logout
- [x] Component tests for `LoginForm`:
  - Email validation shows error on invalid format
  - Password validation shows error on < 8 chars
  - Submit button disabled until valid
  - Successful login redirects to /teams
  - Failed login shows generic error message
  - Form not cleared on error (user can retry)
- [x] Integration tests:
  - End-to-end: login → /teams → page refresh → still authenticated
  - End-to-end: logout → /login (no auth token)
  - Session expiry: access token expires → auto-refresh → no user interruption
  - Invalid refresh → redirect to login
- [x] Manual testing in browser:
  - Login with valid credentials → redirected to Teams
  - Login with wrong password → error shown
  - Logout → redirected to Login
  - Refresh page while logged in → still logged in
  - Access /teams without login → redirected to /login

### Task 13: Security & Audit (AC7, AC9)
- [x] Verify no credentials in logs:
  - Check server console logs → no passwords or tokens visible
  - Check error messages → no sensitive information exposed
  - Check event payloads → no passwords or hashed passwords
- [x] Verify IP address captured correctly:
  - Simulate request from different IP
  - Check events table → ipAddress populated
  - Handle proxy headers (X-Forwarded-For) correctly
- [x] Verify bcrypt comparison is timing-safe:
  - Confirm bcrypt.compare() used (not === comparison)
  - No custom password verification logic
- [x] Verify secure cookie flags:
  - httpOnly: true (JavaScript can't access)
  - secure: true (HTTPS only in production)
  - sameSite: 'strict' (CSRF protection)
  - maxAge correct (1h for access, 7d for refresh)

---

## Dev Notes

### Critical Architecture Context (Continued from Story 1.1)

#### Team Isolation Enforcement (Prerequisite Understanding)
**IMPORTANT:** This story implements user-level authentication. Team isolation is enforced at team-scoped endpoints (Story 1.3+). Key principle:
- User can belong to 0 or more teams
- Each team has separate database instance (per-tenant architecture)
- After login, user can see all teams they belong to
- Access to team-specific endpoints (issues, practices, etc.) verified by `teamId` in JWT + middleware

**For Story 1.2 Implementation:**
- `/api/v1/auth/login` and `/api/v1/auth/me` are USER-level (not team-scoped)
- JWT payload includes `userId` + `email` (no `teamId` yet)
- Team membership determined in Story 1.3 (Teams List View)

#### Bcrypt Performance Considerations
**Important:** bcrypt.compare() is intentionally slow (for security). In tests with 10 rounds:
- Hash generation: ~100ms per password (Story 1.1 during registration)
- Hash comparison: ~100ms per login attempt (Story 1.2)
- This is expected and correct (slows down brute-force attacks)

**Implication:** Login endpoint will have slight perceived latency (~200ms network + ~100ms bcrypt). This is acceptable for MVP.

#### Cookie Security in Development vs Production
**Local Development (.env):**
```bash
NODE_ENV=development
# Cookies set with secure: false (allows HTTP localhost testing)
```

**Production (.env in container):**
```bash
NODE_ENV=production
# Cookies set with secure: true (HTTPS required)
```

**Frontend must request with credentials:**
```typescript
fetch('/api/v1/auth/login', {
  credentials: 'include' // CRITICAL: attach cookies to cross-origin requests
})
```

#### Rate Limiting (Out of Scope for Story 1.2)
Rate-limiting middleware NOT implemented in this story (acceptable for MVP). Post-MVP considerations:
- Implement max 5 login attempts per email per 15 minutes
- Lock account after 10 failed attempts
- Send notification email on suspicious activity
- These are enhancements, not critical for MVP delivery

---

## Implementation Sequence (Critical Path)

**Day 1 Morning: Backend Service Layer**
1. Implement `authService.verifyCredentials()` with bcrypt.compare()
2. Create `generateRefreshToken()` function
3. Add unit tests for both functions (bcrypt, token generation)

**Day 1 Afternoon: Backend API Endpoints**
1. Create POST `/api/v1/auth/login` endpoint with Zod validation
2. Create GET `/api/v1/auth/me` endpoint with requireAuth middleware
3. Create POST `/api/v1/auth/refresh` endpoint
4. Create POST `/api/v1/auth/logout` endpoint
5. Test with Postman/curl

**Day 2 Morning: Frontend Components**
1. Create `LoginForm` component with validation
2. Implement `authApi.loginUser()` fetch function
3. Add interceptor logic for auto-refresh

**Day 2 Afternoon: Frontend State & Routing**
1. Extend `authSlice.ts` with `login()`, `logout()`, `refreshSession()` actions
2. Create `ProtectedRoute` component
3. Update routing (/login, /teams protection)
4. Add logout button to header

**Day 3 Morning: Testing**
1. Backend integration tests (login, refresh, logout)
2. Frontend component tests (LoginForm)
3. End-to-end integration tests

**Day 3 Afternoon: Polish & Security**
1. Verify no credentials in logs
2. Test bcrypt timing-safety
3. Test cookie flags (httpOnly, secure, sameSite)
4. Final code review

**Total Estimated:** 2.5 days (leaves 0.5 day buffer)

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| User enumeration (different errors for found vs wrong password) | MEDIUM - Security | Use same generic error for both cases; verify in tests |
| Bcrypt comparison using === instead of .compare() | CRITICAL - Security | Code review + linting rule (must use bcrypt.compare) |
| JWT token leaked in logs | CRITICAL - Security | Redact Auth header in logging middleware |
| Session fixation (allow multiple simultaneous logins) | LOW for MVP - UX | Acceptable for MVP (no login limit); document for post-MVP |
| Refresh token not handled on frontend | HIGH - User Experience | Implement interceptor to auto-refresh; test thoroughly |
| Cookie not sent on cross-origin | HIGH - Won't Work | Ensure credentials: 'include' in fetch; test in browser; changed sameSite to 'lax' |
| Bcrypt performance (slow hash/compare) | LOW - Performance | Expected behavior; document 100ms latency in login |
| DOS risk from bcrypt blocking | MEDIUM - Security | No rate-limiting in MVP (acceptable); add post-MVP |

---

## Testing Checklist

**Backend Tests (MUST PASS):**
- [ ] `authService.verifyCredentials()` returns user with valid credentials
- [ ] `authService.verifyCredentials()` throws error with wrong password
- [ ] `authService.verifyCredentials()` throws same error for non-existent user (no enumeration)
- [ ] Bcrypt.compare() called with correct parameters (timing-safe)
- [ ] POST `/api/v1/auth/login` returns 200 with valid credentials
- [ ] POST `/api/v1/auth/login` returns 401 with invalid credentials (generic message)
- [ ] POST `/api/v1/auth/login` returns 400 with validation errors
- [ ] Cookies set with httpOnly, secure, sameSite, maxAge correct
- [ ] GET `/api/v1/auth/me` returns user data with valid JWT
- [ ] GET `/api/v1/auth/me` returns 401 without JWT
- [ ] POST `/api/v1/auth/refresh` issues new access token with valid refresh token
- [ ] POST `/api/v1/auth/refresh` returns 401 with expired refresh token
- [ ] POST `/api/v1/auth/logout` clears cookies
- [ ] Event logged for successful login (in events table)
- [ ] No passwords or tokens logged in console

**Frontend Tests (MUST PASS):**
- [ ] Email validation shows error on invalid format
- [ ] Password validation shows error on < 8 chars
- [ ] Submit button disabled until form valid
- [ ] Successful login redirects to /teams
- [ ] Error message displayed on 401 response
- [ ] Form not cleared on error (user can retry)
- [ ] Logout button clears auth state and redirects to /login
- [ ] ProtectedRoute redirects to /login when not authenticated
- [ ] Page refresh while logged in preserves auth state
- [ ] Expired access token triggers auto-refresh

**Integration Tests (MUST PASS):**
- [ ] End-to-end: signup (1.1) → login (1.2) → authenticated
- [ ] End-to-end: logout → /login required
- [ ] End-to-end: token refresh → seamless continuation

---

## References

- **Project Context:** [project-context.md](../../_bmad-output/project-context.md)
  - Section 1: Technology Stack & Version Constraints
  - Section 5: Security Requirements (NFR1-4)
  - Section 2: Language-Specific Rules (TypeScript)
- **Architecture:** [architecture.md](../../_bmad-output/planning-artifacts/architecture.md)
  - ADR: Authentication & JWT
  - ADR: Event Logging
  - Error Handling Patterns
  - API Contract & Structured Errors
- **Epics & Stories:** [epics.md](../../_bmad-output/planning-artifacts/epics.md)
  - Epic 1: Authentication & Team Onboarding
  - Story 1.1: User Registration (predecessor)
  - Story 1.2: User Login (this story)
- **PRD:** [prd.md](../../_bmad-output/planning-artifacts/prd.md)
  - FR1-2: User management
  - NFR1-4: Security requirements
- **Previous Story Implementation:** [1-1-user-registration-with-email-validation.md](./1-1-user-registration-with-email-validation.md)
  - Dev notes on bcrypt, JWT, Prisma, Zustand patterns
  - Testing structure and examples

---

## Anti-Patterns to Avoid

❌ **DON'T:**
- Use === to compare passwords with hashes (timing attack)
- Return different error messages for "user not found" vs "wrong password" (enumeration attack)
- Store JWT tokens in localStorage (XSS vulnerability)
- Log passwords, tokens, or hashed passwords
- Use template literals in SQL queries (SQL injection)
- Set cookies without httpOnly flag
- Implement custom password comparison logic (use bcrypt.compare)
- Forget to validate refresh token expiry
- Clear auth state without clearing cookies
- Allow infinite login attempts (add rate-limiting post-MVP)

✅ **DO:**
- Use bcrypt.compare() for timing-safe password verification
- Use generic error message for all credential failures
- Store JWT in HTTP-only secure cookies (backend sets)
- Log only non-sensitive info: timestamp, endpoint, status, requestId, userId
- Use Prisma ORM for all database queries
- Set cookies with httpOnly: true, secure: true (prod), sameSite: 'strict'
- Call bcrypt.compare() for every password verification
- Check refresh token expiry before issuing new token
- Clear cookies on logout (set maxAge = 0)
- Implement rate-limiting for login attempts (future task)

---

## Completion Status

**Story Status:** ✅ ready-for-dev (Ultimate context engine analysis completed)

**Developer Preparation:** All context, requirements, architecture constraints, and security considerations documented for flawless implementation.

**Next Steps:**
1. Implement backend layer (auth service, endpoints, event logging)
2. Implement frontend layer (LoginForm, authApi, authSlice)
3. Execute testing checklist
4. Code review against all acceptance criteria
5. Transition to Story 1.3: Teams List View with Multi-Team Support

---

**Created:** 2026-01-19  
**Story ID:** 1.2  
**Epic:** 1 - Authentication & Team Onboarding  
**Status:** ready-for-dev

---

## Dev Agent Record

### Implementation Plan
- Backend auth: credential verification, login/me/refresh/logout endpoints, auth middleware, login audit event.
- Frontend auth: login form, auth API client with refresh/retry, auth store actions, protected routing, logout UI.
- Tests: backend unit/integration and frontend unit/component/integration.

### Tests Run
- server: npm test
- client: npm test

### Completion Notes
- Implemented login flow with JWT cookies, current session endpoint, refresh/logout, and login success event logging with IP capture.
- Added client-side login UX with validation, spinner, and generic credential errors.
- Added auth API request wrapper with requestId, auto-refresh, and retry-on-401.
- Added Zustand auth actions, protected routing, and session validation on load.
- Added Vitest setup and frontend tests for auth slice, login form, and app auth flow.
- Manual browser testing completed: login flow, logout, session persistence, refresh token handling all verified working.
- **Code review fixes (2026-01-19):**
  - Changed cookie `sameSite` from `'strict'` to `'lax'` for cross-origin support
  - Fixed seamless refresh: removed `window.location.href` redirect, now throws error for React Router to handle
  - Improved IP address logging: normalizes IPv6 localhost, added X-Forwarded-For test
  - Added race condition test for simultaneous refresh token requests
  - Improved error messages for network failures (distinguishes connection errors)
  - Fixed TypeScript config to include Jest types (removes linting errors in tests)
  - Enhanced session expiry message handling with proper error display

## File List
- server/src/services/auth.service.ts
- server/src/services/__tests__/auth.service.test.ts
- server/src/controllers/auth.controller.ts
- server/src/routes/auth.routes.ts
- server/src/routes/__tests__/auth.routes.test.ts
- server/src/schemas/auth.schema.ts
- server/src/middleware/requireAuth.ts
- server/tsconfig.json
- client/src/features/auth/api/authApi.ts
- client/src/features/auth/api/authApi.test.ts
- client/src/features/auth/state/authSlice.ts
- client/src/features/auth/components/LoginForm.tsx
- client/src/features/auth/components/ProtectedRoute.tsx
- client/src/features/auth/components/LoginForm.test.tsx
- client/src/features/auth/state/authSlice.test.ts
- client/src/App.tsx
- client/src/App.test.tsx
- client/vite.config.ts
- client/src/setupTests.ts
- client/package.json
- client/package-lock.json
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/1-2-user-login-with-session-management.md

## Change Log
- 2026-01-19: Implemented auth login flow (backend + frontend), refresh/logout, protected routing, and tests. Manual browser testing completed successfully.
- 2026-01-19: Code review fixes - seamless refresh, cookie settings, IP logging, race condition tests, error handling, TypeScript config.
