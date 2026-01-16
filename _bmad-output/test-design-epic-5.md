# Epic-Level Test Design - Epic 5: Adaptation Decision & Tracking

**Project**: bmad_version | **Epic**: 5 — Adaptation Decision & Tracking  
**Mode**: Epic-Level | **Scope**: Record decisions, track resolution, generate recommendations

---

## Epic Overview

**Goal**: Document practice adaptation decisions and track outcomes.  
**Value**: Decisions recorded, progress visible, recommendations informed by Big Five.  
**Stories**: 5.1–5.3 (3 stories) | **FRs**: FR15–18

---

## Risk Assessment

### Risk 5.1: Recommendation Engine Accuracy (Low-Medium)

**Probability**: 1 (Unlikely — recommendations are suggestions, not required for MVP)  
**Impact**: 2 (Degraded — poor recommendations confuse users)  
**Score**: 2 (LOW) — Document only

**Mitigation**:
- Recommendations based on: Big Five profile + coverage gaps
- Labeled as "suggestions, discuss with team"
- Framing non-prescriptive

**Priority**: P2 | **Effort**: 6 hours

---

## Coverage Matrix

| Story | Test Level | Priority | Tests |
|-------|-----------|----------|-------|
| 5.1 Record decision | API + E2E | P0 | 4 |
| 5.2 Update status | API + E2E | P1 | 3 |
| 5.3 Show recommendations | API + E2E | P1 | 4 |

**Total**: ~11 tests, ~2 min runtime

---

## Test Scenarios

### Integration Tests (6 tests)

**5.1.1: POST /api/issues/{id}/decision records adaptation**
```typescript
test('record adaptation decision on issue', async ({request}) => {
  const res = await request.post(`/api/issues/${issueId}/decision`, {
    data: {description: 'Switch to async standups'},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(201);
  const decision = await res.json();
  expect(decision.status).toBe('Adaptation in Progress');
});
```

**5.2.1: PUT /api/issues/{id}/evaluate marks as evaluated**
```typescript
test('evaluate adaptation after 1-2 sprints', async ({request}) => {
  const res = await request.put(`/api/issues/${issueId}/evaluate`, {
    data: {outcome: 'successful', feedback: 'Team is happier'},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(200);
  const issue = await res.json();
  expect(issue.status).toBe('Evaluated');
});
```

**5.3.1: GET /api/issues/{id}/recommendations**
```typescript
test('get recommendations based on Big Five + coverage', async ({request}) => {
  const res = await request.get(`/api/issues/${issueId}/recommendations`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(200);
  const recs = await res.json();
  expect(recs.items.length).toBeGreaterThan(0);
  recs.items.forEach(rec => {
    expect(rec.reason).toContain('Big Five') || expect(rec.reason).toContain('coverage');
  });
});
```

### E2E Tests (3 tests)

**5.1.2: Record decision in UI**
```typescript
test('user records decision via modal', async ({page}) => {
  await page.goto(`/issues/${issueId}`);
  await page.click('[data-testid="record-decision"]');
  
  await page.fill('[data-testid="decision-text"]', 'Switch to async');
  await page.click('[data-testid="save-decision"]');
  
  await expect(page.getByText('Adaptation in Progress')).toBeVisible();
});
```

**5.2.2: Evaluate outcome after sprint**
```typescript
test('evaluate adaptation: was it effective?', async ({page}) => {
  await page.goto(`/issues/${issueId}`);
  await page.click('[data-testid="evaluate"]');
  
  await page.selectOption('[data-testid="outcome"]', 'successful');
  await page.fill('[data-testid="feedback"]', 'Team is happier');
  await page.click('[data-testid="save"]');
  
  await expect(page.getByText('Evaluated')).toBeVisible();
});
```

**5.3.2: View recommendations sidebar**
```typescript
test('recommendations shown in issue sidebar', async ({page}) => {
  await page.goto(`/issues/${issueId}`);
  
  const recs = await page.locator('[data-testid="recommendation"]');
  await expect(recs).not.toHaveCount(0);
  
  await recs.first().hover();
  await expect(page.getByText(/Big Five|coverage/)).toBeVisible();
});
```

---

## Quality Gate Criteria

**P0 (100%)**:
- Decision recording works
- Status updates flow
- Recommendations appear

**P1 (≥95%)**:
- Outcome evaluation complete
- Feedback captured

---

**Effort**: 40 story points, 15 hours testing

