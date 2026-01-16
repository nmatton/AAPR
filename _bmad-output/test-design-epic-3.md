# Epic-Level Test Design - Epic 3: Big Five Personality Profiling

**Project**: bmad_version | **Epic**: 3 — Big Five Personality Profiling  
**Mode**: Epic-Level | **Scope**: 44-item questionnaire, score calculation, profile display

---

## Epic Overview

**Goal**: Users complete IPIP-NEO questionnaire and see personality profile.  
**Value**: Context for practice friction and recommendations.  
**Stories**: 3.1–3.2 (4 stories) | **FRs**: FR11–12 | **NFRs**: NFR6, NFR12–14

---

## Risk Assessment

### Risk 3.1: Big Five Scoring Algorithm Mismatch (Critical)

**Probability**: 3 (Likely — complex 44-item algorithm with reverse-coding)  
**Impact**: 3 (Critical — research validity depends on accuracy)  
**Score**: 9 **BLOCK** — Requires expert validation before deploy

**Mitigations**:
- ✅ Validate algorithm against IPIP-NEO reference implementation (5 test profiles)
- ✅ Document reverse-coded items explicitly (which items, which traits)
- ✅ Psychometrician review before Week 1 completion
- ✅ Automated regression tests prevent future changes

**Test Scenarios**:
- All 44 items collected and stored
- Reverse-coded items inverted correctly (~9 items)
- Trait scores calculated per IPIP-NEO formula
- Percentile normalization (if applicable)
- Edge cases: all-1s, all-5s, mixed

**Priority**: P0 | **Owner**: Backend dev + Psychometrician | **Effort**: 12 hours

---

### Risk 3.2: Data Privacy (Big Five Scores)

**Probability**: 2 (Possible — access control easy to miss)  
**Impact**: 3 (Critical — personality data exposure is privacy violation)  
**Score**: 6 (HIGH) — Requires mitigation

**Mitigations**:
- User sees own scores only (API checks user_id == authenticated_id)
- Owner sees team aggregate (AVG only, no individual scores)
- Export anonymized (user_id → SHA256 hash)

**Test Scenarios**:
- User cannot view teammate's scores (403)
- Owner views aggregate only (AVG, not individual)
- Export has anonymized IDs
- Research export excludes names/emails

**Priority**: P0 | **Owner**: Backend dev + QA | **Effort**: 6 hours

---

## Coverage Matrix

| Story | Test Level | Priority | Tests |
|-------|-----------|----------|-------|
| 3.1 Complete 44-item form | Unit + E2E | P0 | 6 |
| 3.2 Display profile scores | Unit + API | P0 | 5 |

**Total**: ~11 tests, ~2 min runtime

---

## Test Scenarios

### Unit Tests (3 tests)

**3.1.1: Reverse-coded items validation**
```typescript
test('reverse-coded item responses inverted correctly', async () => {
  // Item 6: "I worry about things" (reverse-coded for Neuroticism)
  const responses = [{itemId: 6, response: 5}]; // 5 = "Strongly agree I worry"
  const inverted = invertResponseIfNeeded(6, 5);
  expect(inverted).toBe(1); // Reversed to 1 (low neuroticism)
});

test('non-reverse-coded items kept as-is', async () => {
  // Item 1: "I am the life of the party" (normal coding)
  const responses = [{itemId: 1, response: 4}];
  const kept = invertResponseIfNeeded(1, 4);
  expect(kept).toBe(4); // Unchanged
});
```

**3.1.2: Trait scoring formula**
```typescript
test('Extraversion score matches IPIP-NEO formula', async () => {
  // Extraversion: Items 1, 6R, 11, 16, 21R, 26, 31, 36, 41
  const responses = {
    1: 5, 6: 1, 11: 4, 16: 3, 21: 2, 26: 5, 31: 4, 36: 3, 41: 5 // 6 & 21 reversed
  };
  
  const score = calculateExtraversion(responses);
  expect(score).toBeCloseTo(40.1, 0); // Expected value from IPIP-NEO
});
```

### Integration Tests (5 tests)

**3.1.3: Submit 44-item questionnaire**
```typescript
test('POST /api/big-five with 44 responses', async ({request}) => {
  const responses = generateResponses44(); // All 44 items
  
  const res = await request.post('/api/big-five', {
    data: {responses},
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(201);
  const scores = await res.json();
  expect(scores).toHaveProperty('openness');
  expect(scores).toHaveProperty('conscientiousness');
  // ... all 5 traits
});
```

**3.1.4: Reject incomplete submission**
```typescript
test('rejects submission with < 44 items', async ({request}) => {
  const incomplete = generateResponses44().slice(0, 40);
  
  const res = await request.post('/api/big-five', {
    data: {responses: incomplete}
  });
  
  expect(res.status()).toBe(400);
  expect(await res.json()).toHaveProperty('error');
});
```

**3.2.1: User views own profile**
```typescript
test('GET /api/big-five/me returns user\'s scores', async ({request}) => {
  const res = await request.get('/api/big-five/me', {
    headers: {Authorization: `Bearer ${userToken}`}
  });
  
  expect(res.status()).toBe(200);
  const scores = await res.json();
  expect(scores.userId).toBe(user.id);
});
```

**3.2.2: User cannot view teammate scores**
```typescript
test('GET /api/big-five/{userId} returns 403 for other user', async ({request}) => {
  const res = await request.get(`/api/big-five/${otherUserId}`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  
  expect(res.status()).toBe(403);
});
```

### E2E Tests (3 tests)

**3.1.5: Complete questionnaire flow**
```typescript
test('user completes 44-item questionnaire', async ({page}) => {
  await page.goto('/big-five');
  
  for (let i = 1; i <= 44; i++) {
    const question = await page.locator(`[data-testid="item-${i}"]`);
    const response = (i % 5) + 1; // Vary responses
    await question.locator(`[data-value="${response}"]`).click();
  }
  
  await page.click('[data-testid="submit-button"]');
  
  // Redirect to profile
  await expect(page).toHaveURL('/profile/big-five');
});
```

**3.2.3: Display personality profile**
```typescript
test('profile shows all 5 traits with scores', async ({page}) => {
  const profile = await createBigFiveProfile();
  await loginAndNavigateToProfile();
  
  await expect(page.getByText('Openness')).toBeVisible();
  await expect(page.getByText('Conscientiousness')).toBeVisible();
  // ... all 5 traits visible
});
```

---

## Quality Gate Criteria

**P0 Tests (100% pass)**:
- All 44 items collected
- Reverse-coding correct
- Scores match IPIP-NEO reference
- Access control enforced
- Export anonymized

**Performance**:
- Questionnaire submission < 2 seconds
- Profile load < 500ms

---

**Effort**: 50 story points, 18 hours testing  
**Status**: Ready for Sprint Planning

