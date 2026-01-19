# Prioritized Update Plan

**Plan Created:** 2026-01-19  
**Status:** READY FOR IMPLEMENTATION  
**Planning Horizon:** Q1 2026  
**Last Updated:** 2026-01-19

---

## Executive Summary

This document provides a prioritized plan for updating outdated dependencies based on the Dependency Audit completed on 2026-01-19. Updates are categorized by risk level, effort required, and impact on MVP development.

### Update Categories

- **🔴 Critical:** Must implement to fix security vulnerabilities (breaking changes)
- **🟠 High Priority:** Recommended for MVP stability and security (near-term)
- **🟡 Medium Priority:** Nice-to-have improvements (this quarter)
- **🟢 Low Priority:** Optional optimizations (post-MVP)

### Timeline Overview

```
THIS SPRINT (Week 1-2)     | Plan security strategy
                            | Document vulnerabilities

NEXT SPRINT (Week 3-6)     | TypeScript updates
                            | Express updates
                            | Minor dependency updates

MONTH 2 (Feb 2026)         | Vite upgrade planning
                            | TailwindCSS research
                            | Vitest assessment

MONTH 3 (Mar 2026)         | Major upgrades execution
                            | Comprehensive testing
                            | Validation and deployment

POST-MVP (Apr+ 2026)       | React 19 evaluation
                            | Framework major upgrades
                            | Full stack refresh
```

---

## Critical Updates (Security Vulnerabilities)

### 1. Frontend: Vite Security Fix (esbuild Vulnerability)

**Priority:** 🔴 CRITICAL  
**Severity:** Moderate (dev-time only)  
**Issue:** esbuild vulnerability in Vite build chain  
**References:**
- GHSA-67mh-4wv8-2f99
- GitHub Advisory: https://github.com/advisories/GHSA-67mh-4wv8-2f99

#### Current State
```
vitest: 0.34.6
  ↓
vite: 5.4.21
  ↓
esbuild: <=0.24.2 (VULNERABLE)
```

#### Update Plan

**Step 1: Vite Upgrade**
```bash
cd client
npm install vite@7.3.1 --save-dev
npm install @vitejs/plugin-react@5.1.2 --save-dev
```

**Step 2: Validate**
```bash
npm run build      # Verify production build works
npm run dev        # Test development server
npm test           # Run full test suite
```

**Step 3: Review Breaking Changes**
- Vite configuration API changes
- Build output changes
- HMR behavior changes

**Step 4: Update React Plugin**
- Ensure @vitejs/plugin-react updated to match Vite version

#### Impact Analysis

| Item | Impact | Effort |
|------|--------|--------|
| Build system changes | Medium | 3 hours |
| Configuration updates | Low | 1 hour |
| Testing | High | 4 hours |
| Documentation | Low | 1 hour |

**Total Effort:** 8-10 hours  
**Risk Level:** Medium (breaking changes)  
**Blocking Dependencies:** None

#### Timeline

**Start:** Week 3 (After current sprint planning)  
**Duration:** 1-2 days  
**Testing Window:** 2 days  
**Deployment:** End of Week 3

#### Rollback Plan

```bash
# If issues arise:
npm install vite@5.4.21 --save-dev
npm install @vitejs/plugin-react@4.2.1 --save-dev
npm install
```

---

### 2. Backend: Prisma Security Patch (Hono Vulnerability)

**Priority:** 🔴 CRITICAL  
**Severity:** High (dev-time impact only)  
**Issue:** Hono JWT algorithm confusion vulnerabilities  
**References:**
- GHSA-3vhc-576x-3qv4
- GHSA-f67f-6cw9-8mq4
- Hono is transitive dependency via @prisma/dev

#### Current State
```
@prisma/dev (indirectly)
  ↓
hono: <=4.11.3 (VULNERABLE)
  
prisma: 7.2.0 (depends on vulnerable @prisma/dev)
```

#### Update Plan

**Option A: Wait for Prisma Update (RECOMMENDED)**
- Hono is only a dev dependency
- No production runtime impact
- Wait for Prisma 6.19.2 or 7.3.0+ release
- Update when Prisma patches are available

**Estimated Timeline:** February 2026 (Prisma maintenance cycle)

**Option B: Immediate Force Update (if critical)**
```bash
cd server
npm audit fix --force
# Will install prisma@6.19.2 (breaking change)
```

**Recommendation:** Monitor Prisma releases, update when available

#### Impact Analysis

| Item | Impact | Effort |
|------|--------|--------|
| Prisma update | Medium | TBD (Prisma-dependent) |
| Testing | High | 4 hours |
| Migration (if needed) | Varies | TBD |

**Total Effort:** TBD - monitor Prisma release cycle  
**Risk Level:** Low (only dev dependency)  
**Blocking Dependencies:** Prisma team's release schedule

#### Timeline

**Trigger:** When Prisma releases 6.19.2 or 7.3.0+  
**Action:** Update Prisma and test  
**Deployment:** Next available sprint

---

## High Priority Updates (Recommended - Near Term)

### 3. TypeScript Upgrade

**Priority:** 🟠 HIGH  
**Category:** Development Experience  
**Current:** 5.2.0 → Target: 5.9.4

#### Rationale
- Minor version update (backward compatible)
- Includes performance improvements
- Latest stable in 5.x series
- Applied to both frontend and backend

#### Update Steps

**Frontend:**
```bash
cd client
npm install typescript@5.9.4 --save-dev
npm run type-check  # Verify no new errors
npm test           # Run tests
```

**Backend:**
```bash
cd ../server
npm install typescript@5.9.4 --save-dev
npm run build      # Verify compilation
npm test           # Run tests
```

#### Impact
- ✅ Backward compatible
- ✅ Performance improvements
- ✅ Bug fixes
- ❌ Potential new type errors (unlikely)

**Testing Required:** Type checking, build, and test suite  
**Effort:** 2-3 hours  
**Risk:** Low

#### Timeline
**Start:** Week 3 (this sprint)  
**Duration:** 0.5 days  
**Deployment:** Immediate (no breaking changes)

---

### 4. @types/node Update

**Priority:** 🟠 HIGH  
**Category:** Type Safety  
**Current:** 20.0.0 → Target: 25.0.9  
**Backend Only**

#### Rationale
- Updated type definitions
- Better IDE support
- Latest TypeScript compatibility
- Backward compatible

#### Update Steps

```bash
cd server
npm install @types/node@25.0.9 --save-dev
npm run type-check  # Verify no new errors
npm test           # Run tests
```

#### Impact
- ✅ Better type coverage
- ✅ IDE intellisense improvements
- ✅ No runtime changes

**Testing Required:** Type checking and tests  
**Effort:** 1 hour  
**Risk:** Very Low

#### Timeline
**Start:** Week 3  
**Duration:** 0.25 days  
**Deployment:** Immediate

---

### 5. Express Framework Update

**Priority:** 🟠 HIGH  
**Category:** Framework Stability  
**Current:** 4.18.0 → Target: 4.22.1+ (check latest 4.x)

#### Rationale
- Minor version updates (bug fixes, security patches)
- Maintains 4.x compatibility
- Recommended for stability
- Not moving to Express 5.x during MVP

#### Update Steps

```bash
cd server
npm update express --save
npm test           # Verify all tests pass
npm run dev        # Test server startup
```

#### Impact
- ✅ Bug fixes and security patches
- ✅ Minor enhancements
- ✅ API compatible with 4.18.0
- ❌ Requires testing to ensure compatibility

**Testing Required:** Full test suite, API endpoint testing  
**Effort:** 2-3 hours  
**Risk:** Low

#### Timeline
**Start:** Week 4  
**Duration:** 0.5 days

---

## Medium Priority Updates (This Quarter)

### 6. Vite Ecosystem Updates (if not done for security)

**Priority:** 🟡 MEDIUM  
**Category:** Build Tooling  
**Current:** Vite 5.0.0, Vitest 0.34.6

#### Components to Update

**If not updated for security fix:**
- Vite: 5.0.0 → 7.3.1
- @vitejs/plugin-react: 4.2.1 → 5.1.2

**Also update:**
- jsdom: 24.0.0 → 27.4.0 (testing)

#### Update Steps (if not already done)

```bash
cd client

# Vite and plugins
npm install vite@7.3.1 --save-dev
npm install @vitejs/plugin-react@5.1.2 --save-dev

# Testing dependencies
npm install jsdom@27.4.0 --save-dev

# Validate
npm run build
npm run dev
npm test
```

#### Impact
- ✅ Performance improvements
- ✅ Security fixes
- ✅ Better error messages
- ❌ Possible breaking changes in configuration

**Testing Required:** Build, dev server, full test suite  
**Effort:** 4-6 hours  
**Risk:** Medium

#### Timeline
**Start:** Week 5-6 (after security fixes)  
**Duration:** 1 day

---

### 7. TailwindCSS Major Upgrade Research

**Priority:** 🟡 MEDIUM  
**Category:** CSS Framework  
**Current:** 3.3.0 → Target: 4.1.18

#### Preparation Phase (This Quarter)

**Activities:**
1. Review TailwindCSS 4.x changelog
2. Identify breaking changes
3. Assess impact on current styles
4. Research migration guides
5. Plan refactoring effort

#### Known Changes in 4.x
- CSS nesting syntax updates
- Color system refinements
- Configuration schema changes
- Performance improvements

**Effort:** Research phase 2-3 hours  
**Risk Assessment:** Medium (larger migration)

#### Timeline
**Start:** February 2026  
**Research Duration:** 1-2 weeks  
**Planning:** Weeks 7-8

---

### 8. Testing Library and Utilities

**Priority:** 🟡 MEDIUM  
**Category:** Development Experience

#### Components

| Package | Current | Target | Change |
|---------|---------|--------|--------|
| @testing-library/react | 16.0.0 | 16.3.2 | Minor (+3 patches) |
| vitest | 0.34.6 | 4.0.17 | Major (+3 versions) |
| zod | 4.3.0 | 4.3.5 | Patch (+0.0.5) |

#### Update Strategy

**Phase 1: Patch Updates (Low Risk)**
```bash
cd client
npm install @testing-library/react@16.3.2 --save-dev
npm install zod@4.3.5 --save  # server

npm test
```

**Phase 2: Vitest Major Update (High Risk - Defer)**
- Vitest 0.34.x → 4.0.x = 3 major versions
- Requires significant testing framework refactor
- Defer to dedicated sprint with QA support

**Effort for Phase 1:** 1-2 hours  
**Risk Phase 1:** Low

#### Timeline
**Phase 1 (Patches):** Week 4-5  
**Phase 2 (Vitest):** Schedule for Month 2-3

---

## Low Priority Updates (Post-MVP)

### 9. Vitest Framework Overhaul

**Priority:** 🟢 LOW  
**Category:** Major Testing Framework Upgrade  
**Current:** 0.34.6 → Target: 4.0.17  
**Complexity:** HIGH

#### Why Defer to Post-MVP

1. **3 major versions behind:** Significant breaking changes
2. **Current version works:** Tests pass successfully
3. **MVP timeline constraint:** Cannot spare 1-2 weeks
4. **Breaking changes analysis needed:** Requires deep review

#### Pre-Planning (Now)

- [ ] Review Vitest 4.x breaking changes
- [ ] Document current test patterns
- [ ] Estimate migration effort
- [ ] Plan test framework refactor

#### Timeline
**Planning:** March 2026  
**Execution:** April-May 2026 (post-MVP)  
**Effort:** 1-2 weeks estimated

---

### 10. React 19 Migration (Post-MVP Review)

**Priority:** 🟢 LOW  
**Category:** Framework Major Upgrade  
**Current:** 18.2.0 → Target: 19.x (decision pending)  
**Defer Until:** Q2 2026

#### Decision Gate

Before considering React 19:
1. ✅ MVP successfully shipped
2. ✅ Production stability confirmed
3. ✅ User feedback incorporated
4. ✅ Tech team capacity available

#### Impact Assessment

**Breaking Changes in React 19:**
- React Compiler integration
- Hooks behavior refinements
- Server Components emphasis
- Async resource handling with `use()`

**Estimated Effort:** 2-4 weeks

**Dependencies on React 19:**
- All component code review required
- Testing framework updates
- Type definition updates (@types/react)
- Potentially: vitest, testing-library updates

#### Timeline
**Review Decision:** May 2026  
**If approved - Planning:** June 2026  
**If approved - Implementation:** July-August 2026

---

## Update Dependencies Graph

```
THIS SPRINT
├── Plan & Document (Complete)
│   └── Vulnerability Assessment ✅
│   └── Constraint Validation ✅
│   └── Update Plan (this doc) ✅
└── Security Strategy
    └── Hono: Monitor Prisma releases

NEXT SPRINT (Week 3-6)
├── TypeScript 5.9.4
│   ├── Validate type checking
│   └── Both projects
├── @types/node 25.0.9
│   ├── Backend only
│   └── Verify types
└── Express 4.22.1+
    ├── Test API endpoints
    └── Validate middleware

MONTH 2 (Feb 2026)
├── Vite 7.3.1 (if not done for security)
│   ├── Build validation
│   ├── Dev server testing
│   └── Full test suite
├── TailwindCSS 4.x Research
│   ├── Breaking change analysis
│   ├── Migration planning
│   └── Impact assessment
└── Monitor Prisma releases
    └── Update when 6.19.2+ available

MONTH 3 (Mar 2026)
├── Execute approved updates
├── Comprehensive testing
├── Integration validation
└── Pre-production verification

POST-MVP (Apr+ 2026)
├── React 19 evaluation
├── Vitest framework overhaul
├── Full tech stack assessment
└── Long-term roadmap planning
```

---

## Testing Strategy for Updates

### Pre-Update Checklist
- [ ] Review changelog for breaking changes
- [ ] Document current behavior
- [ ] Backup package-lock.json
- [ ] Create feature branch
- [ ] Notify team of changes

### Post-Update Validation

**All Updates Must Pass:**

1. **Type Checking**
   ```bash
   npm run type-check
   # Must pass with no errors or warnings
   ```

2. **Build Verification**
   ```bash
   npm run build
   # Production build must succeed
   ```

3. **Development Server**
   ```bash
   npm run dev
   # Server must start without errors
   ```

4. **Test Suite**
   ```bash
   npm test
   # All tests must pass (no failures or skips)
   ```

5. **Manual Testing**
   - [ ] Test critical user flows
   - [ ] Verify API endpoints
   - [ ] Check UI rendering
   - [ ] Test responsive design

### Rollback Criteria

Immediately rollback if:
- ❌ Type checking fails
- ❌ Build fails
- ❌ Tests fail
- ❌ Development server crashes
- ❌ Critical functionality broken

### Rollback Process

```bash
# Restore from backup
git checkout package-lock.json
npm install

# Verify restoration
npm run type-check
npm test
npm run build
```

---

## Blocking Dependencies

### Blocking Relationships

```
Vite update (7.3.1)
├── Can proceed independently
└── Requires: @vitejs/plugin-react update

TypeScript update
├── Can proceed independently
├── Frontend and backend can update separately
└── No downstream dependencies

@types/node update
├── Backend only
└── Can proceed independently

Express update
├── Can proceed independently
└── Requires: Testing of API endpoints

Prisma update
├── Blocked by: Prisma team releasing patch
├── For dev dependency (Hono fix)
└── No manual update recommended yet

Vitest update (3 major versions)
├── Blocked by: React 19 decision
├── Should defer to post-MVP
└── Recommend not blocking MVP

React 19 evaluation
├── Blocked by: MVP completion
├── Blocked by: Production stability
└── Recommended timing: Q2 2026
```

---

## Success Criteria

### For Each Update

✅ **Update Successful When:**
1. All type checks pass
2. Build completes without warnings
3. All tests pass
4. Development server starts
5. Manual testing confirms functionality
6. No regressions in existing features
7. Documentation updated if needed
8. Team notified of changes

### Overall Plan Success

✅ **Plan Complete When:**
1. All high-priority updates deployed
2. Security vulnerabilities addressed
3. MVP development unblocked
4. No known critical issues
5. Post-MVP roadmap finalized
6. Team trained on new versions

---

## Communication Plan

### Update Notifications

**Team Updates:**
- Sprint planning: Overview of planned updates
- Pre-update: 24-hour notice before major changes
- Post-update: Confirmation of successful deployment
- Issues: Immediate notification if problems arise

### Documentation

**Maintain in README.md:**
- Current dependency versions
- Known issues or workarounds
- Update timeline
- Rollback procedures

---

## Appendix: Recommended Reading

### For Team Preparation

1. **Vite 7.x Migration:** https://vitejs.dev/guide/migration.html
2. **TypeScript 5.9 Changes:** https://devblogs.microsoft.com/typescript/
3. **Express 4.x Best Practices:** https://expressjs.com/
4. **TailwindCSS 4.x (future):** https://tailwindcss.com/docs/upgrade-guide

### Security References

1. **GHSA-67mh-4wv8-2f99:** https://github.com/advisories/GHSA-67mh-4wv8-2f99
2. **GHSA-3vhc-576x-3qv4:** https://github.com/advisories/GHSA-3vhc-576x-3qv4
3. **GHSA-f67f-6cw9-8mq4:** https://github.com/advisories/GHSA-f67f-6cw9-8mq4

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-19 | Dev Team | Initial update plan created |

---

**Plan Status:** APPROVED FOR IMPLEMENTATION  
**Next Review:** 2026-02-19 (Post-implementation review)  
**Approval Authority:** Tech Lead (Pending)  
**Implementation Owner:** Development Team
