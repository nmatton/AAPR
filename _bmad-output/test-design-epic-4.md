# Epic-Level Test Design - Epic 4: Issue Submission & Discussion

**Project**: bmad_version | **Epic**: 4 — Issue Submission & Discussion  
**Mode**: Epic-Level | **Scope**: Issue form, discussion threads, status tracking, conflict resolution

---

## Epic Overview

**Goal**: Friction-free issue submission and team discussion with conflict resolution.  
**Value**: Developers voice difficulties in < 2 minutes, teams discuss collaboratively.  
**Stories**: 4.1–4.4 (5 stories) | **FRs**: FR13–14, FR19–20

---

## Risk Assessment

### Risk 4.1: Optimistic Concurrency Conflicts (High)

**Probability**: 2 (Possible — happens with 8 teams editing simultaneously)  
**Impact**: 3 (Critical — user frustration, data loss if not handled)  
**Score**: 6 (HIGH) — Requires mitigation

**Test Scenarios**:
- Two users edit same issue in parallel → 409 Conflict
- Conflict response includes version + latest state
- UI shows merge options (apply latest, overwrite, save as comment)
- Draft preserved locally, never lost

**Priority**: P0 | **Effort**: 8 hours

### Risk 4.2: Draft Auto-Save Failures (Medium)

**Probability**: 2 (Possible — localStorage can be cleared)  
**Impact**: 2 (Degraded — user loses draft, must retype)  
**Score**: 4 (MEDIUM) — Monitor

**Test Scenarios**:
- Draft auto-saved every 5s during editing
- Browser refresh restores draft
- Draft cleared on successful submission
- Notification: "Draft saved" toast

**Priority**: P2 | **Effort**: 4 hours

---

## Coverage Matrix

| Story | Test Level | Priority | Tests |
|-------|-----------|----------|-------|
| 4.1 Submit issue | Unit + API + E2E | P0 | 6 |
| 4.2 View issue detail | API + E2E | P0 | 4 |
| 4.3 Comment in thread | API + E2E | P1 | 5 |
| 4.4 Handle conflicts | Integration + E2E | P0 | 6 |

**Total**: ~21 tests, ~3 min runtime

---

## Test Scenarios

### Unit Tests (2 tests)

**4.1.1: Draft serialization**
```typescript
test('issue draft serialized to localStorage', async () => {
  const draft = {practiceId: 1, title: 'Standups too long', description: '...'};
  saveDraft(draft);
  
  const restored = loadDraft();
  expect(restored).toEqual(draft);
});
```

### Integration Tests (10 tests)

**4.1.2: POST /api/issues submits issue**
```typescript
test('submit issue links practice', async ({request}) => {
  const res = await request.post('/api/issues', {
    data: {practiceId: 1, description: 'Standups feel too long'},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(201);
  const issue = await res.json();
  expect(issue.practiceId).toBe(1);
  expect(issue.status).toBe('Submitted');
});
```

**4.2.1: GET /api/issues/{id} returns full history**
```typescript
test('issue detail includes comments and status changes', async ({request}) => {
  const res = await request.get(`/api/issues/${issueId}`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(200);
  const issue = await res.json();
  expect(issue.comments).toBeDefined();
  expect(issue.statusHistory).toBeDefined();
});
```

**4.3.1: POST /api/issues/{id}/comments adds comment**
```typescript
test('add comment to issue thread', async ({request}) => {
  const res = await request.post(`/api/issues/${issueId}/comments`, {
    data: {text: 'I think we should try async standups'},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(201);
  expect((await res.json()).id).toBeTruthy();
});
```

**4.4.1: PUT with stale version returns 409**
```typescript
test('concurrent edit detected, 409 conflict', async ({request}) => {
  // User 1 edits first
  await request.put(`/api/issues/${issueId}`, {
    data: {description: 'Updated', version: 1},
    headers: {Authorization: `Bearer ${token1}`}
  });
  
  // User 2 tries to save with old version
  const res = await request.put(`/api/issues/${issueId}`, {
    data: {description: 'Different update', version: 1},
    headers: {Authorization: `Bearer ${token2}`}
  });
  
  expect(res.status()).toBe(409);
  const conflict = await res.json();
  expect(conflict.code).toBe('version_conflict');
  expect(conflict.latestState).toBeDefined();
});
```

**4.4.2: Merge latest + re-apply user changes**
```typescript
test('apply latest + re-apply user edits', async () => {
  const latestFromDB = {
    description: 'Updated by user 1',
    version: 2
  };
  const userChanges = {
    description: 'User 2 feedback'
  };
  
  const merged = mergeConflict(latestFromDB, userChanges);
  expect(merged.description).toContain('Updated by user 1');
  expect(merged.description).toContain('User 2 feedback');
});
```

### E2E Tests (5 tests)

**4.1.3: Submit issue < 2 minutes**
```typescript
test('issue submission friction-free flow', async ({page}) => {
  const start = Date.now();
  
  await page.goto('/issues/new');
  await page.selectOption('[data-testid="practice"]', '1');
  await page.fill('[data-testid="description"]', 'Standups too long');
  await page.click('[data-testid="submit"]');
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(120000); // < 2 minutes
});
```

**4.2.2: View issue detail with comments**
```typescript
test('click issue, see detail with comments', async ({page}) => {
  await page.goto('/issues');
  await page.locator('[data-testid="issue-card"]').first().click();
  
  await expect(page.locator('[data-testid="issue-detail"]')).toBeVisible();
  await expect(page.locator('[data-testid="comments"]')).toBeVisible();
});
```

**4.4.3: Conflict UI with 3 merge options**
```typescript
test('conflict modal shows merge options', async ({page}) => {
  // Simulate concurrent edit
  const conflict = new Event('conflict', {detail: {latestVersion: 2}});
  page.evaluate(() => window.dispatchEvent(conflict));
  
  await expect(page.getByText('Item changed since')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Apply Latest'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Overwrite'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save as Comment'})).toBeVisible();
});
```

---

## Quality Gate Criteria

**P0 (100%)**:
- Issue submission working
- Conflict detection & resolution
- Draft preservation
- Comment threading

**Performance**:
- Issue submission < 2 seconds
- Comment post < 1 second
- Issue detail load < 500ms

---

**Effort**: 55 story points, 22 hours testing  
**Status**: Ready for Sprint Planning

