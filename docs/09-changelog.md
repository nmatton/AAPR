# Changelog

**Implementation History for AAPR Platform**

Last Updated: January 21, 2026

---

## Epic 1: Authentication & Team Onboarding

**Status:** ✅ COMPLETE (7/7 stories)  
**Duration:** January 15-19, 2026  
**Team:** Bob (SM), Elena (Dev), Marcus (Dev)

---

## Epic 2: Practice Catalog & Coverage

**Status:** 🔄 IN PROGRESS  
**Start Date:** January 19, 2026  
**Team:** Nicolas (Dev)

### Story 2-1: Load and Display Practice Catalog

**Status:** ✅ COMPLETE  
**Date:** January 19-20, 2026  
**Developer:** Nicolas

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/v1/practices` (public, no auth required)
- **Query Parameters:**
  - `page` (default: 1, min: 1)
  - `pageSize` (default: 20, min: 1, max: 100)
  - `category` (optional filter by pillar category)
- **Response:**
  ```json
  {
    "items": [...Practice[]],
    "page": 1,
    "pageSize": 20,
    "total": 47,
    "requestId": "req_abc123"
  }
  ```
- **Validation:**
  - Throws `AppError` on invalid page/pageSize
  - Calculates skip: `(page - 1) * pageSize`
  - Includes pillar category mapping in query
- **Service Layer:** `PracticesService.getPractices()`
  - Paginated fetch via repository
  - Pillar/category mapping
  - Consistent response structure
- **Repository:** `findPaginated()` method
  - Includes pillar.category in all relations
  - Calculates skip/take for database query
- **Testing:**
  - `practices.service.test.ts`: Pagination skip math, category/pillar mapping
  - `practices.routes.test.ts`: Endpoint validation, default params, query params
  - Coverage: 90%+ (new code)

**Frontend:**
- **Route:** `GET /practices` (protected)
- **Page Component:** `PracticeCatalog.tsx`
  - Fetches practices on mount: `loadPractices(1, 20, null)`
  - Shows loading skeleton (10 placeholder cards)
  - Displays paginated grid of practice cards (3 columns on desktop)
  - Handles error state with retry button
  - Shows empty state if no practices
  - Click card to open detail sidebar
  - Header with back-to-teams and logout controls
- **State:** `practices.slice.ts` (Zustand)
  - `practices: Practice[]`
  - `isLoading`, `error`, `page`, `pageSize`, `total`
  - `currentDetail: Practice | null` (for sidebar)
  - `catalogViewed: boolean` flag
  - `loadPractices()` action
  - `setCurrentDetail()` for sidebar toggle
  - `retry()` for error recovery
- **Components:**
  - `PracticeCard.tsx`: Shows title, goal, category badge, pillar names; clickable
  - `PracticeCardSkeleton.tsx`: Animated placeholder during load
  - `PracticeEmptyState.tsx`: "No practices available" message
  - `PracticeErrorState.tsx`: Error message + retry button
  - `PracticeCatalogDetail.tsx`: Sidebar modal showing full practice details
- **API Client:** `practices.api.ts`
  - `fetchPractices(page, pageSize, category?)`: GET `/api/v1/practices` with query params
  - `logCatalogViewed(teamId?)`: POST `/api/v1/events` (best-effort, no error block)
  - `ApiError` class for structured error handling
- **Testing:**
  - `PracticeCatalog.test.tsx`: Loading, list render, empty state, error state (4 tests)
  - `PracticeCard.test.tsx`: Card rendering (1 test)
  - `practices.slice.test.ts`: Store actions, error handling (2 tests)
  - `practices.api.test.ts`: API calls (3 tests)
  - Coverage: 88%+ (new code)
  - All 68 frontend tests passing

**Routing & Navigation:**
- Added `/practices` route in `App.tsx` (protected)
- Header button "Practice Catalog" navigates to `/practices`
- From catalog page: "Back to Teams" button and "Logout" button

**Database:**
- No new migrations (uses existing practices, categories, pillars tables)
- Queries now include pillar.category in all relations

**Event Logging:**
- `logCatalogViewed` endpoint not yet implemented on backend
- API client prepared for future POST `/api/v1/events` endpoint

**Documentation Updated:**
- `docs/05-backend-api.md`: Added GET /api/v1/practices endpoint docs
- `docs/06-frontend.md`: Added practices feature architecture, components, API client

**Files Created/Modified:**
- Backend: `practices.controller.ts`, `practices.service.ts`, `practices.repository.ts`, `practices.routes.ts`, tests
- Frontend: New `features/practices/` folder with types, api, state, components, pages, tests
- Routes: `App.tsx` with new `/practices` route and header link

---

### Story 2-2: Search and Filter Practices by Pillar

**Status:** ✅ COMPLETE  
**Date:** January 20, 2026  
**Developer:** Nicolas (via Dev Agent - Claude Haiku 4.5)

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/v1/practices` (updated to support search/filter)
- **New Query Parameters:**
  - `search` (string, optional): Case-insensitive search by title, goal, or description
  - `pillars` (string, optional): Comma-separated pillar IDs (e.g., "5,8,12")
- **Filter Logic:**
  - **Search:** OR logic across title, goal, description fields
  - **Pillars:** OR logic (practices covering ANY of the specified pillars)
  - **Combined:** AND logic (search results MUST ALSO match pillar filter)
- **Validation:**
  - Controller validates pillar ID format (must be integers)
  - Service validates pillar IDs exist in database
  - Returns 400 Bad Request with `{ code: "invalid_filter", invalidIds: [...] }` for non-existent pillars
- **Repository Updates:**
  - New method: `searchAndFilter(options)` - composes Prisma where clause with AND/OR logic
  - New method: `countFiltered(options)` - counts total matching practices (for pagination)
  - New method: `validatePillarIds(pillarIds)` - returns invalid IDs
- **Service Updates:**
  - New method: `searchPractices({ search?, pillars?, page, pageSize })`
  - Validates pillar IDs before querying
  - Uses same response format as `getPractices()`
- **Controller Updates:**
  - Parses `search` and `pillars` query params
  - Splits comma-separated pillar IDs: `"5,8,12"` → `[5, 8, 12]`
  - Routes to `searchPractices()` if search/filter params present
- **Testing:**
  - `practices.service.test.ts`: 7 new tests (search, filter, combined, validation)
  - `practices.routes.test.ts`: 8 new tests (search, filter, combined, invalid input)
  - **All 106 backend tests passing** ✅

**Frontend:**
- **State Updates (`practices.slice.ts`):**
  - New state: `searchQuery: string`, `selectedPillars: number[]`
  - New actions:
    - `setSearchQuery(query)`: Updates search query, resets to page 1
    - `setSelectedPillars(pillars)`: Updates pillar filter, resets to page 1
    - `togglePillar(pillarId)`: Adds/removes pillar from filter
    - `clearFilters()`: Resets search + pillars to empty
  - Updated `loadPractices()`: Now includes `searchQuery` and `selectedPillars` in API call
- **API Client Updates (`practices.api.ts`):**
  - Updated `fetchPractices(page, pageSize, search?, pillars?)`: Builds query string with optional filters
  - Uses `URLSearchParams` for proper encoding
  - Comma-separates pillar IDs: `[5, 8] → "pillars=5,8"`
- **UI Components:**
  - **Search Input:**
    - Debounced (300ms) to prevent excessive API calls
    - Local state + sync to Zustand store
    - Clear button (×) when text entered
    - Placeholder: "Search practices..."
  - **Active Filters Display:**
    - Shows "Filtering by N pillar(s)" when pillars selected
    - "Clear All Filters" button to reset search + filters
  - **Empty State:**
    - Different message when filters active: "No practices found for '[query]'. Try a different search."
    - Shows [Clear Filters] button
  - **Search Icon:**
    - Added magnifying glass icon to empty state
- **UX Improvements:**
  - Search updates in real-time (debounced 300ms)
  - Pagination resets to page 1 when filters change
  - Loading skeletons shown during debounce
  - Filter state preserved in Zustand (survives component remounts)

  **Review Fixes (January 20, 2026):**
  - Added Pillar filter dropdown UI with category grouping and multi-select
  - Added active filter badges with remove buttons
  - Added search term highlighting in practice titles
  - Added “Results updated” toast on filter/search change
  - Added `catalog.searched` event logging
  - Added pillar discovery loader from unfiltered catalog
  - Expanded frontend tests for search, filters, and toast
- **Updated Components:**
  - `PracticeCatalog.tsx`: Added search input UI, filter state, clear filters button
  - All components responsive and accessible

**Performance:**
- **Database Indexes (Recommended):**
  - `CREATE INDEX idx_practices_title_search ON practices USING gin(title gin_trgm_ops);`
  - `CREATE INDEX idx_practices_goal_search ON practices USING gin(goal gin_trgm_ops);`
  - `CREATE INDEX idx_practice_pillars ON practice_pillars(practice_id, pillar_id);`
- **Query Performance:** < 200ms for all test cases

**Documentation Updated:**
- `docs/05-backend-api.md`: Updated GET /api/v1/practices with search/filter params, examples, error responses
- `docs/09-changelog.md`: Added Story 2-2 entry

**Files Modified:**
- Backend:
  - `server/src/repositories/practice.repository.ts`: +4 methods (searchAndFilter, countFiltered, validatePillarIds)
  - `server/src/services/practices.service.ts`: +1 method (searchPractices), +1 interface (SearchPracticesParams)
  - `server/src/controllers/practices.controller.ts`: Updated to parse search/filter params
  - Tests: +15 tests across service and route test files
- Frontend:
  - `client/src/features/practices/state/practices.slice.ts`: +5 actions, +2 state fields
  - `client/src/features/practices/api/practices.api.ts`: Updated fetchPractices signature
  - `client/src/features/practices/pages/PracticeCatalog.tsx`: +search input, +filter UI, +empty states
  - `client/src/features/practices/components/PillarFilterDropdown.tsx`: Pillar filter dropdown
  - `client/src/features/practices/components/PracticeCard.tsx`: Search match highlighting
- Documentation:
  - `docs/05-backend-api.md`
  - `docs/09-changelog.md`

**Known Limitations (Future Enhancements):**
- Pillar filter dropdown UI not yet implemented (typing pillar IDs manually for now)
- No highlight for search matches in practice titles
- Filter state not persisted to URL query params (browser back button doesn't preserve filters)
- Toast notifications for "Results updated" not implemented

**Technical Notes:**
- Followed red-green-refactor TDD cycle: wrote failing tests first, then implementation
- Maintained backward compatibility: existing `/practices` queries without search/filter work identically
- All error handling follows project standards: structured `AppError` with `{ code, message, details, requestId }`
- TypeScript strict mode: no `any` types, all functions typed


**Validation Results:**
- Backend tests: 90/90 passing ✅
- Frontend tests: 68/68 passing ✅

**Known Limitations:**
- Pagination UI (next/previous buttons) not yet implemented

---

### Story 2-3: Add Selected Practices to Team Portfolio

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas (via Dev Agent - GPT-5.2-Codex)

**What Was Built:**

**Backend:**
- **Endpoints:**
  - `GET /api/v1/teams/:teamId/practices/available` - Returns practices NOT yet selected by team
  - `POST /api/v1/teams/:teamId/practices` - Adds practice to team portfolio
  - `DELETE /api/v1/teams/:teamId/practices/:practiceId` - Removes practice from team
  - `GET /api/v1/teams/:teamId/practices` - Returns currently selected practices
- **Query Parameters (GET available):**
  - `page`, `pageSize` (pagination)
  - `search` (case-insensitive title/goal/description)
  - `pillars` (comma-separated IDs, OR logic)
- **Validation:**
  - Team existence check before querying available practices (404 if team not found)
  - Practice existence check (400 if practice doesn't exist)
  - Duplicate prevention (409 Conflict if practice already selected)
  - Pillar ID validation (400 if invalid pillar IDs)
- **Service Layer:**
  - `getAvailablePractices(teamId, filters)`: Uses Prisma `NOT` clause to exclude team practices
  - `addPracticeToTeam(teamId, userId, practiceId)`: Transactional add + event logging + coverage recalc
  - `removePracticeFromTeam(teamId, userId, practiceId)`: Transactional remove + event logging + coverage recalc
- **Repository Updates:**
  - `findAvailableForTeam(teamId, filters)`: Query with `NOT { teamPractices: { some: { teamId } } }`
  - `countAvailableForTeam(teamId, filters)`: Count for pagination
- **Event Logging:**
  - `practice.added` event with `{ teamId, practiceId, practiceTitle }`
  - `practice.removed` event with `{ teamId, practiceId, practiceTitle }`
  - Both wrapped in transaction with main operation
- **Coverage Recalculation:**
  - Automatic via `calculateTeamCoverage(teamId)` after add/remove
  - Returns updated coverage % in response
- **Testing:**
  - `teams.practices.routes.test.ts`: 8 integration tests
  - GET available: pagination, search, pillars filter
  - POST add: success (201), duplicate (409), invalid ID (400)
  - DELETE remove: success (200), not found (404), forbidden (403)
  - **All 120 backend tests passing** ✅

**Frontend:**
- **Route:** `/teams/:teamId/practices/add` (protected)
- **Page Component:** `AddPracticesView.tsx`
  - Fetches available practices on mount
  - Reuses `PracticeCard` and `PillarFilterDropdown` from Story 2.2
  - Search input with debounce
  - Pillar filter dropdown
  - "Load More" button for pagination (appends to list)
  - Empty state: "All practices already selected" + back to dashboard link
- **State Management:** `addPracticesSlice.ts` (Zustand)
  - `practices: Practice[]`, `isLoading`, `error`, `total`, `page`, `pageSize`
  - `searchQuery: string`, `selectedPillars: number[]`
  - `loadAvailablePractices(teamId, page)`: Fetches and handles pagination
  - `addPractice(teamId, practiceId)`: Adds practice, removes from list, refreshes team stats
  - `setSearchQuery()`, `togglePillar()`, `clearFilters()`
  - Proper timeout cleanup to prevent memory leaks
- **API Client:** `teamPracticesApi.ts`
  - `fetchAvailablePractices({ teamId, page, pageSize, search?, pillars? })`
  - `addPracticeToTeam(teamId, practiceId)`: Returns `{ teamPractice, coverage }`
  - `fetchTeamPractices(teamId)`: Returns team's current practices
  - `removePracticeFromTeam(teamId, practiceId)`: Returns `{ teamPracticeId, coverage }`
- **UX Features:**
  - Success toast (3 seconds) when practice added
  - Practice disappears from list immediately on success
  - Error message shown if add fails (practice stays in list)
  - Loading state per practice (disable button during add)
  - Back button to team dashboard
  - Retry button on error
- **Team Dashboard Updates:**
  - Added "Add Practices" button in header
  - Navigates to `/teams/:teamId/practices/add`
- **Testing:**
  - `AddPracticesView.test.tsx`: Component rendering, add flow, error handling (6 tests)
  - `addPracticesSlice.test.ts`: Store actions, filters, error states (5 tests)
  - `teamPracticesApi.test.ts`: API calls (4 tests)
  - **All 83 frontend tests passing** ✅

**Documentation Updated:**
- `docs/05-backend-api.md`: Added Team Practices section with all 4 endpoints
- `docs/06-frontend.md`: Added AddPracticesView, addPracticesSlice, teamPracticesApi
- `docs/09-changelog.md`: This entry

**Files Created/Modified:**
- Backend:
  - `server/src/routes/teams.routes.ts`: Added 4 practice endpoints
  - `server/src/controllers/teams.controller.ts`: Added getAvailablePractices, addPracticeToTeam, getTeamPractices, removePracticeFromTeam
  - `server/src/services/teams.service.ts`: Added 4 service methods with validation and transactional event logging
  - `server/src/repositories/practice.repository.ts`: Added findAvailableForTeam, countAvailableForTeam
  - `server/src/routes/teams.practices.routes.test.ts`: 8 integration tests
- Frontend:
  - `client/src/features/teams/pages/AddPracticesView.tsx`: Full Add Practices view
  - `client/src/features/teams/state/addPracticesSlice.ts`: Zustand slice
  - `client/src/features/teams/api/teamPracticesApi.ts`: API client
  - `client/src/features/teams/components/TeamDashboard.tsx`: Added "Add Practices" button
  - `client/src/App.tsx`: Added `/teams/:teamId/practices/add` route
  - Tests: `AddPracticesView.test.tsx`, `addPracticesSlice.test.ts`, `teamPracticesApi.test.ts`

**Acceptance Criteria Validation:**
- ✅ AC1: Navigate to Add Practices view from Team Dashboard
- ✅ AC2: Practice cards show title, goal, pillars, category
- ✅ AC3: Add practice removes it from unselected list + success message
- ✅ AC4: Event logged transactionally + coverage recalculated
- ✅ AC5: Error handling prevents optimistic updates on failure

**Known Enhancements (Applied in Review):**
- Fixed: setTimeout cleanup to prevent memory leaks
- Fixed: Team existence validation before querying available practices
- Fixed: Loading state per practice to prevent double-clicks
- Fixed: Event structure validation in backend tests
- Category filter not yet integrated in UI
- Event logging endpoint (`POST /api/v1/events`) pending backend implementation

**Next Steps (Story 2-2):**
- Add pagination UI controls
- Implement category filter dropdown
- Add search by practice title
- Create practice selection modal for team assignment

---

### Story 2-4: Remove Practices from Team Portfolio

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas

**What Was Built:**

**Backend:**
- **Endpoints:**
  - `GET /api/v1/teams/:teamId/practices` (list selected practices)
  - `DELETE /api/v1/teams/:teamId/practices/:practiceId` (remove from team)
- **Service:** `teams.service.removePracticeFromTeam(teamId, userId, practiceId)`
  - Validates team membership and practice presence
  - Transactionally deletes `team_practices` row and logs `practice.removed` event
  - Recalculates coverage via `calculateTeamCoverage(teamId)`
- **Repository:** `teams.repository.removePracticeFromTeam(teamId, practiceId, tx)`
- **Event Logging:** `practice.removed` with `{ teamId, practiceId }` payload

**Frontend:**
- **Component:** `TeamPracticesPanel`
  - Lists team practices on the Team Dashboard
  - [Remove] action per practice
  - Confirmation dialog shows pillars losing coverage
  - Success toast: "Practice removed from team portfolio"
  - Gap pillars highlighted with suggestion copy
  - Refreshes team stats to update coverage in real-time

**Testing:**
- Backend:
  - `teams.practices.routes.test.ts`: DELETE success, 403 membership, 404 not found
  - `teams.service.test.ts`: transactional removal + event logging + coverage recalculation
- Frontend:
  - `TeamPracticesPanel.test.tsx`: dialog pillars, successful removal, failure handling

**Documentation Updated:**
- `docs/05-backend-api.md`: Added GET/DELETE team practices endpoints
- `docs/06-frontend.md`: Documented TeamPracticesPanel and removal flow
- `docs/09-changelog.md`: Added Story 2-4 entry

---

### Story 2-5: Create New Practice from Scratch or Template

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas (via Dev Agent - GPT-5.2-Codex)

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/v1/teams/:teamId/practices/custom`
- **Validation:** title (2-100), goal (1-500), pillarIds (min 1), categoryId exists, optional templatePracticeId exists
- **Service:** `createCustomPracticeForTeam(teamId, userId, payload)`
  - Validates pillars and category
  - Validates template practice if provided
  - Transactionally creates practice + pillars + team link + event
  - Recalculates coverage via `calculateTeamCoverage(teamId)`
- **Event Logging:** `practice.created` with `{ teamId, practiceId, isCustom: true, createdFrom? }`
- **Error Handling:** structured errors with requestId; duplicate title+category returns 409

**Frontend:**
- **Entry Point:** "Create New Practice" button in `ManagePracticesView`
- **Modal:** `CreatePracticeModal` with two-mode flow (scratch/template)
- **Template Flow:** loads all practices (team + catalog), pre-fills fields, appends "(Copy)" to title
- **Validation UX:** inline errors for title, goal, category, pillars
- **Success:** toast, modal close, refresh team practices + coverage
- **State:** `managePracticesSlice` adds `createPractice` + `isCreating`
- **API Client:** `createCustomPractice(teamId, payload)`

**Testing:**
- Backend:
  - `teams.practices.routes.test.ts`: endpoint success, invalid pillar, duplicate, template not found
  - `teams.service.test.ts`: transaction behavior, event payload with createdFrom
- Frontend:
  - `CreatePracticeModal.test.tsx`: options, template prefill, validation
  - `ManagePracticesView.test.tsx`: success refresh behavior
  - `teamPracticesApi.test.ts`: API call

**Documentation Updated:**
- `docs/05-backend-api.md`: Added custom practice endpoint
- `docs/06-frontend.md`: Added CreatePracticeModal flow
- `docs/09-changelog.md`: Added Story 2-5 entry

---

### Story 2-6: View Team Coverage at Pillar Level

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas (via Dev Agent - GPT-5.2-Codex)

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/v1/teams/:teamId/coverage/pillars`
- **Service:** `coverage.service.getTeamPillarCoverage(teamId)`
  - Loads team practices + pillars with single include
  - Splits covered vs gap pillars
  - Calculates coverage percentage to 2 decimals
  - Logs `coverage.calculated` (informational)
- **Repository:** `coverage.repository.findTeamPracticesWithPillars`, `coverage.repository.findAllPillars`

**Frontend:**
- **Component:** `TeamCoverageCard`
  - Coverage summary + progress bar
  - Covered/Gap pillars with clickable badges
  - Refresh button re-fetches coverage + team stats
- **Modal:** `PillarDetailModal`
  - Covered pillar → shows practices covering it
  - Gap pillar → suggests practices with [Add]
- **State:** `coverageSlice` for loading/error + cached coverage
- **API Client:** `coverageApi.getTeamPillarCoverage(teamId)` with pillar mapping
- **Integration:** Team Dashboard displays coverage card; refreshes after add/remove

**Testing:**
- Backend:
  - `coverage.service.test.ts`: coverage math, unique pillars, event payload
  - `teams.coverage.routes.test.ts`: endpoint response, auth/membership validation
- Frontend:
  - `TeamCoverageCard.test.tsx`: summary, modal behavior, add practice refresh
  - `TeamPracticesPanel.test.tsx`: onPracticeRemoved callback refresh

**Documentation Updated:**
- `docs/05-backend-api.md`: Added coverage/pillars endpoint
- `docs/06-frontend.md`: Documented TeamCoverageCard + PillarDetailModal
- `docs/09-changelog.md`: Added Story 2-6 entry

---

### Story 2-7: View Team Coverage by Category

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas (via Dev Agent - Claude Sonnet 4.5)

**What Was Built:**

**Backend:**
- **Endpoint:** Extended `GET /api/v1/teams/:teamId/coverage/pillars` with `categoryBreakdown` field
- **Service:** Enhanced `coverage.service.getTeamPillarCoverage(teamId)`
  - Added `calculateCategoryBreakdown()` helper function
  - Groups pillars by category (5 categories: VALEURS HUMAINES, FEEDBACK & APPRENTISSAGE, EXCELLENCE TECHNIQUE, ORGANISATION & AUTONOMIE, FLUX & RAPIDITÉ)
  - Calculates coverage percentage per category
  - Returns covered/gap pillars for each category
  - Logs `coverage.by_category.calculated` event (informational)
- **Types:** Added `CategoryCoverage` interface with category-level breakdown structure

**Frontend:**
- **Component:** `CategoryCoverageBreakdown`
  - Displays all 5 categories with progress bars
  - Color-coded: Green (75%+), Yellow (50-74%), Red (<50%)
  - Expandable accordion to show pillar details per category
  - Warning badges and recommendations for gap categories (<50%)
  - [View Available Practices] button filters practice catalog by category
- **Page:** Enhanced `AddPracticesView`
  - Reads `?category=` URL parameter
  - Filters practices by category when parameter present
  - Shows category filter notification with clear button
  - Updated empty state messaging for category filtering
- **State:** Extended `TeamPillarCoverage` type to include `categoryBreakdown: CategoryCoverage[]`
- **Integration:** Team Dashboard displays `CategoryCoverageBreakdown` below `TeamCoverageCard`
  - Shares refresh mechanism with pillar coverage
  - Automatically updates after practice add/remove

**Testing:**
- Backend:
  - `coverage.service.test.ts`: 
    - Category breakdown calculation accuracy
    - Color coding threshold validation (75%, 50%, 25%)
    - Event logging with category breakdown summary
    - Multiple category handling
  - `teams.coverage.routes.test.ts`: Updated to validate `categoryBreakdown` field in response
- Frontend:
  - `CategoryCoverageBreakdown.test.tsx`:
    - Renders all categories with percentages
    - Applies correct color coding (green/yellow/red)
    - Expands/collapses category details
    - Shows covered/gap pillars separately
    - Displays warning for categories <50%
    - Calls `onViewPractices` callback
    - Accordion behavior (one category expanded at a time)
  - All 148 backend tests pass ✅
  - All 10 frontend component tests pass ✅

**Documentation Updated:**
- `docs/05-backend-api.md`: Updated coverage/pillars endpoint with `categoryBreakdown` field and example response
- `docs/06-frontend.md`: Documented `CategoryCoverageBreakdown` component with props, behavior, and UI patterns
- `docs/09-changelog.md`: Added Story 2-7 entry

**Technical Decisions:**
- Extended existing coverage endpoint rather than creating new endpoint (maintains backward compatibility)
- Category grouping uses `pillar.categoryId` field from database
- Color coding thresholds align with agile maturity assessment standards
- Practice catalog filtering uses URL query parameter for shareable links
- Event logging includes category breakdown summary for research audit trail

---

### Story 2-0: Import Practice Data from JSON

**Status:** ✅ COMPLETE  
**Date:** January 19, 2026  
**Developer:** Nicolas

**What Was Built:**

**Backend:**
- Practice catalog schema updates (categories, pillars, practices, practice_pillars)
- Seed scripts for categories/pillars and practices
- Practice JSON import service with validation, idempotency, and event logging
- Practice repository for catalog queries (Story 2.1 readiness)

**Testing:**
- Manual validation of seed/import flows
- Unit and integration tests for import service

**Documentation Updated:**
- Database schema documentation
- Development guide version constraints


---

### Story 1-0: Set Up Initial Project from Starter Template

**Status:** ✅ Done  
**Date:** January 16, 2026  
**Developer:** Marcus

**What Was Built:**
- Initialized project from `starter-template/`
- Set up TypeScript configuration (strict mode)
- Configured ESLint + Prettier
- Created `client/` and `server/` directories
- Set up Vite for frontend build
- Configured TailwindCSS for styling
- Created Docker PostgreSQL container
- Initialized Prisma ORM
- Set up environment variables (`.env` files)

**Technical Decisions:**
- **React 18.2:** Locked version for stability (no auto-upgrades)
- **TypeScript 5.2+:** Strict mode enforced across both client and server
- **PostgreSQL 14+:** Running in Docker for local development
- **Prisma 5.0+:** Type-safe ORM with schema-first approach

**Files Created:**
- `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`
- `server/package.json`, `server/tsconfig.json`, `server/prisma/schema.prisma`
- `server/.env`, `client/.env`
- Docker compose configuration

**Testing:**
- Verified frontend dev server runs (`npm run dev`)
- Verified backend dev server runs (`npm run dev`)
- Verified PostgreSQL connection

**Documentation Updated:**
- README.md with setup instructions
- Initial project structure diagram

---

### Story 1-1: User Registration with Email Validation

**Status:** ✅ Done  
**Date:** January 17, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/auth/signup`
- **Validation:** Email format (RFC 5322), password ≥ 8 characters, name 1-100 characters
- **Security:** Bcrypt password hashing (10 rounds minimum)
- **Response:** JWT token set in HTTP-only cookie (`token`, 24-hour expiry)
- **Database:** `users` table with `id`, `name`, `email`, `password`, `created_at`, `updated_at`
- **Event Logging:** `user.registered` event with `actor_id`, `email`, `created_at`

**Frontend:**
- **Component:** `SignupForm.tsx` (React functional component)
- **Fields:** Name, email, password inputs
- **Validation:** Client-side email format check, password length check
- **State:** Zustand `authSlice` with `signup` action
- **Routing:** Redirect to `/teams` on success

**Architecture Decisions:**
- **ADR-003:** JWT stored in HTTP-only cookies (not localStorage for XSS protection)
- **ADR-007:** Bcrypt with 10+ salt rounds for password hashing

**Testing:**
- Unit tests for `AuthService.signup`
- Integration test for `/api/auth/signup` endpoint
- Frontend tests for `SignupForm` component
- Coverage: 87% (backend), 82% (frontend)

**Files Created:**
- `server/src/routes/authRoutes.ts`
- `server/src/controllers/authController.ts`
- `server/src/services/authService.ts`
- `server/src/repositories/userRepository.ts`
- `server/src/repositories/eventRepository.ts`
- `client/src/features/auth/SignupForm.tsx`
- `client/src/features/auth/authSlice.ts`
- `client/src/features/auth/authApi.ts`

**Database Migration:**
- `20260116142444_add_users_and_events_tables.sql`

---

### Story 1-2: User Login with Session Management

**Status:** ✅ Done  
**Date:** January 17, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/auth/login`
- **Validation:** Email exists, password matches (bcrypt compare)
- **Response:** JWT token set in HTTP-only cookie
- **Middleware:** `authMiddleware` to validate JWT on protected routes
  - Extracts token from cookie
  - Verifies JWT signature
  - Attaches `req.userId` for downstream use
- **Logout:** `POST /api/auth/logout` clears cookie

**Frontend:**
- **Component:** `LoginForm.tsx`
- **Fields:** Email, password
- **State:** `authSlice.login` action
- **Routing:** Redirect to `/teams` on success, redirect to `/login` if unauthorized

**Event Logging:**
- `user.login_success` with `actor_id`, `timestamp`

**Security:**
- Password never sent in response
- JWT includes: `userId`, `email`, `iat`, `exp`
- Cookie flags: `httpOnly=true`, `secure=false` (dev), `sameSite=Lax`

**Testing:**
- Unit tests for `AuthService.login`
- Integration test for login → protected route → logout flow
- Frontend tests for `LoginForm` component
- Coverage: 89% (backend), 85% (frontend)

**Files Created:**
- `server/src/middleware/authMiddleware.ts`
- `client/src/features/auth/LoginForm.tsx`

**Architecture Decisions:**
- **ADR-003:** JWT authentication with 24-hour expiry

---

### Story 1-3: Teams List View with Multi-Team Support

**Status:** ✅ Done  
**Date:** January 18, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/teams`
- **Response:** Array of teams with:
  - `id`, `name`, `createdAt`
  - `memberCount` (count of `team_members`)
  - `pillars_covered` (distinct pillars from team's practices)
  - `coverage` (percentage: `pillars_covered / 19 * 100`)
- **Authorization:** Only return teams where user is a member
- **Database:**
  - `teams` table: `id`, `name`, `created_at`, `updated_at`
  - `team_members` table: `id`, `team_id`, `user_id`, `role`, `joined_at`
  - Unique constraint on `(team_id, user_id)`

**Frontend:**
- **Component:** `TeamsList.tsx`
- **Display:** Grid of team cards with:
  - Team name
  - Member count
  - Coverage badge (color-coded: red < 33%, yellow 33-66%, green > 67%)
  - "View Team" button
- **Empty State:** "You're not in any teams yet" with "Create Team" CTA

**State Management:**
- `teamsSlice` with `fetchTeams` action
- Fetch teams on component mount

**Testing:**
- Unit tests for `TeamService.getTeamsForUser`
- Integration test for `/api/teams` endpoint
- Frontend tests for `TeamsList` component (empty state, team cards)
- Coverage: 86% (backend), 83% (frontend)

**Files Created:**
- `server/src/routes/teamRoutes.ts`
- `server/src/controllers/teamController.ts`
- `server/src/services/teamService.ts`
- `server/src/repositories/teamRepository.ts`
- `client/src/features/teams/TeamsList.tsx`
- `client/src/features/teams/teamsSlice.ts`
- `client/src/features/teams/teamsApi.ts`

**Database Migration:**
- `20260119_add_teams_and_members.sql`

**Architecture Decisions:**
- **ADR-005:** Team isolation (all queries filter by `team_id`)
- **ADR-002:** Layered backend (routes → controllers → services → repositories)

---

### Story 1-4: Team Creation with Practice Selection

**Status:** ✅ Done  
**Date:** January 18, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/teams`
- **Request Body:** `{ name: string, practices: number[] }`
- **Validation:**
  - Team name: 3-50 characters, unique across platform
  - Practice IDs: Must exist in `practices` table (validated)
- **Behavior:**
  - Create team in `teams` table
  - Add creator as team member (`role = 'owner'`)
  - Add practices to `team_practices` junction table
- **Response:** `{ id, name, createdAt }`

**Frontend:**
- **Component:** `CreateTeamForm.tsx`
- **Fields:**
  - Team name input
  - Practice selection checkboxes (grouped by category)
- **State:** `teamsSlice.createTeam` action
- **Routing:** Redirect to `/teams` on success

**Database:**
- **Tables Added:**
  - `practices`: `id`, `title`, `goal`, `category`, `is_global`, `created_at`
  - `team_practices`: `id`, `team_id`, `practice_id`, `added_at`
  - Unique constraint on `(team_id, practice_id)`

**Event Logging:**
- `team.created` with `team_id`, `name`, `actor_id`, `practice_ids`
- `team_member.added` with `team_id`, `user_id`, `role`

**Testing:**
- Unit tests for `TeamService.createTeam`
- Integration test for `/api/teams` POST endpoint
- Validation tests (duplicate name, invalid practice IDs)
- Frontend tests for `CreateTeamForm` component
- Coverage: 88% (backend), 84% (frontend)

**Files Created:**
- `client/src/features/teams/CreateTeamForm.tsx`

**Database Migration:**
- `20260119_add_practices_and_pillars.sql`

**Architecture Decisions:**
- **ADR-005:** Creator automatically becomes team owner

---

### Story 1-5: Email-Based Team Member Invitations

**Status:** ✅ Done  
**Date:** January 19, 2026  
**Developer:** Elena

**What Was Built:**

**Backend:**
- **Endpoint:** `POST /api/teams/:teamId/invites`
- **Request Body:** `{ emails: string[] }` (1-10 emails)
- **Behavior:**
  1. Check if email belongs to existing user:
     - **Yes:** Immediately add to `team_members`, status = `Added`
     - **No:** Create `team_invites` row, send invitation email, status = `Pending`
  2. Send email via Nodemailer (SMTP configured in `.env`)
  3. Log events (`invite.created`, `invite.auto_resolved`, `invite.email_failed`)
- **Idempotency:** Duplicate emails return existing invite status (no error)

**Frontend:**
- **Component:** `InviteMembersPanel.tsx`
- **UI:**
  - Textarea for comma-separated or newline-separated emails
  - "Send Invitations" button
  - Results display (success/failure per email)

**Database:**
- **Table:** `team_invites`
  - `id`, `team_id`, `email`, `status`, `invited_by`, `invited_user_id`, `created_at`, `updated_at`, `last_sent_at`, `error_message`
  - Unique constraint on `(team_id, email)`
  - Status values: `Pending`, `Added`, `Failed`

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

**Event Logging:**
- `invite.created` (team_id, email, invited_by)
- `invite.auto_resolved` (team_id, email, user_id) - if existing user
- `invite.email_failed` (team_id, email, error_message)

**Testing:**
- Unit tests for `InviteService.inviteMembers`
- Integration tests:
  - Invite existing user (auto-added)
  - Invite new user (email sent)
  - Duplicate invite (idempotent)
  - Email send failure (status = `Failed`)
- Frontend tests for `InviteMembersPanel`
- Coverage: 87% (backend), 81% (frontend)

**Files Created:**
- `server/src/services/inviteService.ts`
- `server/src/repositories/inviteRepository.ts`
- `server/src/utils/emailService.ts`
- `client/src/features/teams/InviteMembersPanel.tsx`

**Database Migration:**
- `20260119_add_invites.sql`

**Dependencies Added:**
- `nodemailer` (email sending)

---

### Story 1-6: Invite Status Management and Membership View

**Status:** ✅ Done  
**Date:** January 19, 2026  
**Developer:** Marcus

**What Was Built:**

**Backend:**
- **Endpoint:** `GET /api/teams/:teamId/members`
- **Response:** Array combining:
  1. Active members from `team_members` (status = `Added`)
  2. Pending invites from `team_invites` (status = `Pending` or `Failed`)
- **Response Format:**
  ```json
  [
    { "id": 1, "name": "Jane", "email": "jane@example.com", "joinedAt": "...", "status": "Added" },
    { "id": null, "name": null, "email": "alice@example.com", "joinedAt": "...", "status": "Pending" }
  ]
  ```
- **Endpoint:** `DELETE /api/teams/:teamId/members/:userId`
- **Behavior:** Remove user from `team_members` (does NOT delete user account)

**Frontend:**
- **Component:** `TeamMembersPanel.tsx`
- **Display:**
  - List of members with name, email, status badge
  - "Remove" button for each member (except current user)
  - Status badges:
    - `Added`: Green badge
    - `Pending`: Yellow badge
    - `Failed`: Red badge with "Retry" button

**Event Logging:**
- `team_member.removed` (team_id, user_id, actor_id)

**Testing:**
- Unit tests for `TeamService.getTeamMembers`, `TeamService.removeMember`
- Integration tests for GET/DELETE endpoints
- Authorization tests (non-members cannot access)
- Frontend tests for `TeamMembersPanel`
- Coverage: 89% (backend), 86% (frontend)

**Files Created:**
- `client/src/features/teams/TeamMembersPanel.tsx`

**Architecture Decisions:**
- **ADR-005:** Team isolation enforced via `teamMembershipMiddleware`

---

## Epic 1 Summary

### Statistics

**Stories:** 7/7 complete  
**Duration:** 4 days (Jan 16-19, 2026)  
**Lines of Code:**
- Backend: ~3,500 lines
- Frontend: ~2,200 lines
- Tests: ~1,800 lines

**Test Coverage:**
- Backend: 87% (target: 85%)
- Frontend: 84% (target: 80%)

**Database Schema:**
- Tables: 8 (users, teams, team_members, team_invites, practices, team_practices, pillars, practice_pillars, events)
- Migrations: 4
- Indexes: 12

---

### What We Delivered

**Authentication:**
- User registration with email validation
- User login with JWT sessions
- Logout functionality

**Team Management:**
- Create teams with practice selection
- View teams list with coverage metrics
- Multi-team support per user

**Team Onboarding:**
- Invite members via email
- Auto-add existing users
- View invite status (Pending/Added/Failed)
- Remove team members

**Research Integrity:**
- Event logging for all significant actions
- Immutable audit trail
- Team isolation enforced

---

### Technical Achievements

**Architecture:**
- Feature-first frontend organization
- Layered backend (routes → controllers → services → repositories)
- Type-safe database access (Prisma)
- Structured error handling

**Security:**
- Bcrypt password hashing (10+ rounds)
- JWT in HTTP-only cookies (XSS protection)
- Team-based authorization
- Input validation on all endpoints

**DevEx:**
- TypeScript strict mode enforced
- ESLint + Prettier configured
- Automated testing (Jest, Vitest)
- Hot module reload (Vite)

---

### Known Limitations

**Epic 1:**
- No password reset functionality (future enhancement)
- No email verification (invited users can signup with any email)
- No rate limiting on auth endpoints (vulnerable to brute force)
- No pagination on teams list (assumes < 100 teams per user)
- No search/filter on teams
- No team deletion
- No user profile editing

**Deferred to Epic 2+:**
- Practice catalog browsing
- Coverage visualization
- Practice recommendations
- Team settings (rename, transfer ownership)

---

## Next: Epic 2 - Practice Catalog & Coverage

**Planned Features:**
- Browse practice catalog (grouped by category)
- View pillar mappings for each practice
- Add/remove practices from team
- Detailed coverage breakdown (by category)
- Coverage visualization (bar chart)
- Practice search and filtering

**Start Date:** January 20, 2026

---

**Last Updated:** January 21, 2026

---

## Story 2-4: Remove Practices from Team Portfolio

**Status:** ✅ COMPLETE  
**Date:** January 21, 2026  
**Developer:** Nicolas (via Dev Agent - Claude Sonnet 4.5)

**What Was Built:**

**Backend:**
- **New Endpoint:**
  - `GET /api/v1/teams/:teamId/practices/:practiceId/removal-impact` - Preview pillar coverage impact before removal
  - Returns: `{ pillarIds: number[], pillarNames: string[], willCreateGaps: boolean }`
- **Service Layer:**
  - `getPracticeRemovalImpact(teamId, practiceId)`: Server-side gap pillar detection
  - Gap detection algorithm: Find pillars covered ONLY by this practice
- **Testing:** 11 new tests (6 route tests + 5 service tests)
  - **All 130 backend tests passing** ✅

**Frontend:**
- **New Components:**
  - `ManagePracticesView.tsx`: Tabbed interface (Available | Selected)
  - `RemovePracticeModal.tsx`: Confirmation dialog with impact preview
  - `managePracticesSlice.ts`: Zustand slice for removal flow
- **UX:** Server-side gap detection with explicit warnings in modal

**Documentation Updated:**
- `docs/05-backend-api.md`: Team Practice Management section
- `docs/06-frontend.md`: Manage Team Practices section
- `docs/09-changelog.md`: This entry

**Acceptance Criteria:**
- ✅ AC1-6: All acceptance criteria met

---

