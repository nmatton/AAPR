# System-Level Test Design & Testability Review

**bmad_version** — Research-Grade Agile Practice Platform
**Project**: bmad_version  
**Date**: 2026-01-15  
**Author**: Murat, Master Test Architect  
**Mode**: System-Level (Phase 3)  
**Status**: PASS — Ready for implementation with documented test strategy

---

## Executive Summary

This system-level testability review assesses the architecture's readiness for comprehensive test coverage. Across **controllability**, **observability**, and **reliability**, the architecture demonstrates **PASS** status with strong isolation boundaries, event-driven design, and clear deployment topology enabling effective test coverage at all levels.

**Key Architectural Strengths**:
- ✅ Perfect team isolation via per-database architecture (impossible to leak data)
- ✅ Complete event audit trail for research validation
- ✅ Clear API boundaries enabling integration testing
- ✅ TypeScript strict mode enables type-safe testing
- ✅ Optimistic concurrency with testable conflict resolution

**Critical Testability Concerns**: None blocking — all architectural decisions support testability.

**Recommended Test Strategy**: 
- **Unit tests (50%)**: Business logic, calculations (Big Five, coverage)
- **Integration tests (35%)**: API contracts, team isolation, event logging
- **E2E tests (15%)**: Critical user journeys (signup, team creation, issue submission)

**Effort Estimate**: ~80–100 hours of test development (Phase 2)

---

## 1. Testability Assessment

### 1.1 Controllability: Can We Control System State for Testing?

**Assessment: ✅ PASS**

The architecture enables full controllability through multiple mechanisms:

#### Database-Level Control

**Strengths**:
- **Per-team databases**: Each team's test instance is isolated, enabling:
  - Clean resets between tests (drop/recreate DB)
  - Zero interference from other teams
  - Simple data seeding (INSERT fixture data)
- **Event-driven design**: All state changes logged, enabling:
  - Replay/rewind testing (what was state before this event?)
  - Deterministic test data (events are immutable source of truth)
  - Migration testing (apply migrations to different event sequences)

**Test Implementation**:
```typescript
// Setup: Seed a complete team state
async function seedTeamWithIssues() {
  const team = await db.teams.create({name: "Test Team"});
  const practice = await db.practices.create({name: "Daily Standup"});
  await db.team_practices.create({teamId: team.id, practiceId: practice.id});
  
  const issue = await db.issues.create({
    teamId: team.id,
    practiceId: practice.id,
    title: "Standups feel too long"
  });
  
  // Events logged automatically via transaction wrapper
  return {team, practice, issue};
}

// Test: Verify team isolation
test("User cannot see another team's issues", async () => {
  const team1 = await seedTeamWithIssues();
  const team2 = await seedTeamWithIssues();
  
  const issuesForTeam1 = await getTeamIssues(team1.id);
  expect(issuesForTeam1).toHaveLength(1);
  expect(issuesForTeam1[0].id).toBe(team1.issue.id);
  // team2.issue NEVER appears due to team_id filter
});

// Cleanup: Reset database
async function resetTeamDatabase() {
  await db.exec("TRUNCATE TABLE teams CASCADE"); // PostgreSQL cascade delete
}
```

#### API-Level Control

**Strengths**:
- **REST endpoints for all operations**: Every state change has an API endpoint
- **Service layer isolation**: Business logic can be called directly in tests without UI
- **Factory functions**: Create test data via API (enables testing data validation)

**Test Implementation**:
```typescript
// Integration test: Create team via API
test("Team creation validates practice selection", async ({request}) => {
  const response = await request.post("/api/teams", {
    data: {
      name: "New Team",
      selectedPractices: [1, 2, 3] // IDs of practices
    }
  });
  
  expect(response.status()).toBe(201);
  const team = await response.json();
  expect(team.coverage.pillarsCovered).toBeGreaterThan(0);
});

// Trigger error states for testing
test("Team creation rejects invalid practice IDs", async ({request}) => {
  const response = await request.post("/api/teams", {
    data: {
      name: "Bad Team",
      selectedPractices: [99999] // Non-existent practice
    }
  });
  
  expect(response.status()).toBe(400);
  const error = await response.json();
  expect(error.code).toBe("invalid_practice_id");
});
```

#### Environment Control

**Strengths**:
- **Docker Compose**: Local environment replicates production (PostgreSQL, Node.js versions)
- **Environment variables**: Test configuration separate from code
- **Database migrations**: Seed data via migration scripts or direct SQL
- **Feature flags**: Can test different code paths without branching

**Test Implementation**:
```typescript
// Setup: Test environment with feature flag
const env = {
  DATABASE_URL: "postgresql://test:password@localhost/test_team_1",
  JWT_SECRET: "test-secret-key-only-for-testing",
  FEATURE_BIG_FIVE_V2: "false", // Disable newer Big Five version for compatibility tests
};

// Test: Verify backward compatibility
test("Old Big Five v1 scores still valid", async () => {
  // Test with FEATURE_BIG_FIVE_V2=false
  const scores = await calculateBigFiveV1([...responses]);
  expect(scores).toMatchSnapshot(); // Compare to known-good v1 output
});
```

---

### 1.2 Observability: Can We Inspect System State and Validate NFRs?

**Assessment: ✅ PASS**

Multiple mechanisms enable deep observability:

#### Event Log Observability

**Strengths**:
- **Immutable event log captures every state change**: Query events table to verify behavior
- **Correlation IDs**: Every API request has requestId for tracing
- **Event schemas**: Zod validation ensures consistent event structure
- **Research-grade audit trail**: Event payloads include deltas (changed fields only)

**Test Implementation**:
```typescript
// Query events to verify team isolation
test("Events include teamId for all mutations", async () => {
  const team1 = await createTeam("Team 1");
  
  // Create an issue
  await createIssue(team1.id, "Issue about standups");
  
  // Query event log
  const events = await db.events.findAll({
    where: {teamId: team1.id, eventType: "issue.created"}
  });
  
  expect(events).toHaveLength(1);
  expect(events[0].teamId).toBe(team1.id);
  expect(events[0].payload.issue_id).toBeDefined();
  expect(events[0].created_at).toBeInstanceOf(Date);
});

// Verify event order (test concurrency handling)
test("Events maintain causal ordering", async () => {
  const team = await createTeam("Team");
  
  // Rapid-fire mutations
  const issuePromise = createIssue(team.id, "Issue A");
  const commentPromise = addComment(...);
  const decisionPromise = recordDecision(...);
  
  await Promise.all([issuePromise, commentPromise, decisionPromise]);
  
  // Verify event sequence in log
  const events = await db.events.findAll({
    where: {teamId: team.id},
    orderBy: {created_at: "asc"}
  });
  
  // Events ordered by timestamp (no causality violations)
  expect(events[0].action).toBe("issue.created");
  expect(events[1].action).toBe("comment_added");
  expect(events[2].action).toBe("decision_recorded");
});
```

#### Database State Observability

**Strengths**:
- **Relational schema enables complex queries**: Join tables to verify referential integrity
- **Indexes enable performance tracing**: Slow query logs reveal inefficiencies
- **Constraint enforcement**: Database enforces business rules (team_id foreign keys, unique constraints)

**Test Implementation**:
```typescript
// Verify constraint enforcement (data integrity)
test("Database rejects issues without teamId", async () => {
  expect(async () => {
    await db.issues.create({
      title: "Orphaned issue",
      // Missing teamId
    });
  }).rejects.toThrow("NOT NULL constraint");
});

// Query coverage calculation (observe calculated metric)
test("Coverage is correctly calculated from practices", async () => {
  const team = await createTeam("Team");
  
  // Add practices covering specific pillars
  await addPracticesToTeam(team.id, [
    {id: 1, pillars: ["Communication", "Feedback"]},
    {id: 2, pillars: ["Feedback", "TDD"]},
  ]);
  
  // Query coverage from database view or API
  const coverage = await db.query(`
    SELECT COUNT(DISTINCT pillar_id) as covered_pillars
    FROM practice_pillars pp
    WHERE pp.practice_id IN (
      SELECT practice_id FROM team_practices WHERE team_id = $1
    )
  `, [team.id]);
  
  expect(coverage.covered_pillars).toBe(3); // Communication, Feedback, TDD
});
```

#### API Response Observability

**Strengths**:
- **Structured error responses**: Every error includes code, message, details, requestId
- **Consistent pagination**: List responses include total count, enabling assertions on page sizes
- **Versioning support**: API can evolve without breaking tests (version field in responses)

**Test Implementation**:
```typescript
// Verify structured error format
test("Conflict error returns both versions", async ({request}) => {
  const issue = await createIssue(teamId, "Initial description");
  
  // Simulate concurrent edit
  const updatePromise1 = request.put(`/api/issues/${issue.id}`, {
    data: {description: "Description A", version: 1}
  });
  const updatePromise2 = request.put(`/api/issues/${issue.id}`, {
    data: {description: "Description B", version: 1}
  });
  
  const [res1, res2] = await Promise.all([updatePromise1, updatePromise2]);
  
  // One succeeds, one gets 409
  if (res1.status() === 409) {
    const conflict = await res1.json();
    expect(conflict.code).toBe("version_conflict");
    expect(conflict.requestId).toBeTruthy(); // For tracing
    expect(conflict.details.expectedVersion).toBe(1);
    expect(conflict.details.actualVersion).toBe(2); // Incremented by first update
  }
});
```

---

### 1.3 Reliability: Can We Reproduce Failures and Test Error Paths?

**Assessment: ✅ PASS**

Architecture enables deterministic failure reproduction and comprehensive error handling testing:

#### Deterministic Test Data

**Strengths**:
- **Transaction wrappers ensure atomic operations**: All-or-nothing semantics prevent partial state
- **Seeding scripts create known-good initial state**: Tests start from consistent baseline
- **Idempotent operations**: Retry logic can be tested without side effects

**Test Implementation**:
```typescript
// Reproducible test failure
test("Issue submission fails gracefully on database connection loss", async () => {
  // Seed: Create team with practice
  const team = await seedTeam();
  
  // Kill database connection (simulated)
  const originalPool = getConnectionPool();
  setConnectionPool(null);
  
  // Attempt issue submission
  const response = await submitIssue(team.id, {
    practiceId: 1,
    title: "Standup too long"
  });
  
  // Expect 503 Service Unavailable
  expect(response.status).toBe(503);
  expect(response.body.code).toBe("database_unavailable");
  
  // Restore connection
  setConnectionPool(originalPool);
  
  // Verify issue NOT created (atomicity preserved)
  const issues = await getTeamIssues(team.id);
  expect(issues).toHaveLength(0); // No orphaned issue
});

// Reproducible version conflict
test("Conflict resolution merges latest + user changes", async () => {
  const issue = await createIssue(teamId, {
    description: "Initial",
    version: 1
  });
  
  // Simulate concurrent edit by different user
  const latestFromDB = {
    ...issue,
    description: "Updated by another user",
    version: 2
  };
  
  // User's draft with old version
  const userChanges = {
    description: "User's feedback",
    version: 1
  };
  
  // Conflict resolution: apply latest + re-apply user changes
  const merged = mergeChanges(latestFromDB, userChanges);
  
  expect(merged.description).toContain("Updated by another user");
  expect(merged.description).toContain("User's feedback"); // Both perspectives
  expect(merged.version).toBe(3); // Incremented
});
```

#### Error Path Coverage

**Strengths**:
- **Explicit error handling in services**: Every business rule has error path
- **Validation at multiple layers**: DTOs validate input, constraints validate state
- **Transactional rollback guarantees**: Failed mutations don't partially succeed

**Test Implementation**:
```typescript
// Error paths for Big Five questionnaire
test("Big Five submission validates reverse-coded items", async () => {
  const responses = [
    // Items 1-10: normal coding
    {itemId: 1, response: 5}, // "I am the life of the party"
    // Items 11-20: reverse-coded (error: out of range)
    {itemId: 11, response: 6}, // Invalid (scale is 1-5)
  ];
  
  const result = await submitBigFive(teamId, userId, responses);
  
  expect(result.status).toBe(400);
  expect(result.errors).toContainEqual({
    path: "responses[1]",
    message: "Response must be 1-5",
    code: "invalid_range"
  });
});

// Error paths for team isolation
test("User cannot access another team's data", async ({request}) => {
  const team1 = await createTeam("Team 1");
  const team2 = await createTeam("Team 2");
  
  const userInTeam1 = await createUser({email: "user1@test.com"});
  await addTeamMember(team1.id, userInTeam1.id);
  
  const loginRes = await request.post("/api/auth/login", {
    data: {email: "user1@test.com", password: "..."}
  });
  const token = await loginRes.json();
  
  // Try to access Team 2's data with Team 1 user
  const response = await request.get(`/api/teams/${team2.id}`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(response.status()).toBe(403); // Forbidden
});
```

---

## 2. Architecturally Significant Requirements (ASRs)

The following quality requirements drive architectural decisions and require special test infrastructure:

### ASR-1: Research Data Integrity & Audit Trail Completeness

**Requirement**: Event logs must be 100% accurate and immutable; all DB-affecting actions (except auth/composition) must be captured.

**Risk Score**: 9 (Probability=3: every feature modifies state, Impact=3: research validity depends on it)

**Test Strategy**:
- **Event logging tests**: For each mutation (create issue, add practice, record decision), verify event is logged with correct schema
- **Replay validation**: Use events to reconstruct state, verify matches database
- **Immutability enforcement**: Verify UPDATE/DELETE permissions revoked on events table
- **Concurrency test**: Rapid mutations in parallel, verify all events captured in order

**Test Effort**: 15 hours (event schema validation, replay simulation, concurrent write tests)

---

### ASR-2: Big Five Personality Scoring Accuracy

**Requirement**: IPIP-NEO algorithm must match published standard (reverse-coded items, trait aggregation, percentile normalization).

**Risk Score**: 6 (Probability=3: complexity of algorithm, Impact=2: affects research correlation analysis but not data integrity)

**Test Strategy**:
- **Unit tests**: For each trait calculation (Openness, Conscientiousness, etc.), verify scoring logic against reference implementation
- **Reverse-coding validation**: Specific tests for items that need reversal (typically ~9 items)
- **Edge case tests**: All-1s, all-5s, mixed responses → verify expected score ranges
- **Reference data**: Compare against IPIP-NEO test cases with known-good outputs

**Test Effort**: 20 hours (algorithm validation, reverse-coded item verification, reference data comparison)

---

### ASR-3: Team Isolation (Data Leak Prevention)

**Requirement**: Teams absolutely cannot see each other's data; isolation enforced at database AND middleware levels.

**Risk Score**: 9 (Probability=2: easy to miss a query filter, Impact=3: research ethics violation)

**Test Strategy**:
- **Integration tests**: Every API endpoint tested with cross-team user → must return 403 Forbidden
- **Database-level tests**: Run parameterized query without team_id filter, verify constraint prevents execution
- **Query scanning**: Linter to detect SQL queries without team_id filter
- **Penetration test simulation**: JWT tampering, direct API calls with forged team_id → all rejected

**Test Effort**: 25 hours (endpoint coverage, database constraint validation, linting rules, penetration scenarios)

---

### ASR-4: Optimistic Concurrency Conflict Resolution

**Requirement**: Concurrent edits detected (409 Conflict), client shows safe merge UI, no data loss.

**Risk Score**: 6 (Probability=2: likely with multiple teams editing simultaneously, Impact=3: data loss or user frustration)

**Test Strategy**:
- **Concurrent write tests**: Simulate two users editing same issue in parallel, verify 409 response structure
- **Conflict resolution tests**: Test all 3 merge paths (apply latest + re-apply, overwrite, save as comment)
- **Draft preservation tests**: Auto-saved draft survives conflict, user can recover without retyping
- **Version field validation**: Every update request requires version field, reject if absent

**Test Effort**: 18 hours (concurrent write simulation, merge strategy validation, draft recovery, version tracking)

---

### ASR-5: Coverage Calculation Accuracy

**Requirement**: Pillar-level, category-level, and overall coverage percentages calculated correctly from practice-pillar mappings.

**Risk Score**: 6 (Probability=3: complex multi-level calculation, Impact=2: affects dashboard display but not core functionality)

**Test Strategy**:
- **Unit tests**: For coverage calculation functions (pillar %, category %, overall %)
- **Integration tests**: Add/remove practices, verify coverage updates correctly
- **Data validation**: Pillar-practice mappings validated on import, inconsistent mappings rejected
- **Performance test**: Coverage calculation must complete < 500ms even for 19 pillars × 100 practices

**Test Effort**: 12 hours (calculation logic validation, mutation tests, performance validation)

---

### ASR-6: Event Logging Transactional Consistency

**Requirement**: Mutation (issue creation) + event log entry succeed or fail together (atomic transaction).

**Risk Score**: 6 (Probability=2: database connection failures, Impact=3: event log gaps break research audit trail)

**Test Strategy**:
- **Transaction rollback tests**: Simulate transaction failure mid-operation, verify both rolled back
- **Crash recovery tests**: Stop database before commit, restart → verify idempotent
- **Event completeness audit**: Periodically verify event count matches expected mutations
- **Timebound consistency**: Events should be written < 100ms after mutation completes

**Test Effort**: 15 hours (transaction rollback scenarios, crash recovery, idempotency verification)

---

## 3. Test Levels Strategy

Based on architecture characteristics and risk assessment:

### 3.1 Recommended Test Distribution

| Level | Coverage | Rationale | Estimated Tests |
|-------|----------|-----------|-----------------|
| **Unit** | 50% | Business logic (Big Five scoring, coverage calculation), input validation | ~35 tests |
| **Integration** | 35% | API contracts, team isolation, event logging, database mutations | ~25 tests |
| **E2E** | 15% | Critical user journeys (signup, team creation, issue submission, Big Five completion) | ~10 tests |

**Total Test Suite**: ~70 tests, estimated runtime ~8 minutes (unit <1min, integration 3min, E2E 4min)

---

### 3.2 Unit Test Scope

**Focus Areas**:
1. **Big Five scoring logic** (5 tests)
   - Trait calculation (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
   - Reverse-coding validation
   - Edge cases (all-1s, all-5s, mixed)

2. **Coverage calculation functions** (4 tests)
   - Pillar-level coverage %
   - Category-level breakdown
   - Overall coverage (categories complete)
   - Performance under load (1000+ practices)

3. **Input validation & data transformation** (8 tests)
   - Practice name validation (2-255 chars, alphanumeric + spaces)
   - Team name uniqueness
   - Email format validation
   - Big Five response range (1-5)
   - Event payload schema validation

4. **Error handling & edge cases** (8 tests)
   - Password hashing (bcrypt min 10 rounds)
   - JWT token generation and expiry
   - Conflict detection (version mismatch logic)
   - Draft auto-save serialization

5. **Business logic** (10 tests)
   - Invitation idempotency (adding user already on team)
   - Practice pillar mapping consistency
   - Issue status transitions (submitted → discussed → evaluated)
   - Adapter decision recording and outcome tracking

---

### 3.3 Integration Test Scope

**Focus Areas**:
1. **API endpoint contracts** (8 tests)
   - Auth: register, login, logout, refresh token
   - Teams: CRUD, invite, member management
   - Practices: add/remove, coverage calculation, edit details
   - Issues: create, comment, record decision, evaluate

2. **Team isolation enforcement** (5 tests)
   - Cross-team query attempts return 403
   - Foreign key constraints prevent orphaned data
   - Database-level team_id filter blocks invalid queries
   - Pagination doesn't leak cross-team data

3. **Event logging & audit trail** (4 tests)
   - Events logged for all mutations
   - Event schema validation (actor_id, team_id, entity_type, action, payload, created_at)
   - Concurrent events maintain causal order
   - Event export filtering works correctly

4. **Database transactions & consistency** (3 tests)
   - Issue + event both created or both rolled back
   - Comment + event atomic pair
   - Big Five submission + event transactional

5. **Optimistic concurrency & conflict resolution** (3 tests)
   - 409 response structure correct
   - Merge strategies (apply latest + re-apply, overwrite, save as comment)
   - Draft preservation during conflict

6. **Data integrity constraints** (2 tests)
   - NOT NULL constraints enforced
   - UNIQUE constraints prevent duplicates
   - Foreign key constraints maintain referential integrity

---

### 3.4 E2E Test Scope (Critical User Journeys)

**Focus Areas**:
1. **User signup & team onboarding** (2 tests)
   - Signup → login → teams view (empty state)
   - Create team → select practices → invite members (existing + new)

2. **Practice management & coverage** (1 test)
   - Browse catalog → add practices → verify coverage updates

3. **Big Five questionnaire** (1 test)
   - Complete 44-item questionnaire → view profile → verify reverse-coded items

4. **Issue submission & discussion** (2 tests)
   - Submit issue (< 2 min friction) → comment → record decision
   - Concurrent edit scenario (optimistic locking, conflict resolution)

5. **Research data export** (1 test)
   - Filter and export events → verify CSV includes correct fields

6. **Error recovery** (1 test)
   - Draft recovery after browser crash/refresh

7. **Multi-team switching** (1 test)
   - User in 2+ teams → switch between teams → verify isolation

---

## 4. NFR Testing Approach

### 4.1 Security Testing

**Strategy**: Automated security tests for auth, authz, input validation, secret handling.

**Test Coverage**:
- ✅ Authentication: JWT tokens expire after 1 hour, refresh tokens rotate
- ✅ Authorization: RBAC enforced (owner ≠ member permissions), 403 for insufficient role
- ✅ Secrets: Passwords never logged, JWT secret from environment, no hardcoded keys
- ✅ Data Integrity: Parameterized queries prevent SQL injection, React auto-escapes XSS
- ✅ Team Isolation: Cross-team access blocked at middleware + database level

**Test Effort**: 20 hours (security test matrix, penetration scenarios, secret scanning)

---

### 4.2 Performance Testing

**Strategy**: k6 load testing for SLO/SLA enforcement (API response times, throughput, resource usage).

**SLOs (Service Level Objectives)**:
- ✅ API responses: p95 < 500ms, p99 < 1s (even under load)
- ✅ Coverage calculation: < 500ms (denormalized cache)
- ✅ Big Five scoring: < 100ms
- ✅ Event export: < 2s for 10K events

**Test Scenarios**:
1. **Spike test**: Ramp from 1 → 50 users over 1 minute
   - Verify p95 response time < 500ms at peak
   - No requests drop or timeout

2. **Sustained load test**: 50 concurrent users for 5 minutes
   - Verify stable response times (no degradation)
   - Connection pool not exhausted (reuse working)

3. **Stress test**: Increase load until system breaks (>100 users)
   - Identify failure point
   - Graceful degradation (errors, not hangs)

**Test Effort**: 18 hours (k6 scenario design, baseline measurement, bottleneck analysis)

---

### 4.3 Reliability Testing

**Strategy**: Error handling validation, retry logic, health checks, graceful degradation.

**Test Coverage**:
- ✅ Database connection failure: Graceful 503 response, no data corruption
- ✅ Timeout handling: Long-running queries killed after 30s, client shows "Please retry"
- ✅ Network partition: App state preserved, retries succeed when connection restored
- ✅ Cascade failures: One service fails, others degrade gracefully (not cascade failure)
- ✅ Data consistency: After any failure + recovery, database state consistent (no orphaned records)

**Test Scenarios**:
1. **Database failure recovery** (15 min down, then restart)
   - Mutations queued, retried on recovery
   - Partial state not persisted

2. **API timeout handling** (simulate slow endpoint)
   - Frontend shows loading state, not stuck
   - Retry logic with exponential backoff
   - Max 3 retries then fail gracefully

3. **Large data handling**
   - Export 100K events → memory not exhausted
   - Pagination prevents browser freeze
   - Streaming response instead of buffering

**Test Effort**: 16 hours (failure injection, recovery validation, cascade scenario testing)

---

### 4.4 Data Integrity Testing

**Strategy**: Validate Big Five calculation, event log completeness, coverage correctness.

**Test Coverage**:
- ✅ Big Five accuracy: Scores match IPIP-NEO reference (within 0.1 percentile)
- ✅ Reverse-coding: ~9 items inverted correctly
- ✅ Event completeness: All 23 FRs mapped to event types, every mutation logged
- ✅ Coverage calculation: Formula matches spec (pillars_covered / 19 * 100)
- ✅ Category breakdown: 5 categories, 19 pillars, no duplication

**Test Effort**: 15 hours (reference data validation, formula verification, event audit trail)

---

### 4.5 Accessibility Testing

**Strategy**: WCAG AA compliance for keyboard navigation, screen readers, contrast ratios.

**Test Coverage**:
- ✅ Keyboard navigation: Tab through all interactive elements, Enter/Space activate
- ✅ Screen readers: Form labels, ARIA landmarks, semantic HTML
- ✅ Contrast: Text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- ✅ Focus management: Focus visible, not trapped, focus order logical

**Test Effort**: 10 hours (accessibility audits, screen reader testing, contrast validation)

---

## 5. Test Environment Requirements

### 5.1 Local Development Environment

**Setup (via Docker Compose)**:
```yaml
version: '3.8'
services:
  postgres-test:
    image: postgres:14
    environment:
      POSTGRES_DB: test_team_1
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test_password
    ports:
      - "5432:5432"

  backend-test:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://test:test_password@postgres-test/test_team_1
      JWT_SECRET: test-secret-key
      NODE_ENV: test
    ports:
      - "3000:3000"

  frontend-test:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
```

**Setup Commands**:
```bash
# Start containers
docker-compose up -d

# Run migrations
npm run migrate --workspace backend

# Seed test data
npm run seed --workspace backend

# Run tests
npm run test:integration --workspace backend
npm run test:e2e --workspace frontend
```

---

### 5.2 CI/CD Test Pipeline

**Stages**:
1. **Lint & Type Check** (1 min)
   - ESLint, Prettier, TypeScript strict mode
   - No formatting errors, no type violations

2. **Unit Tests** (2 min)
   - Jest with coverage reporting
   - Must pass 100%, coverage ≥80% for critical paths

3. **Integration Tests** (5 min)
   - API contract validation
   - Team isolation verification
   - Event logging audit

4. **E2E Tests** (6 min)
   - Playwright user journeys
   - Critical path coverage
   - Visual regression (optional)

5. **Security & Performance** (8 min)
   - OWASP validation
   - k6 load test (p95 < 500ms)
   - Secret scanning

6. **Build & Deployment** (2 min)
   - Compile TypeScript
   - Bundle frontend
   - Docker build

**Total CI Time**: ~25 minutes (can parallelize unit + security)

---

## 6. Testability Concerns & Mitigations

### Concern #1: Big Five Calculation Complexity

**Issue**: Reverse-coded items + trait aggregation easy to get wrong; misalignment with IPIP-NEO standard compromises research validity.

**Mitigation**:
- ✅ Unit tests against IPIP-NEO reference data (5 representative profiles)
- ✅ Explicit documentation of reverse-coded items (which items, which traits)
- ✅ Domain expert (psychometrician) review before week 2 deploy
- ✅ Automated regression tests prevent future changes

**Owner**: Backend developer (test), Psychometrician (review)  
**Deadline**: End of Week 1  
**Waiver**: Not acceptable; blocks MVP

---

### Concern #2: Event Logging Consistency Across Databases

**Issue**: Each team has separate PostgreSQL instance; event schema must be identical across all DBs; migrations must apply to all or none.

**Mitigation**:
- ✅ Automated schema validation: Migration script verifies all DBs at same version before startup
- ✅ Transactional event writes: Event + mutation succeed/fail together
- ✅ Event audit trail: Daily reconciliation job verifies event counts across teams
- ✅ Migration rollback plan: If any DB migration fails, rollback all (all-or-nothing)

**Owner**: Backend developer  
**Deadline**: End of Week 1  
**Waiver**: Not acceptable; blocks MVP

---

### Concern #3: Performance Under Concurrent Writes

**Issue**: Multiple teams editing simultaneously; optimistic locking with version fields may create conflicts under load.

**Mitigation**:
- ✅ Concurrent write test: 50 users, each editing different issues → measure conflict rate
- ✅ Conflict resolution UX validated: 3-path merge UI tested manually and E2E
- ✅ Performance baseline: Response time remains < 500ms even with 20% conflict rate
- ✅ Load test with real data (1000+ practices, 100+ issues per team)

**Owner**: Backend developer (load test), Frontend developer (UX validation)  
**Deadline**: End of Week 2  
**Waiver**: Acceptable if conflict rate < 5% under normal load; document in release notes

---

### Concern #4: Mobile/Responsive Design Not Tested

**Issue**: Architecture supports only desktop (no responsive breakpoints specified); mobile UX untested.

**Mitigation**:
- ✅ No responsive design required (per PRD scope)
- ✅ E2E tests run on Chrome desktop only (no mobile emulation)
- ✅ Team explicitly told: "Mobile not supported" in docs
- ✅ UX spec includes only desktop layouts

**Owner**: PM (scope), Frontend developer (documentation)  
**Deadline**: Product brief sign-off  
**Waiver**: Acceptable; explicitly out of scope

---

## 7. Test Quality Definition of Done

A test is "done" when it meets:

- ✅ **Isolation**: Test runs independently, no side effects on other tests
- ✅ **Determinism**: Same test run multiple times produces same result (no flakiness)
- ✅ **Clarity**: Test name + assertions clearly show what's being tested
- ✅ **Maintainability**: Easy to update if requirements change
- ✅ **Coverage**: Tests both happy path and error cases
- ✅ **Performance**: Test runs < 5 seconds (unit < 100ms, integration < 1s, E2E < 5s)
- ✅ **Documentation**: Why this test exists (what risk does it mitigate?)

**Validation**:
```typescript
// Example: Well-written test
describe('Team Isolation', () => {
  it('prevents member of Team A from viewing Team B issues', async () => {
    // Setup: Create isolated test teams
    const teamA = await createTeam('Team A');
    const teamB = await createTeam('Team B');
    const userInA = await createUser({email: 'user@team-a.com'});
    await addTeamMember(teamA.id, userInA.id);
    
    // Act: User A logs in and requests Team B's issues
    const token = await login(userInA);
    const response = await request.get(`/api/teams/${teamB.id}/issues`, {
      headers: {Authorization: `Bearer ${token}`}
    });
    
    // Assert: 403 Forbidden (not 200, not 500)
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('insufficient_permissions');
    
    // Cleanup: Automatic (test database reset between tests)
  });
});
```

---

## 8. Recommendations for Sprint 0 (Weeks 1-2)

### Week 1: Test Infrastructure & Critical Path Tests

**Deliverables**:
1. ✅ Test environment setup (Docker Compose, database seeding, CI pipeline scaffolding)
2. ✅ Unit tests for Big Five scoring (validate algorithm against IPIP-NEO)
3. ✅ Integration tests for team isolation (cross-team access rejected)
4. ✅ Integration tests for event logging (complete audit trail)
5. ✅ Database constraint validation (NOT NULL, UNIQUE, FK)

**Effort**: ~50 hours  
**Owner**: Test architect + 2 developers (backend)  
**Success Criteria**:
- ✅ All security tests green (auth, authz, secrets)
- ✅ All data integrity tests green (Big Five accuracy, event completeness)
- ✅ Team isolation verified (no data leaks)

---

### Week 2: Feature Tests & E2E Validation

**Deliverables**:
1. ✅ Integration tests for all API endpoints (auth, teams, practices, issues, Big Five)
2. ✅ E2E tests for critical user journeys (signup, team creation, issue submission)
3. ✅ Optimistic concurrency tests (conflict detection, resolution UI)
4. ✅ Performance baseline tests (API response times, coverage calculation speed)
5. ✅ Draft preservation & recovery tests

**Effort**: ~40 hours  
**Owner**: Test architect + 2 developers (frontend + backend)  
**Success Criteria**:
- ✅ 100% API endpoint coverage (integration tests)
- ✅ Critical paths validated (E2E tests)
- ✅ Performance meets SLOs (p95 < 500ms)

---

### Week 3: Regression Tests & Production Readiness

**Deliverables**:
1. ✅ End-to-end data flow tests (signup → team creation → Big Five → issue → decision → export)
2. ✅ Regression test suite (prevent previously fixed bugs from re-appearing)
3. ✅ Load & stress tests (k6 performance validation)
4. ✅ Security penetration tests (SQL injection, XSS, OWASP Top 10)
5. ✅ Production readiness checklist (all systems operational, monitoring active)

**Effort**: ~20 hours  
**Owner**: Test architect + 1 developer (backend) + 1 developer (frontend)  
**Success Criteria**:
- ✅ Load test passes (50 concurrent users, p95 < 500ms)
- ✅ No security vulnerabilities
- ✅ All tests green, coverage ≥80% for critical paths

---

## 9. Gate Criteria (Phase 3 → Phase 4)

Before moving to implementation solutioning (Phase 4), verify:

- ✅ **Controllability**: System state fully controllable via API + database
- ✅ **Observability**: Event log captures all mutations, queries enable state inspection
- ✅ **Reliability**: Error paths tested, failures graceful, recovery validated
- ✅ **Team Isolation**: Cross-team access blocked at all layers (middleware, database, API)
- ✅ **Data Integrity**: Big Five accuracy, event completeness, coverage calculations correct
- ✅ **Test Strategy**: Unit/Integration/E2E split (50/35/15), effort estimated (~80-100 hours)
- ✅ **No Blocking Concerns**: All architectural decisions support comprehensive test coverage

**Gate Status**: ✅ **PASS** — Architecture is testable, comprehensive test strategy defined, ready for implementation.

---

## 10. Summary & Next Steps

### Current Status: System-Level Testability Review COMPLETE

**Architecture Assessment**:
| Dimension | Status | Evidence |
|-----------|--------|----------|
| **Controllability** | ✅ PASS | Per-team databases, event-driven design, API control |
| **Observability** | ✅ PASS | Event logs, correlation IDs, database queries, structured errors |
| **Reliability** | ✅ PASS | Constraint enforcement, transaction wrappers, error handling |
| **Isolation** | ✅ PASS | Database-level team isolation, middleware validation, API filtering |
| **Research Integrity** | ✅ PASS | Immutable event logs, Big Five algorithm, coverage calculations |

**Test Strategy Summary**:
- **Unit tests (50%)**: 35 tests, Big Five scoring, coverage calculations, validation logic
- **Integration tests (35%)**: 25 tests, API contracts, team isolation, event logging
- **E2E tests (15%)**: 10 tests, critical user journeys, optimistic concurrency, data export
- **Total effort**: 80–100 hours (Weeks 1–2 of implementation)

**Recommendations for Implementation Phase**:
1. **Week 1**: Test infrastructure, Big Five validation, team isolation tests, event audit trail
2. **Week 2**: Feature tests for all endpoints, E2E validation, performance baseline
3. **Week 3**: Regression suite, load tests, security penetration, production readiness

**No blockers** — all architectural concerns addressed with documented mitigations and owners.

---

**Document Status**: ✅ **Complete**  
**Gate Decision**: ✅ **PASS** — Ready for implementation solutioning  
**Next Workflow**: Run `*atdd` (ATDD) to generate failing tests for P0 scenarios, then `*automate` for comprehensive test implementation.

