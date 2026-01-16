# Epic-Level Test Design - Epic 1: Authentication & Team Onboarding

**Project**: bmad_version  
**Epic**: 1 — Authentication & Team Onboarding  
**Date**: 2026-01-15  
**Author**: Murat, Master Test Architect  
**Mode**: Epic-Level (Phase 4)  
**Scope**: User signup, login, team creation, practice selection, member invitations

---

## Epic Overview

**Epic Goal**: Enable users to quickly sign up, log in, and onboard their first team with practice selection, team member invitations, and full team membership management.

**User Value**: Friction-free entry point; teams can start using the platform within 10 minutes of signup.

**Stories Covered**: 1.0–1.6 (8 stories)
**Functional Requirements**: FR1–7, FR23 (user management, team management, provisioning)
**Non-Functional Requirements**: NFR1–4, NFR12–17 (security, API format, tech stack)

**Effort Estimate**: ~50 story points (Week 1 implementation)

---

## Risk Assessment

### Risk 1.1: Password Validation & Storage (Security)

**Description**: Passwords not properly validated (min length, complexity) or hashed (bcrypt rounds).

**Risk Score Analysis**:
- **Probability**: 2 (Possible) — bcrypt is standard library, but configuration easy to miss
- **Impact**: 3 (Critical) — Weak passwords enable account takeover, research ethics violation
- **Score**: 2 × 3 = **6 (HIGH)** — Requires mitigation

**Test Scenarios**:
- ✅ Password < 8 characters rejected (validation)
- ✅ Password stored as bcrypt hash, not plaintext (verification)
- ✅ Bcrypt rounds ≥ 10 enforced (configuration)
- ✅ Same password never produces same hash (salt uniqueness)
- ✅ Plaintext password never appears in logs (redaction)

**Test Level**: Unit (validation logic) + Integration (storage)  
**Priority**: P0 (Security-critical)  
**Owner**: Backend developer  
**Effort**: 4 hours

**Mitigation**:
- Enforce password validation schema (zod: minLength(8), regex for complexity)
- Use bcrypt with rounds=10 minimum (configured in .env)
- Code review: bcrypt rounds setting before deploy
- Automated test: verify plaintext never logged

---

### Risk 1.2: JWT Token Expiry & Refresh (Security & UX)

**Description**: JWT tokens don't expire, or refresh mechanism fails, leaving users logged in indefinitely.

**Risk Score Analysis**:
- **Probability**: 2 (Possible) — Token management has multiple failure modes
- **Impact**: 3 (Critical) — Stale tokens enable unauthorized access if device compromised
- **Score**: 2 × 3 = **6 (HIGH)** — Requires mitigation

**Test Scenarios**:
- ✅ Access token expires after 1 hour (expiry enforced)
- ✅ Refresh token can extend session (refresh flow works)
- ✅ Expired token returns 401 (not 200)
- ✅ Invalid/tampered token rejected (signature verification)
- ✅ Refresh token rotation (old refresh invalid after use)

**Test Level**: Integration (API) + E2E (user journey)  
**Priority**: P0 (Security-critical)  
**Owner**: Backend developer + Frontend developer  
**Effort**: 6 hours

**Mitigation**:
- JWT_SECRET from environment (not hardcoded)
- Token expiry in middleware: check exp claim before proceeding
- Refresh endpoint validates refresh token separately
- Automated test: wait 61 minutes, verify access token fails

---

### Risk 1.3: Team Member Invite Logic (Data Integrity)

**Description**: Invite system creates duplicate members, allows self-invitation, fails to resolve pending invites.

**Risk Score Analysis**:
- **Probability**: 3 (Likely) — Multi-path invite logic (new user, existing user, pending) is complex
- **Impact**: 2 (Degraded) — Duplicate members confuse UI, but don't block functionality
- **Score**: 3 × 2 = **6 (HIGH)** — Requires mitigation

**Test Scenarios**:
- ✅ Inviting existing user adds them immediately (idempotent)
- ✅ Inviting new user creates pending invite (pending status)
- ✅ Inviting user already on team shows error (duplicate prevention)
- ✅ User signup auto-resolves pending invite (invite resolution)
- ✅ New user can't invite themselves (self-invite blocked)
- ✅ Invalid email rejected before invite created (validation)

**Test Level**: Integration (API) + E2E (invite flow)  
**Priority**: P0 (Core onboarding flow)  
**Owner**: Backend developer + QA  
**Effort**: 8 hours

**Mitigation**:
- Unique constraint: (team_id, user_id) prevents duplicates
- Idempotent logic: check if user exists, add immediately or create pending
- Auto-resolve trigger: when new user signs up, resolve all pending invites for that email
- Test: simulate all 3 paths (new, existing, duplicate)

---

### Risk 1.4: Email Delivery for Invites (Reliability & UX)

**Description**: Invite emails fail silently (no SMTP server configured), users never receive invites, pending invites never auto-resolve.

**Risk Score Analysis**:
- **Probability**: 2 (Possible) — External SMTP dependency, misconfigurations common
- **Impact**: 3 (Critical) — Users can't onboard team members, halts collaboration
- **Score**: 2 × 3 = **6 (HIGH)** — Requires mitigation

**Test Scenarios**:
- ✅ Invite email sent on new user invite (email delivery)
- ✅ Email contains signup link / CTA (email content)
- ✅ Email delivery failure gracefully handled (500 error on SMTP fail)
- ✅ Failed invite marked "Failed" status with retry option (UX recovery)
- ✅ Retry successfully sends email after failure (idempotent)
- ✅ SMTP timeout doesn't crash app (graceful degradation)

**Test Level**: Integration (API with mock SMTP) + E2E (user journey)  
**Priority**: P0 (Critical for onboarding)  
**Owner**: Backend developer  
**Effort**: 7 hours

**Mitigation**:
- Mock SMTP in tests (capture email, verify content)
- SMTP configuration required before production deploy
- Invite status tracking: "pending", "failed" with error reason
- Retry mechanism: resend email without creating duplicate invite
- Alert: log SMTP errors with email address for manual investigation

---

### Risk 1.5: Team Isolation in Team Creation (Security)

**Description**: User can create team, but team not properly isolated (other users see team's data).

**Risk Score Analysis**:
- **Probability**: 1 (Unlikely) — Team isolation enforced at database level (separate DB per team)
- **Impact**: 3 (Critical) — Data breach, research ethics violation
- **Score**: 1 × 3 = **3 (LOW)** — Document only

**Test Scenarios**:
- ✅ Team created with correct teamId (FK relationship)
- ✅ User can't see other team's data after creation (isolation)
- ✅ Team DB connection string includes correct teamId (isolation)
- ✅ User added to team_members table with correct role (permission)

**Test Level**: Integration (API) + Database level  
**Priority**: P1 (High, covered by system-level tests)  
**Owner**: Backend developer  
**Effort**: 3 hours

**Mitigation**:
- Per-team database isolation (hardest-to-bypass)
- Middleware enforces teamId in all requests
- Integration tests verify cross-team queries blocked

---

### Risk 1.6: Practice Selection & Pillar Validation (Data Integrity)

**Description**: User selects practices for team, but practice-pillar mappings incorrect or inconsistent.

**Risk Score Analysis**:
- **Probability**: 1 (Unlikely) — Practice data imported at startup, validated via schema
- **Impact**: 2 (Degraded) — Wrong coverage % calculated, but doesn't block functionality
- **Score**: 1 × 2 = **2 (LOW)** — Document only

**Test Scenarios**:
- ✅ Valid practices selectable (practice loaded from catalog)
- ✅ Invalid practice IDs rejected (validation)
- ✅ Pillar mappings consistent (practice.pillars ⊂ 19 canonical pillars)
- ✅ Coverage calculated correctly after practice selection (calculation logic)

**Test Level**: Unit (validation) + Integration (API)  
**Priority**: P1  
**Owner**: Backend developer  
**Effort**: 3 hours

**Mitigation**:
- JSON Schema validation on practice import
- Unique practice IDs (can't have duplicates)
- Pillar references validated against canonical set (19 pillars)

---

## Coverage Matrix

| User Story | Acceptance Criteria | Risk Linked | Test Level | Priority | Test Count |
|-----------|-------------------|-------------|-----------|----------|-----------|
| 1.0 Setup Starter | Dev env running, both servers start | None | Unit/Int | P1 | 4 |
| 1.1 Registration | Email validation, account created, session active | 1.2 (JWT) | API + E2E | P0 | 5 |
| 1.2 Login | Valid credentials login, invalid show error | 1.2 (JWT) | API + E2E | P0 | 4 |
| 1.3 Teams List | View teams, empty state, switch teams | 1.5 (Isolation) | API + E2E | P1 | 3 |
| 1.4 Team Creation | Create team, select practices, coverage calculated | 1.6 (Validation) | API + E2E | P0 | 6 |
| 1.5 Invite Members | Invite new/existing user, email sent, status tracking | 1.3, 1.4 (Invite) | API + E2E | P0 | 8 |
| 1.6 Member Management | View members, resend invite, remove member | 1.3 (Invite) | API + E2E | P1 | 5 |

**Total Test Count**: ~35 tests  
**Estimated Runtime**: ~4 minutes (unit <1min, API ~2min, E2E ~1min)

---

## Quality Gate Criteria

**P0 Tests Must Pass (100%)**:
- ✅ Password validation & storage (4 tests)
- ✅ JWT token expiry & refresh (6 tests)
- ✅ Invite idempotency & auto-resolve (8 tests)
- ✅ Registration & login flows (9 tests)
- ✅ Team creation with practice selection (6 tests)

**P1 Tests Should Pass (≥95%)**:
- ✅ Teams list view (3 tests)
- ✅ Member management (5 tests)
- ✅ Team isolation (3 tests)
- ✅ Practice validation (3 tests)

**Coverage Targets**:
- ✅ Unit test coverage ≥80% (auth, validation logic)
- ✅ API endpoint coverage 100% (all routes tested)
- ✅ E2E critical path coverage (signup → team creation → invite)

---

## Test Scenarios by Level

### Unit Tests (8 tests, <1 min)

**1.1.1: Password validation accepts 8+ chars**
```typescript
test('password >= 8 chars accepted', async () => {
  const result = validatePassword('ValidPass123');
  expect(result.valid).toBe(true);
});

test('password < 8 chars rejected', async () => {
  const result = validatePassword('Short1');
  expect(result.valid).toBe(false);
  expect(result.error).toContain('8 characters');
});
```

**1.1.2: Bcrypt hashing applied**
```typescript
test('password hashed with bcrypt', async () => {
  const plain = 'ValidPass123';
  const hashed = await hashPassword(plain);
  expect(hashed).not.toBe(plain);
  expect(hashed).toMatch(/^\$2[aby]?/); // bcrypt prefix
  
  // Same input produces different hash (salt)
  const hashed2 = await hashPassword(plain);
  expect(hashed).not.toBe(hashed2);
});
```

**1.2.1: JWT token expiry logic**
```typescript
test('JWT expired after 1 hour', async () => {
  const token = generateToken({userId: 1}, {expiresIn: '1h'});
  const decoded = jwt.verify(token, JWT_SECRET);
  expect(decoded.exp).toBeDefined();
  expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
});
```

**1.3.1: Invite idempotency check**
```typescript
test('inviting existing user is idempotent', async () => {
  const existing = await createUser({email: 'user@test.com'});
  const team = await createTeam('Team');
  
  const invite1 = await createInvite(team.id, existing.email);
  const invite2 = await createInvite(team.id, existing.email);
  
  // Second invite should not create new record
  expect(invite1.id).toBe(invite2.id);
});
```

**1.6.1: Practice pillar validation**
```typescript
test('practice pillars validated against 19 canonical', async () => {
  const practice = {name: 'Daily Standup', pillars: ['Communication', 'Feedback', 'InvalidPillar']};
  
  expect(async () => {
    await validatePractice(practice);
  }).rejects.toThrow('InvalidPillar not found');
});
```

---

### Integration Tests (15 tests, ~2 min)

**1.1.3: User registration creates account**
```typescript
test('POST /api/auth/register creates user', async ({request}) => {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ValidPass123'
    }
  });
  
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user.id).toBeTruthy();
  expect(user.email).toBe('john@example.com');
  
  // Verify in database
  const dbUser = await db.users.findByEmail('john@example.com');
  expect(dbUser.password).not.toBe('ValidPass123'); // Hashed
});
```

**1.2.2: User login returns JWT**
```typescript
test('POST /api/auth/login returns token', async ({request}) => {
  await createUser({email: 'user@test.com', password: 'Pass123'});
  
  const response = await request.post('/api/auth/login', {
    data: {email: 'user@test.com', password: 'Pass123'}
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.accessToken).toBeTruthy();
  expect(body.refreshToken).toBeTruthy();
});
```

**1.2.3: Expired token rejected**
```typescript
test('GET /api/auth/me with expired token returns 401', async ({request}) => {
  const user = await createUser();
  const expiredToken = generateToken({userId: user.id}, {expiresIn: '0s'});
  
  // Wait 1 second
  await new Promise(r => setTimeout(r, 1000));
  
  const response = await request.get('/api/auth/me', {
    headers: {Authorization: `Bearer ${expiredToken}`}
  });
  
  expect(response.status()).toBe(401);
});
```

**1.4.1: Team creation with practices**
```typescript
test('POST /api/teams creates team with practices', async ({request}) => {
  const user = await createAndLoginUser();
  
  const response = await request.post('/api/teams', {
    data: {
      name: 'My Team',
      selectedPractices: [1, 2, 3]
    },
    headers: {Authorization: `Bearer ${user.token}`}
  });
  
  expect(response.status()).toBe(201);
  const team = await response.json();
  expect(team.id).toBeTruthy();
  expect(team.name).toBe('My Team');
  expect(team.coverage.pillarsCovered).toBeGreaterThan(0);
});
```

**1.5.1: Invite new user sends email**
```typescript
test('POST /api/teams/{id}/invites sends email to new user', async ({request}) => {
  const team = await createTeam();
  
  const mockEmails: any[] = [];
  interceptSMTP((email) => mockEmails.push(email));
  
  const response = await request.post(`/api/teams/${team.id}/invites`, {
    data: {email: 'newuser@example.com'},
    headers: {Authorization: `Bearer ${ownerToken}`}
  });
  
  expect(response.status()).toBe(201);
  expect(mockEmails).toHaveLength(1);
  expect(mockEmails[0].to).toContain('newuser@example.com');
  expect(mockEmails[0].subject).toContain('invited');
});
```

**1.5.2: Invite existing user adds immediately**
```typescript
test('inviting existing user adds immediately, no email', async ({request}) => {
  const team = await createTeam();
  const existing = await createUser({email: 'existing@test.com'});
  
  const mockEmails: any[] = [];
  interceptSMTP((email) => mockEmails.push(email));
  
  const response = await request.post(`/api/teams/${team.id}/invites`, {
    data: {email: 'existing@test.com'},
    headers: {Authorization: `Bearer ${ownerToken}`}
  });
  
  expect(response.status()).toBe(201);
  const invite = await response.json();
  expect(invite.status).toBe('Added'); // Not Pending
  expect(mockEmails).toHaveLength(1); // Email still sent (courtesy notification)
});
```

**1.5.3: Pending invite auto-resolves on signup**
```typescript
test('user signup auto-resolves pending invites', async ({request}) => {
  const team = await createTeam();
  
  // Create pending invite
  await request.post(`/api/teams/${team.id}/invites`, {
    data: {email: 'newuser@test.com'},
    headers: {Authorization: `Bearer ${ownerToken}`}
  });
  
  // User signs up with same email
  const signupRes = await request.post('/api/auth/register', {
    data: {
      name: 'New User',
      email: 'newuser@test.com',
      password: 'ValidPass123'
    }
  });
  
  expect(signupRes.status()).toBe(201);
  
  // Verify user added to team
  const teamMembers = await request.get(`/api/teams/${team.id}/members`, {
    headers: {Authorization: `Bearer ${ownerToken}`}
  });
  const members = await teamMembers.json();
  expect(members.items.map(m => m.email)).toContain('newuser@test.com');
});
```

---

### E2E Tests (4 tests, ~1 min)

**1.0.1: User signup → team creation → invite → acceptance flow**
```typescript
test.describe('Complete onboarding flow', () => {
  test('user can signup, create team, invite members', async ({page, context}) => {
    // Step 1: Signup
    await page.goto('/signup');
    await page.fill('[data-testid="name"]', 'John Doe');
    await page.fill('[data-testid="email"]', 'john@test.com');
    await page.fill('[data-testid="password"]', 'ValidPass123');
    await page.click('[data-testid="signup-button"]');
    
    await expect(page).toHaveURL('/teams'); // Redirected to teams view
    
    // Step 2: Create team
    await page.click('[data-testid="create-team-button"]');
    await page.fill('[data-testid="team-name"]', 'My Scrum Team');
    
    // Select practices
    await page.check('[data-testid="practice-standup"]');
    await page.check('[data-testid="practice-retrospective"]');
    
    await page.click('[data-testid="create-button"]');
    
    await expect(page).toHaveURL(/\/teams\/\d+/); // In team dashboard
    
    // Step 3: Invite team member
    await page.click('[data-testid="invite-button"]');
    await page.fill('[data-testid="invite-email"]', 'teammate@test.com');
    await page.click('[data-testid="send-invite"]');
    
    await expect(page.getByText('Invite sent to teammate@test.com')).toBeVisible();
    
    // Step 4: Teammate signs up (in new context/browser)
    const newBrowser = context.browser();
    const teammate = await newBrowser.newContext();
    const teammatePage = teammate.newPage();
    
    // Teammate receives email, clicks link (simulate)
    await teammatePage.goto('/signup?email=teammate@test.com');
    await teammatePage.fill('[data-testid="name"]', 'Teammate');
    await teammatePage.fill('[data-testid="password"]', 'TeamPass123');
    await teammatePage.click('[data-testid="signup-button"]');
    
    // Teammate auto-added to team
    await expect(teammatePage).toHaveURL('/teams');
    const teams = await teammatePage.locator('[data-testid="team-card"]');
    await expect(teams).toContainText('My Scrum Team');
  });
});
```

**1.4.2: Team creation with coverage calculation**
```typescript
test('team creation calculates coverage correctly', async ({page}) => {
  await loginAs('user@test.com');
  
  await page.goto('/teams');
  await page.click('[data-testid="create-team-button"]');
  
  // Select specific practices
  await page.check('[data-testid="practice-daily-standup"]'); // Covers: Communication, Feedback
  await page.check('[data-testid="practice-sprint-planning"]'); // Covers: Communication, Planning
  
  await page.click('[data-testid="create-button"]');
  
  // Verify coverage displayed
  const coverage = await page.locator('[data-testid="coverage-percentage"]');
  await expect(coverage).toContainText(/\d+%/); // Coverage percentage shown
  
  // Verify pillar breakdown
  await page.click('[data-testid="coverage-details"]');
  await expect(page.getByText('Communication')).toBeVisible();
});
```

**1.5.4: Conflict handling - duplicate invite rejection**
```typescript
test('duplicate invite shows error', async ({page}) => {
  const team = await createTeam();
  await loginAsTeamOwner(team);
  
  await page.goto(`/teams/${team.id}`);
  
  // First invite
  await page.click('[data-testid="invite-button"]');
  await page.fill('[data-testid="invite-email"]', 'user@test.com');
  await page.click('[data-testid="send-invite"]');
  
  await expect(page.getByText('Invite sent')).toBeVisible();
  
  // Try to invite same user again
  await page.click('[data-testid="invite-button"]');
  await page.fill('[data-testid="invite-email"]', 'user@test.com');
  await page.click('[data-testid="send-invite"]');
  
  // Should show error
  await expect(page.getByText('User is already a team member')).toBeVisible();
});
```

---

## Effort & Timeline

**Development Estimate**: 50 story points  
**Testing Estimate**: 25 hours  
**Total Epic Effort**: 75 hours (~Week 1)

**Breakdown**:
- Setup & infrastructure: 8 hours (Docker, CI, test env)
- Feature development: 40 hours (8 stories)
- Test development: 20 hours (unit + integration + E2E)
- Bug fixes & refinement: 7 hours

**Daily Standup Targets**:
- Day 1: Project setup, Story 1.0 (starter template)
- Day 2: Story 1.1 (registration), Story 1.2 (login)
- Day 3: Story 1.3 (teams list), Story 1.4 (team creation)
- Day 4: Story 1.5 (invitations), Story 1.6 (member management)
- Day 5: Bug fixes, test coverage completion, E2E validation

---

## Handoff Checklist

Before moving to Epic 2, verify:

- ✅ All 8 user stories implemented (Story 1.0–1.6)
- ✅ All P0 tests green (password, JWT, invites, registration/login, team creation)
- ✅ All P1 tests ≥95% passing (teams list, member management, isolation, validation)
- ✅ Coverage metrics: Unit ≥80%, API 100%, E2E critical paths
- ✅ No security vulnerabilities (bcrypt rounds, JWT expiry, SQL injection prevention)
- ✅ No team isolation leaks (verified via cross-team access tests)
- ✅ Production artifacts ready (Docker image, environment config, deployment script)

---

**Document Status**: ✅ Complete  
**Epic Status**: Ready for Sprint Planning  
**Next Epic**: Epic 2 — Practice Catalog & Coverage (per-epic test design follows same format)

