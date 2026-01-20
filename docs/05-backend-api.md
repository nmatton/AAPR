# Backend API

**Backend API Reference for AAPR Platform**

Last Updated: January 19, 2026  
Base URL: `http://localhost:3000`  
Stack: Node.js 18+, Express 4.18+, TypeScript 5.2+

---

## Overview

The AAPR backend provides a RESTful API with:
- **Authentication:** JWT in HTTP-only cookies
- **Authorization:** Team-based access control
- **Security:** Input validation, bcrypt password hashing, rate limiting
- **Research Logging:** All actions logged to events table

---

## Authentication Flow

```
1. POST /api/auth/signup → User registers
   ↓
2. POST /api/auth/login → JWT token set in cookie
   ↓
3. Authenticated requests send cookie automatically
   ↓
4. Backend middleware validates JWT and attaches userId to req
   ↓
5. POST /api/auth/logout → Cookie cleared
```

**Cookie Details:**
- Name: `token`
- HTTP-only: `true` (JavaScript cannot access)
- Secure: `false` (dev), `true` (production)
- SameSite: `Lax`
- Max-Age: 24 hours

---

## Endpoints

### Authentication

#### POST /api/auth/signup
Register a new user

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "userId": 1,
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Headers:** Sets `token` cookie with JWT

**Errors:**
- 400: `{ "error": "Email already exists" }`
- 400: `{ "error": "Password must be at least 8 characters" }`
- 500: `{ "error": "Internal server error", "code": "UNKNOWN_ERROR" }`

**Events Logged:**
- `user.registered` (user_id, email)

---

#### POST /api/auth/login
Authenticate an existing user

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "userId": 1,
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Headers:** Sets `token` cookie with JWT

**Errors:**
- 401: `{ "error": "Invalid credentials" }`

**Events Logged:**
- `user.login_success` (user_id)

---

#### POST /api/auth/logout
Clear authentication session

**Request:** No body (requires authenticated cookie)

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Headers:** Clears `token` cookie

---

### Teams

#### GET /api/teams
Get all teams for authenticated user

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Alpha Squad",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "memberCount": 3,
    "pillars_covered": 12,
    "coverage": 63
  },
  {
    "id": 2,
    "name": "Beta Team",
    "createdAt": "2026-01-16T14:00:00.000Z",
    "memberCount": 5,
    "pillars_covered": 8,
    "coverage": 42
  }
]
```

**Coverage Calculation:**
- `pillars_covered` = distinct pillars from team's selected practices
- `coverage` = `(pillars_covered / 19) * 100`

**Errors:**
- 401: `{ "error": "Unauthorized" }` (no cookie)

---

#### POST /api/teams
Create a new team with selected practices

**Authentication:** Required

**Request:**
```json
{
  "name": "Gamma Squad",
  "practices": [1, 5, 12, 18]
}
```

**Validation:**
- `name`: 3-50 characters, required
- `practices`: Array of practice IDs (optional)

**Response (201):**
```json
{
  "id": 3,
  "name": "Gamma Squad",
  "createdAt": "2026-01-19T09:00:00.000Z"
}
```

**Side Effects:**
- User automatically added as team member with `role = 'owner'`
- Practice IDs added to `team_practices`

**Errors:**
- 400: `{ "error": "Team name already exists" }`
- 400: `{ "error": "Invalid practice IDs: [999, 1000]" }`

**Events Logged:**
- `team.created` (team_id, name, actor_id)
- `team_member.added` (team_id, user_id, role)

---

### Team Members

#### GET /api/teams/:teamId/members
Get all members and pending invites for a team

**Authentication:** Required  
**Authorization:** User must be a member of the team

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "joinedAt": "2026-01-15T10:30:00.000Z",
    "status": "Added"
  },
  {
    "id": 2,
    "name": "John Smith",
    "email": "john@example.com",
    "joinedAt": "2026-01-16T11:00:00.000Z",
    "status": "Added"
  },
  {
    "id": null,
    "name": null,
    "email": "alice@example.com",
    "joinedAt": "2026-01-17T09:00:00.000Z",
    "status": "Pending"
  }
]
```

**Status Values:**
- `Added`: User is an active team member
- `Pending`: Invite sent, awaiting signup
- `Failed`: Email delivery failed

**Errors:**
- 401: `{ "error": "Unauthorized" }`
- 403: `{ "error": "Not a team member" }`
- 404: `{ "error": "Team not found" }`

---

#### DELETE /api/teams/:teamId/members/:userId
Remove a user from a team

**Authentication:** Required  
**Authorization:** User must be a member of the team

**Response (200):**
```json
{
  "message": "Member removed successfully"
}
```

**Side Effects:**
- Deletes row from `team_members`
- Does NOT delete user account

**Errors:**
- 403: `{ "error": "Not a team member" }`
- 404: `{ "error": "Member not found in team" }`

**Events Logged:**
- `team_member.removed` (team_id, user_id, actor_id)

---

### Team Invites

#### POST /api/teams/:teamId/invites
Invite users to a team by email

**Authentication:** Required  
**Authorization:** User must be a member of the team

**Request:**
```json
{
  "emails": ["alice@example.com", "bob@example.com"]
}
```

**Validation:**
- `emails`: Array of valid email addresses (1-10 emails)
- Emails must not already be team members

**Response (201):**
```json
{
  "message": "2 invitations sent successfully",
  "results": [
    {
      "email": "alice@example.com",
      "status": "Pending"
    },
    {
      "email": "bob@example.com",
      "status": "Added"
    }
  ]
}
```

**Behavior:**
- **Existing User:** Immediately added to team (status = `Added`)
- **New User:** Invitation email sent (status = `Pending`)
- **Idempotent:** Duplicate emails return existing invite status

**Email Template:**
```
Subject: You've been invited to join [Team Name]

Hi,

You've been invited to join the team "[Team Name]" on AAPR Platform.

Sign up here: http://localhost:5173/signup

If you already have an account, just log in and you'll see the team.

Best,
AAPR Team
```

**Errors:**
- 400: `{ "error": "Invalid email addresses" }`
- 403: `{ "error": "Not a team member" }`
- 500: `{ "error": "Email service unavailable" }`

**Events Logged:**
- `invite.created` (team_id, email, invited_by)
- `invite.auto_resolved` (team_id, email, user_id) - if existing user
- `invite.email_failed` (team_id, email, error_message) - if email fails

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* optional context */ }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input
- `UNAUTHORIZED` - Missing or invalid JWT
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Duplicate resource (e.g., team name)
- `UNKNOWN_ERROR` - Unexpected server error

---

## Middleware

### authMiddleware
**File:** `server/src/middleware/auth.ts`

**Purpose:** Validate JWT and attach `req.userId`

**Flow:**
```typescript
1. Extract token from cookie
2. Verify JWT signature
3. Attach userId to req object
4. Call next()
```

**Errors:**
- 401: Missing token
- 401: Invalid/expired token

---

### teamMembershipMiddleware
**File:** `server/src/middleware/teamMembership.ts`

**Purpose:** Verify user is a member of `:teamId`

**Flow:**
```typescript
1. Extract teamId from params
2. Query team_members for (teamId, userId)
3. If found → call next()
4. If not found → return 403
```

**Errors:**
- 403: User not a team member

---

## Security

### Password Hashing
- **Algorithm:** bcrypt
- **Salt Rounds:** 10+
- **Hash Length:** 60 characters

**Never:**
- Return password in API response
- Log passwords (even hashed)
- Accept passwords < 8 characters

---

### JWT Security
- **Algorithm:** HS256
- **Secret:** `process.env.JWT_SECRET` (minimum 32 characters)
- **Expiry:** 24 hours
- **Cookie Flags:** `httpOnly=true`, `secure=true` (production)

**Token Payload:**
```json
{
  "userId": 1,
  "email": "jane@example.com",
  "iat": 1705662000,
  "exp": 1705748400
}
```

---

### Input Validation

**Libraries:**
- `validator` - Email validation
- Custom validators for passwords, names, etc.

**Rules:**
- Emails: Must match RFC 5322
- Passwords: ≥ 8 characters, ≤ 100 characters
- Names: 1-100 characters
- Team Names: 3-50 characters, unique

---

### Rate Limiting (Future Enhancement)

Not yet implemented. Recommended:
- Auth endpoints: 5 requests/minute/IP
- All others: 100 requests/minute/user

---

## Testing

### Automated Tests
- **Framework:** Jest 29.5+
- **Coverage:** 85%+ (Epic 1)
- **Location:** `server/src/__tests__/`

**Test Structure:**
```
auth.test.ts         - Auth endpoints
teams.test.ts        - Team CRUD
teamMembers.test.ts  - Membership
invites.test.ts      - Invitation flow
```

**Run Tests:**
```powershell
cd server
npm test
```

---

### Manual Testing (Postman/Thunder Client)

**Signup:**
```http
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Login:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Get Teams (requires cookie from login):**
```http
GET http://localhost:3000/api/teams
Cookie: token=<JWT_TOKEN>
```

---

## Logging

### Event Logging
**See:** [03-architecture.md](03-architecture.md#adr-004-event-logging-for-research-integrity)

All API actions are logged to `events` table with:
- `event_type` - Classification
- `actor_id` - User who triggered
- `team_id` - Team context (if applicable)
- `payload` - Event-specific data (JSONB)

**Query Events:**
```sql
SELECT * FROM events 
WHERE team_id = 1 
ORDER BY created_at DESC;
```

---

### Application Logging
**File:** `server/logs/app.log`

**Logged:**
- Server start/stop
- Database connection events
- Email send results
- Uncaught exceptions

**NOT Logged:**
- Passwords (even hashed)
- JWT tokens
- PII (unless necessary for debugging)

---

## Performance

### Response Times (Target)
- Auth endpoints: < 200ms
- Team list: < 100ms
- Team creation: < 300ms
- Invitations: < 500ms (includes email)

### Database Connection Pooling
Prisma default: 10 connections

### Caching
Not yet implemented. Future optimization:
- Cache team membership checks (Redis)
- Cache practice catalog (in-memory)

---

## Deployment

### Environment Variables
**See:** [07-infrastructure.md](07-infrastructure.md)

Required:
- `DATABASE_URL`
- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### Health Check
```http
GET http://localhost:3000/health

Response (200):
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-19T10:00:00.000Z"
}
```

---

### Practices Catalog

#### GET /api/v1/practices
Get paginated list of all practices with pillar mappings, with optional search and filter

**Authentication:** Not required (public endpoint)

**Query Parameters:**
- `page` (int, optional, default: 1) - Page number (1-indexed)
- `pageSize` (int, optional, default: 20) - Results per page (max: 100)
- `search` (string, optional) - Case-insensitive search by title, goal, or description
- `pillars` (string, optional) - Comma-separated pillar IDs (e.g., "5,8,12") - OR logic (practices covering ANY of the specified pillars)

**Headers:**
- `X-Request-Id` (string, optional) - propagated to response for tracing

**Examples:**
```
GET /api/v1/practices                            # All practices, page 1
GET /api/v1/practices?search=standup             # Search for "standup"
GET /api/v1/practices?pillars=5,8                # Practices covering pillar 5 OR 8
GET /api/v1/practices?search=feedback&pillars=5  # Combines search AND filter
```

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Daily Standup",
      "goal": "Team synchronization and blockers",
      "categoryId": "FEEDBACK_APPRENTISSAGE",
      "categoryName": "FEEDBACK & APPRENTISSAGE",
      "pillars": [
        {
          "id": 5,
          "name": "Communication",
          "category": "VALEURS HUMAINES",
          "description": "Effective communication within and across teams"
        }
      ]
    },
    {
      "id": 2,
      "title": "Sprint Planning",
      "goal": "Define sprint goals and tasks",
      "categoryId": "ORGANISATION_AUTONOMIE",
      "categoryName": "ORGANISATION & AUTONOMIE",
      "pillars": [
        {
          "id": 10,
          "name": "Self-Organization",
          "category": "ORGANISATION & AUTONOMIE",
          "description": "Team self-organization and autonomy"
        }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 47,
  "requestId": "req_abc123xyz"
}
```

**Pagination Math:**
- `skip` = `(page - 1) * pageSize`
- `take` = `pageSize`
- Total pages: `ceil(total / pageSize)`

**Validation:**
- `page`: Minimum 1
- `pageSize`: 1-100 (default 20)
- `pillars`: Must be valid integer IDs, comma-separated

**Error Responses:**

**400 Bad Request** (Invalid parameters):
```json
{
  "code": "validation_error",
  "message": "Invalid pillar IDs in query",
  "details": { "invalidIds": [999, 1000] },
  "requestId": "req_xyz"
}
```

**400 Bad Request** (Invalid pillar IDs from service):
```json
{
  "code": "invalid_filter",
  "message": "Invalid pillar IDs provided",
  "details": { "invalidIds": [999] },
  "requestId": "req_xyz"
}
```

**Filter Logic:**
- **Search:** Case-insensitive matching on title, goal, or description (OR logic)
- **Pillars:** Practices covering ANY of the specified pillars (OR logic)
- **Combined:** Search AND filter (practices must match search AND cover at least one pillar)

**Error Response (400):**
```json
{
  "code": "validation_error",
  "message": "Invalid pagination parameters",
  "details": { "page": 0, "pageSize": 200 },
  "requestId": "req_abc123xyz"
}
```

**Errors:**
- 400: Validation errors (bad page/pageSize)
- 500: `{ "code": "server_error", "message": "Failed to fetch practices", "requestId": "..." }`

**Events Logged:**
- Client logs `catalog.viewed` (teamId, practiceCount, timestamp) via POST `/api/v1/events` after successful fetch

---

## Next Steps (Epic 2)

### Enhancements
- `POST /api/teams/:teamId/practices` - Add practices to team
- `DELETE /api/teams/:teamId/practices/:practiceId` - Remove practice
- `GET /api/teams/:teamId/coverage` - Detailed coverage breakdown
- `POST /api/v1/events` - Log client-side events (catalog view, practice selection)
- Pagination filters by category/pillar

---

**Last Updated:** January 20, 2026
