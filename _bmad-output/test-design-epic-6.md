# Epic-Level Test Design - Epic 6: Research Data Integrity & Event Logging

**Project**: bmad_version | **Epic**: 6 — Research Data Integrity & Event Logging  
**Mode**: Epic-Level | **Scope**: Event logging, immutability, audit trail, export

---

## Epic Overview

**Goal**: Capture immutable, queryable event logs for research analysis.  
**Value**: Academic validity, audit trail, reproducibility.  
**Stories**: 6.1–6.3 (2 stories) | **FRs**: FR17–18 | **Parallel with other epics**

---

## Risk Assessment

### Risk 6.1: Event Logging Completeness (Critical)

**Probability**: 3 (Likely — easy to miss mutations)  
**Impact**: 3 (Critical — research validity depends on complete audit trail)  
**Score**: 9 **BLOCK** — All mutations must be logged

**Mitigations**:
- Checklist of all 23 FRs → event types
- Transactional wrappers: mutation + event both succeed/fail
- Audit: daily reconciliation of event count

**Priority**: P0 | **Effort**: 12 hours

### Risk 6.2: Event Immutability Enforcement (Critical)

**Probability**: 2 (Possible — easy to accidentally allow DELETE)  
**Impact**: 3 (Critical — tampered audit trail is useless)  
**Score**: 6 (HIGH) — Requires mitigation

**Mitigations**:
- Database REVOKE UPDATE/DELETE on events table
- Application-level immutability check
- Manual batch purge only (logged)

**Priority**: P0 | **Effort**: 5 hours

---

## Coverage Matrix

| Story | Test Level | Priority | Tests |
|-------|-----------|----------|-------|
| 6.1 Log all events | Integration | P0 | 8 |
| 6.2 Immutability | Database + Integration | P0 | 4 |
| 6.3 Export & filter | API + E2E | P1 | 5 |

**Total**: ~17 tests, ~2 min runtime

---

## Test Scenarios

### Integration Tests (12 tests)

**6.1.1: Issue created → event logged**
```typescript
test('issue.created event logged on submission', async ({request}) => {
  const issueRes = await request.post('/api/issues', {
    data: {practiceId: 1, description: 'Standup too long'}
  });
  
  expect(issueRes.status()).toBe(201);
  const issue = await issueRes.json();
  
  // Query event log
  const events = await db.events.findAll({
    where: {eventType: 'issue.created', entityId: issue.id}
  });
  
  expect(events).toHaveLength(1);
  expect(events[0].teamId).toBe(authenticatedUser.teamId);
  expect(events[0].payload.issueId).toBe(issue.id);
});
```

**6.1.2: Comment added → event logged**
```typescript
test('issue.comment_added event logged', async ({request}) => {
  const commentRes = await request.post(`/api/issues/${issueId}/comments`, {
    data: {text: 'Try async standups'}
  });
  
  const events = await db.events.findAll({
    where: {eventType: 'issue.comment_added'}
  });
  
  expect(events.length).toBeGreaterThan(0);
});
```

**6.1.3: Big Five completed → event logged**
```typescript
test('big_five.completed event logged with scores', async ({request}) => {
  await request.post('/api/big-five', {
    data: {responses: generateResponses44()}
  });
  
  const events = await db.events.findAll({
    where: {eventType: 'big_five.completed'}
  });
  
  expect(events).toHaveLength(1);
  expect(events[0].payload.openness).toBeDefined();
});
```

**6.1.4: Practice added → event logged**
```typescript
test('practice.added event logged', async ({request}) => {
  const practiceRes = await request.post(`/api/teams/${teamId}/practices`, {
    data: {practiceId: 5}
  });
  
  const events = await db.events.findAll({
    where: {eventType: 'practice.added', teamId}
  });
  
  expect(events).toHaveLength(1);
  expect(events[0].payload.practiceId).toBe(5);
});
```

**6.2.1: Database prevents DELETE on events**
```typescript
test('DELETE on events table is forbidden', async () => {
  expect(async () => {
    await db.exec('DELETE FROM events WHERE id = 1');
  }).rejects.toThrow(/permission denied|REVOKE/i);
});
```

**6.2.2: Database prevents UPDATE on events**
```typescript
test('UPDATE on events table is forbidden', async () => {
  expect(async () => {
    await db.exec('UPDATE events SET payload = \'{}\'  WHERE id = 1');
  }).rejects.toThrow(/permission denied|REVOKE/i);
});
```

**6.2.3: Transactional atomicity**
```typescript
test('mutation + event both succeed or both rollback', async () => {
  // Simulate transaction failure mid-operation
  const originalCommit = db.transaction.commit;
  let failAfterEvent = false;
  
  db.transaction.commit = () => {
    if (failAfterEvent) throw new Error('Simulated failure');
    return originalCommit();
  };
  
  // Create issue, trigger failure during event write
  failAfterEvent = true;
  expect(async () => {
    await createIssueWithTransaction();
  }).rejects.toThrow();
  
  // Verify both rolled back
  const issues = await db.issues.findAll({});
  const events = await db.events.findAll({});
  expect(issues).toHaveLength(0); // Issue not created
  expect(events).toHaveLength(0); // Event not created
});
```

**6.3.1: Export events by type and date**
```typescript
test('GET /api/events?eventType=issue.created&from=2026-01-15', async ({request}) => {
  const res = await request.get('/api/events', {
    params: {
      eventType: 'issue.created',
      from: '2026-01-15',
      to: '2026-01-16'
    },
    headers: {Authorization: `Bearer ${ownerToken}`}
  });
  
  expect(res.status()).toBe(200);
  const events = await res.json();
  expect(events.items.every(e => e.eventType === 'issue.created')).toBe(true);
});
```

**6.3.2: Export anonymized for research**
```typescript
test('export CSV has anonymized user IDs', async ({request}) => {
  const res = await request.get('/api/events/export?format=csv', {
    headers: {Authorization: `Bearer ${researcherToken}`}
  });
  
  expect(res.status()).toBe(200);
  const csv = await res.text();
  
  // No emails, names, passwords in export
  expect(csv).not.toContain('@');
  expect(csv).not.toContain('john');
  expect(csv).not.toContain('secret');
  
  // Has anonymized IDs
  expect(csv).toContain('a3f5b9'); // SHA256 hash example
});
```

### E2E Tests (2 tests)

**6.3.3: Export events via UI**
```typescript
test('user exports events for research', async ({page}) => {
  await page.goto('/data-export');
  
  // Filter by date range
  await page.fill('[data-testid="from-date"]', '2026-01-01');
  await page.fill('[data-testid="to-date"]', '2026-01-31');
  
  // Select format
  await page.selectOption('[data-testid="format"]', 'csv');
  
  // Download
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="export"]');
  const download = await downloadPromise;
  
  expect(download.suggestedFilename()).toContain('events');
});
```

---

## Quality Gate Criteria

**P0 (100% pass)**:
- All 23 FRs mapped to events
- Every mutation logged
- Immutability enforced (no UPDATE/DELETE)
- Transactional atomicity
- Export works with filtering
- Data anonymized in export

**Audit Checklist**:
- Event log has no gaps (count matches mutations)
- All events have: actor_id, teamId, created_at, payload
- Oldest event = first mutation in system
- No duplicate events

---

**Effort**: 45 story points, 20 hours testing (parallel with other epics)

