# Epic-Level Test Design - Epic 2: Practice Catalog & Coverage

**Project**: bmad_version  
**Epic**: 2 — Practice Catalog & Coverage  
**Date**: 2026-01-15  
**Mode**: Epic-Level (Phase 4)  
**Scope**: Practice browsing, search, filtering, add/remove, coverage calculation

---

## Epic Overview

**Epic Goal**: Provide transparent visibility into agile practice portfolio and coverage gaps based on pillar mapping.

**User Value**: Teams see which agile principles (pillars) are covered and identify gaps.

**Stories Covered**: 2.1–2.8 (8 stories)  
**Functional Requirements**: FR8–10 (catalog, coverage, practice management)  
**Non-Functional Requirements**: NFR10–11 (UX, performance)

**Effort Estimate**: ~60 story points (Week 1–2 implementation)

---

## Risk Assessment

### Risk 2.1: Coverage Calculation Accuracy

**Description**: Pillar-level, category-level, or overall coverage calculated incorrectly due to formula bugs or inconsistent pillar mappings.

**Risk Score Analysis**:
- **Probability**: 3 (Likely) — Complex multi-level calculation (pillar %, category %, overall %)
- **Impact**: 2 (Degraded) — Wrong % displayed, but doesn't block functionality
- **Score**: 3 × 2 = **6 (HIGH)** — Requires mitigation

**Test Scenarios**:
- ✅ Pillar coverage: 14/19 pillars = 73.7% (exact formula)
- ✅ Category coverage: Human Values 4/5 = 80% (per-category calculation)
- ✅ Overall coverage: 3/5 categories complete = 60% (category completion)
- ✅ Coverage updates on practice add (recalculation triggered)
- ✅ Coverage updates on practice remove (recalculation triggered)
- ✅ Performance: calculation completes < 500ms (load test)

**Test Level**: Unit (calculation logic) + Integration (API)  
**Priority**: P0 (Research data accuracy)  
**Owner**: Backend developer  
**Effort**: 10 hours

**Mitigation**:
- Unit tests against known-good coverage scenarios (5 fixtures)
- Integration tests verify coverage after add/remove operations
- Performance baseline: measure calculation time, alert if > 500ms
- Formula documentation: explicit comment in code showing calculation

---

### Risk 2.2: Practice-Pillar Mapping Inconsistency

**Description**: Practice JSON import allows invalid pillar references or duplicate practices, breaking coverage calculations.

**Risk Score Analysis**:
- **Probability**: 2 (Possible) — Practice JSON schema validation may be incomplete
- **Impact**: 2 (Degraded) — Inconsistent mappings affect coverage, not core functionality
- **Score**: 2 × 2 = **4 (MEDIUM)** — Monitor and document

**Test Scenarios**:
- ✅ Practice pillar references validated on import (schema validation)
- ✅ Duplicate practice names rejected (unique constraint)
- ✅ Invalid pillar IDs rejected (FK validation)
- ✅ Missing required fields rejected (not null constraint)

**Test Level**: Unit (validation) + Integration (import)  
**Priority**: P1  
**Owner**: Backend developer  
**Effort**: 5 hours

**Mitigation**:
- JSON Schema validator with strict rules
- Database unique constraint on (practice_name, practice_version)
- Import test: run on sample data, verify count

---

### Risk 2.3: Search & Filter Performance Under Load

**Description**: Practice catalog search/filter slow with 1000+ practices (n-squared query, no indexes).

**Risk Score Analysis**:
- **Probability**: 2 (Possible) — Depends on query implementation and indexes
- **Impact**: 2 (Degraded) — Slow UI, but works; user waits a few seconds
- **Score**: 2 × 2 = **4 (MEDIUM)** — Monitor and document

**Test Scenarios**:
- ✅ Search with 1000 practices completes < 500ms (performance)
- ✅ Filter by pillar with 1000 practices < 500ms (index efficiency)
- ✅ Pagination doesn't fetch all practices (lazy loading)
- ✅ Database indexes exist for frequently searched fields (schema check)

**Test Level**: Integration (API load test) + k6 (performance)  
**Priority**: P2 (Nice to have, not blocking)  
**Owner**: Backend developer + Performance engineer  
**Effort**: 6 hours

**Mitigation**:
- Database indexes on: practice.name, practice.pillar_id
- Pagination enforced: limit 20 practices per request
- Query profiling: EXPLAIN ANALYZE on search query
- Load test: 100 concurrent searches, measure p95 latency

---

### Risk 2.4: Edit Conflict When Multiple Teams Edit Same Practice

**Description**: Two teams edit the same global practice simultaneously; one user's changes overwrite the other's (no version control).

**Risk Score Analysis**:
- **Probability**: 1 (Unlikely) — Global practice edits rare; mostly per-team customization
- **Impact**: 2 (Degraded) — Changes lost, but can re-edit
- **Score**: 1 × 2 = **2 (LOW)** — Document only

**Test Scenarios**:
- ✅ Concurrent practice edits detected via version field (409 conflict)
- ✅ User shown merge UI with 3 options (apply latest, overwrite, save as comment)
- ✅ No data loss (draft preserved locally)

**Test Level**: Integration (API concurrency)  
**Priority**: P2  
**Owner**: Backend developer  
**Effort**: 4 hours

**Mitigation**:
- Version field on practices table
- 409 conflict response on version mismatch
- Draft preservation in localStorage

---

## Coverage Matrix

| User Story | Acceptance Criteria | Risk Linked | Test Level | Priority | Test Count |
|-----------|-------------------|-------------|-----------|----------|-----------|
| 2.1 Load Catalog | Practices displayed with metadata | 2.2 | API + E2E | P0 | 4 |
| 2.2 Search & Filter | Search term filters, pillar filter works | 2.3 | API + E2E | P0 | 6 |
| 2.3 Add Practices | Add practice to team, coverage updates | 2.1 | API + E2E | P0 | 5 |
| 2.4 Remove Practices | Remove practice, coverage recalculated | 2.1 | API + E2E | P0 | 4 |
| 2.5 Create Custom Practice | Create from scratch or duplicate | None | API + E2E | P1 | 6 |
| 2.6 Pillar-Level Coverage | Display 14/19 pillars, visual progress | 2.1 | API + E2E | P0 | 4 |
| 2.7 Category Coverage | 5 categories with individual %, breakdown | 2.1 | API + E2E | P0 | 4 |
| 2.8 Edit Practice | Edit title, goal, pillars, category | 2.4 | API + E2E | P1 | 5 |

**Total Test Count**: ~38 tests  
**Estimated Runtime**: ~5 minutes

---

## Quality Gate Criteria

**P0 Tests Must Pass (100%)**:
- ✅ Coverage calculation accuracy (10 tests)
- ✅ Practice add/remove operations (9 tests)
- ✅ Search & filter functionality (6 tests)
- ✅ Catalog loading (4 tests)

**P1 Tests Should Pass (≥95%)**:
- ✅ Custom practice creation (6 tests)
- ✅ Practice editing (5 tests)

**Performance Targets**:
- ✅ Search/filter: p95 < 500ms
- ✅ Coverage calculation: < 500ms
- ✅ API responses: p95 < 200ms

---

## Test Scenarios by Level

### Unit Tests (8 tests, <1 min)

**2.1.1: Pillar coverage calculation**
```typescript
test('pillar coverage: 14/19 pillars = 73.7%', async () => {
  const practices = [
    {pillars: ['Communication', 'Feedback', 'TDD']},
    {pillars: ['Feedback', 'Refactoring', 'Simplicity']},
  ];
  
  const coverage = calculatePillarCoverage(practices);
  expect(coverage.pillarsCount).toBe(6); // 6 unique pillars
  expect(coverage.totalPillars).toBe(19);
  expect(coverage.percentage).toBeCloseTo(31.6, 1); // 6/19 * 100
});
```

**2.1.2: Category coverage calculation**
```typescript
test('category coverage: Human Values 4/5 = 80%', async () => {
  const humanValuesPillars = ['Communication', 'Courage', 'Humility', 'Transparency']; // 4/5
  
  const coverage = calculateCategoryCoverage('human_values', humanValuesPillars);
  expect(coverage.covered).toBe(4);
  expect(coverage.total).toBe(5);
  expect(coverage.percentage).toBe(80);
});
```

**2.1.3: Overall coverage calculation**
```typescript
test('overall coverage: 3/5 categories complete = 60%', async () => {
  const categories = {
    human_values: 5, // complete
    feedback_learning: 6, // complete
    technical_excellence: 5, // complete
    organization: 3, // incomplete (4 available)
    flow_speed: 2, // incomplete (3 available)
  };
  
  const coverage = calculateOverallCoverage(categories);
  expect(coverage.categoriesComplete).toBe(3);
  expect(coverage.totalCategories).toBe(5);
  expect(coverage.percentage).toBe(60);
});
```

**2.2.1: Search filters by practice name**
```typescript
test('search "standup" returns relevant practices', async () => {
  const practices = [
    {name: 'Daily Standup', id: 1},
    {name: 'Async Standup', id: 2},
    {name: 'Sprint Planning', id: 3},
  ];
  
  const results = filterPractices(practices, {search: 'standup'});
  expect(results).toHaveLength(2);
  expect(results.map(p => p.id)).toEqual([1, 2]);
});
```

---

### Integration Tests (18 tests, ~3 min)

**2.1.2: Load catalog endpoint**
```typescript
test('GET /api/practices returns all practices', async ({request}) => {
  const response = await request.get('/api/practices');
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.items.length).toBeGreaterThan(0);
  expect(body.total).toBeDefined();
  expect(body.items[0]).toHaveProperty('id');
  expect(body.items[0]).toHaveProperty('name');
  expect(body.items[0]).toHaveProperty('pillars');
});
```

**2.2.2: Search endpoint with pagination**
```typescript
test('GET /api/practices?search=standup&page=1&pageSize=10', async ({request}) => {
  const response = await request.get('/api/practices', {
    params: {search: 'standup', page: 1, pageSize: 10}
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.items.length).toBeLessThanOrEqual(10);
  expect(body.pageSize).toBe(10);
  expect(body.total).toBeDefined();
});
```

**2.3.1: Add practice to team**
```typescript
test('POST /api/teams/{id}/practices adds practice', async ({request}) => {
  const team = await createTeam('Team');
  
  const response = await request.post(`/api/teams/${team.id}/practices`, {
    data: {practiceId: 5},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(response.status()).toBe(201);
  
  // Verify in DB
  const teamPractices = await db.team_practices.findAll({
    where: {teamId: team.id}
  });
  expect(teamPractices.map(tp => tp.practiceId)).toContain(5);
});
```

**2.3.2: Coverage recalculates on practice add**
```typescript
test('coverage updates immediately after adding practice', async ({request}) => {
  const team = await createTeam('Team');
  const initialCoverage = await getCoverage(team.id);
  
  // Add practice covering 3 new pillars
  await request.post(`/api/teams/${team.id}/practices`, {
    data: {practiceId: 5},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  const newCoverage = await getCoverage(team.id);
  expect(newCoverage.pillarsCovered).toBeGreaterThan(initialCoverage.pillarsCovered);
});
```

**2.4.1: Remove practice from team**
```typescript
test('DELETE /api/teams/{id}/practices/{practiceId} removes', async ({request}) => {
  const team = await createTeamWithPractices('Team', [1, 2, 3]);
  
  const response = await request.delete(`/api/teams/${team.id}/practices/2`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(response.status()).toBe(200);
  
  // Verify removed from DB
  const teamPractices = await db.team_practices.findAll({
    where: {teamId: team.id}
  });
  expect(teamPractices.map(tp => tp.practiceId)).not.toContain(2);
});
```

**2.6.1: Pillar coverage endpoint**
```typescript
test('GET /api/teams/{id}/coverage/pillars returns breakdown', async ({request}) => {
  const team = await createTeamWithPractices('Team', [1, 2, 3]);
  
  const response = await request.get(`/api/teams/${team.id}/coverage/pillars`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.coveredPillars.length).toBeGreaterThan(0);
  expect(body.gapPillars.length).toBeGreaterThan(0);
  expect(body.percentage).toBeGreaterThan(0);
});
```

**2.7.1: Category coverage breakdown**
```typescript
test('GET /api/teams/{id}/coverage/categories returns 5 categories', async ({request}) => {
  const team = await createTeamWithPractices('Team', [1, 2, 3]);
  
  const response = await request.get(`/api/teams/${team.id}/coverage/categories`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.categories).toHaveLength(5);
  expect(body.categories.every(c => c.percentage !== undefined)).toBe(true);
});
```

---

### E2E Tests (4 tests, ~2 min)

**2.1.3: Browse catalog and view practice details**
```typescript
test('user can browse catalog and click practice', async ({page}) => {
  await page.goto('/practices');
  
  // List loads
  const practices = await page.locator('[data-testid="practice-card"]');
  await expect(practices).not.toHaveCount(0);
  
  // Click on practice
  await practices.first().click();
  
  // Detail sidebar opens
  await expect(page.locator('[data-testid="practice-detail"]')).toBeVisible();
  await expect(page.getByText(/Goal|Objective/)).toBeVisible();
});
```

**2.2.3: Search and filter in UI**
```typescript
test('user can search practices by name', async ({page}) => {
  await page.goto('/practices');
  
  // Search
  await page.fill('[data-testid="search-input"]', 'standup');
  
  // Results update
  const cards = await page.locator('[data-testid="practice-card"]');
  await expect(cards.first()).toContainText(/standup/i);
});
```

**2.3.3: Add practice and see coverage update**
```typescript
test('add practice from catalog, coverage updates', async ({page}) => {
  const team = await createTeamWithPractices('Team', [1, 2]);
  await loginAndGoToTeam(team);
  
  const initialCoverage = await page.locator('[data-testid="coverage-percentage"]').textContent();
  
  // Add practice
  await page.click('[data-testid="add-practices"]');
  await page.check('[data-testid="practice-daily-standup"]');
  await page.click('[data-testid="save-button"]');
  
  // Coverage updates
  const newCoverage = await page.locator('[data-testid="coverage-percentage"]').textContent();
  expect(parseFloat(newCoverage)).toBeGreaterThan(parseFloat(initialCoverage));
});
```

---

## Effort & Timeline

**Development**: 60 story points  
**Testing**: 28 hours  
**Total**: ~88 hours (Week 1–2)

---

**Document Status**: ✅ Complete  
**Next**: Epic 3 — Big Five Personality Profiling

