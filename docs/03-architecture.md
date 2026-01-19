# Architecture

**As-Built System Architecture for AAPR Platform**

Last Updated: January 19, 2026  
Current State: Epic 1 Complete

---

## System Overview

The AAPR platform is a **research-grade web application** built with a **client-server architecture**:

- **Frontend:** Single-Page Application (SPA) using React 18.2 + TypeScript
- **Backend:** RESTful API using Express + Node.js + TypeScript
- **Database:** PostgreSQL 14+ (single normalized schema)
- **Authentication:** JWT-based with HTTP-only cookies
- **Email:** SMTP integration for invitations

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite Dev Server / Static Build)           │  │
│  │  - React Router (client-side routing)                 │  │
│  │  - Zustand (state management)                         │  │
│  │  - TailwindCSS (styling)                              │  │
│  └────────────────┬────────────────────────────────────────┘  │
│                   │ HTTP/HTTPS (fetch API)                    │
└───────────────────┼───────────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────────┐
│                    Express Server (Node.js)                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Middleware Stack:                                       │ │
│  │  - requestIdMiddleware (inject X-Request-Id)           │ │
│  │  - corsMiddleware (cross-origin requests)              │ │
│  │  - jsonBodyParser (parse JSON body)                    │ │
│  │  - cookieParser (JWT token extraction)                 │ │
│  │  - requireAuth (protect routes, verify JWT)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Layered Architecture:                                   │ │
│  │  Routes → Controllers → Services → Repositories         │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────────────────────────────┘
                     │ Prisma ORM (parameterized queries)
┌────────────────────▼──────────────────────────────────────────┐
│                   PostgreSQL 14+                              │
│  - Normalized schema (3NF)                                    │
│  - ACID transactions                                          │
│  - Indexes on foreign keys + query patterns                  │
└───────────────────────────────────────────────────────────────┘
```

---

## Architecture Decisions (ADRs)

### ADR-001: Feature-First Frontend Architecture

**Context:** Need to organize frontend code for scalability as features grow.

**Decision:** Organize by feature (`/features/auth`, `/features/teams`) rather than by type (`/components`, `/services`).

**Structure:**
```
src/features/
├── auth/
│   ├── components/    # Feature-specific components
│   ├── api/          # API client functions
│   ├── state/        # Zustand state slices
│   └── __tests__/    # Feature tests
└── teams/
    ├── components/
    ├── api/
    ├── state/
    └── __tests__/
```

**Rationale:**
- Better encapsulation (all auth code in one place)
- Easier to find related code
- Scales better as features grow
- Clear feature boundaries

**Consequences:**
- Shared components go in `/src/common/components`
- Cross-feature imports allowed but discouraged
- Each feature can have its own state slice

**Status:** ✅ Implemented in Epic 1

---

### ADR-002: Layered Backend Architecture

**Context:** Need separation of concerns for testability and maintainability.

**Decision:** Strict layered architecture with no layer skipping.

**Layers:**
```
┌─────────────────────────────────────────────┐
│  Routes (auth.routes.ts, teams.routes.ts)  │  # Express routing
│  - Route registration                       │
│  - Middleware application                   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Controllers (*. controller.ts)             │  # HTTP layer
│  - Request validation (Zod schemas)         │
│  - Response formatting                      │
│  - Error handling                           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Services (*.service.ts)                    │  # Business logic
│  - Domain logic                             │
│  - Transaction orchestration                │
│  - NO database queries directly             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Repositories (*.repository.ts)             │  # Data access
│  - Prisma queries ONLY                      │
│  - NO business logic                        │
│  - NO conditionals (except query building)  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Prisma Client → PostgreSQL                 │  # Database
└─────────────────────────────────────────────┘
```

**Rules:**
- **Controllers:** Thin, delegate to services, format responses
- **Services:** Business logic, transaction wrappers, call repositories
- **Repositories:** Data access ONLY, Prisma queries, no branching

**Example:**
```typescript
// ❌ WRONG - controller has business logic
export const register = async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({ data: { ...req.body, password: hashedPassword } });
  res.json(user);
};

// ✅ CORRECT - controller delegates to service
export const register = async (req, res) => {
  const validated = registerSchema.parse(req.body);
  const user = await authService.registerUser(validated);
  res.status(201).json({ user, requestId: req.id });
};
```

**Rationale:**
- Clear separation of concerns
- Testability (each layer independently testable)
- Business logic isolated from HTTP and database
- Prevents spaghetti code

**Status:** ✅ Implemented in Epic 1

---

### ADR-003: JWT in HTTP-Only Cookies

**Context:** Need secure token storage to prevent XSS attacks.

**Decision:** Store JWT access and refresh tokens in HTTP-only secure cookies, NOT localStorage.

**Implementation:**
```typescript
// Backend sets cookies
res.cookie('accessToken', token, {
  httpOnly: true,           // JavaScript cannot access
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',          // CSRF protection
  maxAge: 3600000           // 1 hour
});

// Frontend includes credentials in fetch
fetch('/api/v1/auth/login', {
  credentials: 'include'    // Attach cookies
});
```

**Security Properties:**
- ✅ XSS Protection: JavaScript cannot read tokens
- ✅ HTTPS Only: Tokens only sent over encrypted connections (production)
- ✅ CSRF Protection: `sameSite: 'lax'` prevents cross-site requests
- ✅ Auto-refresh: Frontend can request new tokens transparently

**Trade-offs:**
- ❌ More complex refresh flow (but we implemented auto-refresh)
- ❌ Requires HTTPS in production (but this is best practice anyway)
- ✅ Much better security than localStorage

**Alternative Considered:** localStorage + Authorization header
- **Rejected:** Vulnerable to XSS attacks

**Status:** ✅ Implemented in Epic 1

---

### ADR-004: Event Logging for Research

**Context:** PhD research requires complete, verifiable audit trail of all actions.

**Decision:** Log all database-affecting actions to immutable `events` table.

**Event Schema:**
```typescript
interface Event {
  id: bigint;                    // Auto-increment
  eventType: string;             // "user.registered", "team.created"
  actorId: number | null;        // User who triggered (null for system)
  teamId: number | null;         // Team context (null for user-level)
  entityType: string | null;     // "user", "team", "practice"
  entityId: number | null;       // Entity affected
  action: string | null;         // "created", "updated", "deleted"
  payload: object | null;        // Event-specific data
  schemaVersion: string;         // "v1" (for schema evolution)
  createdAt: Date;               // Timestamp (immutable)
}
```

**Transaction Atomicity:**
```typescript
// ✅ CORRECT - event log in same transaction
await prisma.$transaction(async (tx) => {
  const team = await tx.team.create({ data: { name } });
  await tx.teamMember.create({ data: { teamId: team.id, userId, role: 'owner' } });
  await tx.event.create({ 
    data: { 
      eventType: 'team.created', 
      actorId: userId,
      teamId: team.id,
      entityType: 'team',
      entityId: team.id,
      action: 'created',
      payload: { name, practiceCount: practices.length }
    } 
  });
  return team;
});

// ❌ WRONG - event log outside transaction (can lose events)
const team = await prisma.team.create({ data: { name } });
await prisma.event.create({ ... });  // NOT atomic
```

**Research Requirements:**
- ✅ **Immutability:** Append-only, no updates/deletes (except batch purge)
- ✅ **Completeness:** Every mutation logged
- ✅ **Atomicity:** Event log in same transaction as mutation
- ✅ **Verifiability:** Audit trail can reconstruct entire system state

**Event Types (Epic 1):**
- `project.initialized`
- `user.registered`
- `user.login_success`
- `team.created`
- `team_member.added`
- `team_member.removed`
- `invite.created`
- `invite.auto_resolved`
- `invite.email_failed`

**Status:** ✅ Implemented in Epic 1

---

### ADR-005: Team Isolation via Application Layer

**Context:** Research requires per-team data isolation for privacy and compliance.

**Decision:** Single database with application-layer enforcement of team boundaries.

**Implementation:**
```typescript
// ✅ CORRECT - team isolation middleware
export const requireTeamMembership = async (req, res, next) => {
  const { teamId } = req.params;
  const userId = req.user.id;
  
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: parseInt(teamId), userId } }
  });
  
  if (!membership) {
    return res.status(403).json({ 
      code: 'forbidden', 
      message: 'Not a member of this team' 
    });
  }
  
  req.teamId = parseInt(teamId);
  next();
};

// All team-scoped routes protected
router.get('/api/v1/teams/:teamId/practices', requireAuth, requireTeamMembership, getTeamPractices);
```

**Alternative Considered:** Separate database per team
- **Rejected:** Complexity, harder to aggregate research data, operational overhead

**Security Properties:**
- ✅ Users can only access teams they belong to
- ✅ Enforced at middleware level (cannot be bypassed)
- ✅ Team ID always part of query filter

**Status:** ✅ Implemented in Epic 1

---

### ADR-006: Prisma ORM (No Raw SQL)

**Context:** Need SQL injection prevention and type safety.

**Decision:** ALL database queries via Prisma ORM, NO raw SQL.

**Benefits:**
- ✅ **SQL Injection Prevention:** Parameterized queries by default
- ✅ **Type Safety:** Generated TypeScript types from schema
- ✅ **Migration Management:** Version-controlled schema changes
- ✅ **Query Builder:** Composable, testable queries

**Rules:**
- ❌ **NEVER** use `prisma.$queryRaw()` or `prisma.$executeRaw()`
- ✅ **ALWAYS** use Prisma's query API
- ❌ **NEVER** string interpolation in queries
- ✅ **ALWAYS** use `where` clauses for filtering

**Example:**
```typescript
// ❌ WRONG - SQL injection vulnerability
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ✅ CORRECT - Prisma parameterizes automatically
const user = await prisma.user.findUnique({ where: { email } });
```

**Status:** ✅ Implemented in Epic 1

---

### ADR-007: Bcrypt 10+ Rounds for Password Hashing

**Context:** Need secure password storage to prevent credential theft.

**Decision:** Use bcrypt with minimum 10 rounds for all password hashing.

**Implementation:**
```typescript
// Registration
const hashedPassword = await bcrypt.hash(password, 10);  // 10 rounds minimum

// Login verification
const isValid = await bcrypt.compare(inputPassword, hashedPassword);  // Timing-safe
```

**Security Properties:**
- ✅ **Adaptive:** Can increase rounds as hardware improves
- ✅ **Salted:** Each hash has unique salt (prevents rainbow tables)
- ✅ **Timing-safe:** `bcrypt.compare()` prevents timing attacks
- ✅ **Industry standard:** OWASP recommended

**Performance:**
- ~100ms per hash/compare (intentionally slow to prevent brute-force)
- Acceptable latency for authentication endpoints

**Alternative Considered:** Argon2
- **Rejected:** Bcrypt more established, library maturity

**Status:** ✅ Implemented in Epic 1

---

### ADR-008: Structured Error Responses

**Context:** Need consistent, machine-readable error format for frontend and research.

**Decision:** All API errors return structured JSON with `code`, `message`, `details`, `requestId`.

**Error Format:**
```typescript
interface ApiError {
  code: string;          // Machine-readable (e.g., "invalid_credentials")
  message: string;       // Human-readable (e.g., "Invalid email or password")
  details?: object;      // Optional field-specific details
  requestId: string;     // Correlation ID for debugging
}
```

**Examples:**
```json
// 401 Unauthorized
{
  "code": "invalid_credentials",
  "message": "Invalid email or password",
  "requestId": "req-abc123"
}

// 400 Bad Request (validation)
{
  "code": "validation_error",
  "message": "Invalid input",
  "details": {
    "errors": [
      { "path": "email", "message": "Invalid email format", "code": "invalid_format" },
      { "path": "password", "message": "Must be at least 8 characters", "code": "too_short" }
    ]
  },
  "requestId": "req-def456"
}

// 409 Conflict
{
  "code": "email_exists",
  "message": "Email already registered",
  "details": { "field": "email" },
  "requestId": "req-ghi789"
}
```

**Benefits:**
- ✅ Frontend can handle errors programmatically (no string parsing)
- ✅ Consistent error handling across all endpoints
- ✅ Request ID enables log correlation
- ✅ Research can analyze error patterns

**Status:** ✅ Implemented in Epic 1

---

### ADR-009: Zustand for State Management

**Context:** Need lightweight, TypeScript-friendly state management.

**Decision:** Use Zustand 4.4+ for frontend state, one slice per feature.

**Structure:**
```typescript
// features/auth/state/authSlice.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login(email: string, password: string): Promise<void>;
  logout(): void;
  reset(): void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authApi.loginUser(email, password);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ error: err.message, isLoading: false });
        }
      },
      
      logout: () => {
        authApi.logoutUser();
        set({ user: null, isAuthenticated: false });
      },
      
      reset: () => set({ user: null, isAuthenticated: false, error: null })
    }),
    { name: 'auth-storage' }
  )
);
```

**Alternative Considered:** Redux Toolkit
- **Rejected:** More boilerplate, less TypeScript-friendly

**Benefits:**
- ✅ Minimal boilerplate
- ✅ Excellent TypeScript support
- ✅ Built-in persistence (localStorage)
- ✅ No provider hell
- ✅ Easy to test

**Status:** ✅ Implemented in Epic 1

---

## Security Architecture

### Authentication Flow

```
1. User Registration:
   ┌──────┐     POST /auth/register      ┌────────┐
   │Client│──────────────────────────────>│Backend │
   └──────┘  {name, email, password}      └────────┘
                                               │
                                               ▼
                                          bcrypt.hash(password, 10)
                                               │
                                               ▼
                                          Create user + log event (transaction)
                                               │
                                               ▼
                                          Generate access + refresh tokens
                                               │
                                               ▼
   ┌──────┐  Set HTTP-only cookies       ┌────────┐
   │Client│<──────────────────────────────│Backend │
   └──────┘  {user, requestId}            └────────┘
      │
      ▼
   Redirect to /teams

2. User Login:
   ┌──────┐     POST /auth/login          ┌────────┐
   │Client│──────────────────────────────>│Backend │
   └──────┘  {email, password}            └────────┘
                                               │
                                               ▼
                                          Find user by email
                                               │
                                               ▼
                                          bcrypt.compare(password, hash)
                                               │
                                               ▼
                                          Log event (login_success)
                                               │
                                               ▼
                                          Generate access + refresh tokens
                                               │
                                               ▼
   ┌──────┐  Set HTTP-only cookies       ┌────────┐
   │Client│<──────────────────────────────│Backend │
   └──────┘  {user, requestId}            └────────┘
      │
      ▼
   Redirect to /teams

3. Protected Request:
   ┌──────┐  GET /teams (credentials)    ┌────────┐
   │Client│──────────────────────────────>│Backend │
   └──────┘  Cookie: accessToken=...      └────────┘
                                               │
                                               ▼
                                          requireAuth middleware
                                               │
                                               ▼
                                          Verify JWT signature & expiry
                                               │
                                               ├─> Invalid: 401 Unauthorized
                                               │
                                               ├─> Expired: 401 Unauthorized
                                               │   (Frontend auto-refreshes)
                                               │
                                               └─> Valid: Extract userId
                                                       │
                                                       ▼
                                                  Attach to req.user
                                                       │
                                                       ▼
                                                  Continue to handler

4. Token Refresh:
   ┌──────┐  POST /auth/refresh           ┌────────┐
   │Client│──────────────────────────────>│Backend │
   └──────┘  Cookie: refreshToken=...     └────────┘
                                               │
                                               ▼
                                          Verify refresh token
                                               │
                                               ├─> Invalid: 401 (redirect to login)
                                               │
                                               └─> Valid: Generate new access token
                                                       │
                                                       ▼
   ┌──────┐  Set new accessToken cookie  ┌────────┐
   │Client│<──────────────────────────────│Backend │
   └──────┘  {requestId}                  └────────┘
      │
      ▼
   Retry original request
```

### Security Checklist (Epic 1)

- ✅ Passwords bcrypt-hashed (10+ rounds)
- ✅ JWT tokens in HTTP-only cookies
- ✅ HTTPS enforced in production (`secure: true`)
- ✅ CORS configured (frontend origin only)
- ✅ CSRF protection (`sameSite: 'lax'`)
- ✅ SQL injection prevented (Prisma ORM)
- ✅ Input validation (Zod schemas)
- ✅ Team isolation (middleware enforcement)
- ✅ No credentials in logs
- ✅ Structured error messages (no information leakage)

**Not Yet Implemented (Post-MVP):**
- ⚠️ Rate limiting on login endpoint
- ⚠️ Account lockout after N failed attempts
- ⚠️ Password reset flow
- ⚠️ Email verification on signup
- ⚠️ 2FA/MFA

---

## Data Flow Patterns

### Create Team Flow (Transaction Example)

```typescript
// Controller validates & delegates
export const createTeam = async (req, res) => {
  const validated = createTeamSchema.parse(req.body);
  const team = await teamsService.createTeam(req.user.id, validated);
  res.status(201).json({ team, requestId: req.id });
};

// Service orchestrates transaction
export const createTeam = async (userId, { name, practiceIds }) => {
  // Pre-validation (outside transaction for speed)
  await validateTeamName(name);
  await validatePracticeIds(practiceIds);
  
  // Transaction: team + member + practices + event
  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await teamsRepository.createTeam(tx, { name });
    await membersRepository.addMember(tx, { teamId: newTeam.id, userId, role: 'owner' });
    await practicesRepository.addPracticesToTeam(tx, { teamId: newTeam.id, practiceIds });
    await eventsRepository.logEvent(tx, {
      eventType: 'team.created',
      actorId: userId,
      teamId: newTeam.id,
      entityType: 'team',
      entityId: newTeam.id,
      action: 'created',
      payload: { name, practiceCount: practiceIds.length }
    });
    return newTeam;
  });
  
  // Calculate coverage after transaction
  const coverage = await calculateTeamCoverage(team.id);
  return { ...team, coverage };
};

// Repository does DB work only
export const createTeam = async (tx, data) => {
  return tx.team.create({ data });
};
```

**Key Patterns:**
- ✅ Pre-validation outside transaction (faster error response)
- ✅ Transaction groups related mutations
- ✅ Event logging inside transaction (atomic)
- ✅ Post-processing after transaction (coverage calculation)

---

## Next Steps

**For Epic 2:**
- Update this document with practice catalog architecture
- Document coverage calculation algorithm
- Add search/filter architecture patterns

**Last Updated:** January 19, 2026
