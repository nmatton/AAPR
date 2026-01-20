# Story 2.1: Load and Display Practice Catalog

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **team member**,
I want to **browse the full practice catalog with names, goals, and pillar mappings**,
So that **I understand what practices are available and which pillars they cover**.

## Acceptance Criteria

1. **Catalog page loads with all practices**
   - Given I'm on the Practice Catalog page
   - When the page loads
   - Then I see a list of all practices with: name, goal/objective, pillars covered (as colored badges), category

2. **Practice details displayed correctly**
   - Given I'm viewing the catalog
   - When I see a practice
   - Then each practice shows: title (2-100 chars), goal/objective (1-500 chars describing what the practice aims to achieve), visual pillar indicators (colored badges for each pillar covered)

3. **Loading skeleton UX**
   - Given I'm on the catalog page
   - When the page loads for the first time
   - Then I see loading skeleton placeholders while practices are fetched from the server

4. **Smooth list scrolling performance**
   - Given the practices have loaded
   - When I scroll through the list
   - Then the list displays smoothly without lag (all practices visible within 2 seconds)

5. **Practice detail sidebar**
   - Given I'm viewing practices
   - When I click on a practice name
   - Then a detail sidebar opens showing: goal, all pillars covered, category, any additional notes

6. **Empty state handling**
   - Given practices are displayed
   - When the server returns 0 practices
   - Then I see a message: "No practices available. Please contact support."

7. **Error handling and retry**
   - Given I'm viewing the catalog
   - When the API request fails
   - Then I see an error message: "Unable to load practices. Please refresh the page."
   - And a [Retry] button is available

8. **Event logging for catalog view**
   - Given I'm on the catalog page
   - When practices load successfully
   - Then an event is logged: `{ action: "catalog.viewed", teamId, practiceCount, timestamp }`

## Tasks / Subtasks

- [x] **Backend: GET /api/v1/practices endpoint** (AC: #1, #2)
  - [x] Route: `server/src/routes/practices.routes.ts`
  - [x] Controller: `server/src/controllers/practices.controller.ts`
  - [x] Handler: `getPractices()` returns all global practices
  - [x] Response format: `{ items: [...], page: 1, pageSize: 20, total: count }`
  - [x] Each practice includes: id, title, goal, category, pillars array
  - [x] Pagination support: query params `page`, `pageSize` (default: page=1, pageSize=20)
  - [x] Include pillar details: name, category, description
  - [x] Error handling: structured `{ code, message, details?, requestId }`
  - [x] HTTP status codes: 200 success, 500 server error

- [x] **Frontend: Practice Catalog page component** (AC: #1-5)
  - [x] Route: `/practices` or accessible from team dashboard
  - [x] Component: `client/src/features/practices/pages/PracticeCatalog.tsx`
  - [x] Layout: List view (vertical scrolling, desktop-only)
  - [x] Practice card component: `PracticeCard.tsx` showing title, goal, pillar badges
  - [x] Pillar badge styling: Colored badges, category-based colors (VALEURS_HUMAINES=red, FEEDBACK=blue, etc.)
  - [x] Category label: Show practice's category name
  - [x] Responsive loading state: Skeleton placeholders during fetch

- [x] **Frontend: Practice Detail Sidebar** (AC: #5)
  - [x] Modal/sidebar component: `PracticeCatalogDetail.tsx`
  - [x] Trigger: Click on practice name/title
  - [x] Content: Title, goal, full pillar list, category, description (if available)
  - [x] Close: Click outside, ESC key, or [X] button
  - [x] Smooth animation: Slide in from right side

- [x] **Frontend: API client function** (AC: #1)
  - [x] File: `client/src/features/practices/api/practices.api.ts`
  - [x] Function: `fetchPractices(page?: number, pageSize?: number): Promise<PracticesResponse>`
  - [x] Handles: GET `/api/v1/practices?page=1&pageSize=20`
  - [x] Error handling: structured error with requestId
  - [x] Type: `PracticesResponse = { items: Practice[], page: number, pageSize: number, total: number }`

- [x] **Frontend: Loading skeleton UI** (AC: #3)
  - [x] Component: `PracticeCardSkeleton.tsx`
  - [x] Display: Shimmer effect or placeholder boxes
  - [x] Count: Show 10 skeleton cards during initial load
  - [x] Animation: Smooth fade-in when real data loads

- [x] **Frontend: Error handling and retry** (AC: #7)
  - [x] Error state component: Shows error message and [Retry] button
  - [x] Retry logic: Calls `fetchPractices()` again
  - [x] Toast notification: Error toast on network failure
  - [x] User feedback: Clear message, not a generic "Something went wrong"

- [x] **Frontend: Empty state** (AC: #6)
  - [x] Component: `PracticeEmptyState.tsx`
  - [x] Message: "No practices available. Please contact support."
  - [x] Display when: API returns 0 practices

- [x] **Frontend: Event logging** (AC: #8)
  - [x] Use Zustand state to track `catalogViewed`
  - [x] Action: After practices load, dispatch event via mutation
  - [x] Event structure: `{ action: "catalog.viewed", teamId, practiceCount }`
  - [x] Note: Event logging happens on client, backend logs via event mutation endpoint

- [x] **Frontend: Zustand state slice** (AC: #1, #3)
  - [x] File: `client/src/features/practices/state/practices.slice.ts`
  - [x] State: `{ practices: [], isLoading, error, currentDetail }`
  - [x] Actions: `setPractices()`, `setLoading()`, `setError()`, `setCurrentDetail()`
  - [x] Selectors: `selectPractices()`, `selectIsLoading()`, `selectError()`
  - [x] Side effect: Fetch practices on page mount

- [x] **Frontend: Integration with team context** (AC: #1)
  - [x] Access: `teamId` from route or Zustand auth state
  - [x] Pass to event logging: Include `teamId` in catalog.viewed event
  - [x] Navigation: Link from team dashboard to practice catalog

- [x] **API: Practice entity type** (AC: #1)
  - [x] Type: `Practice = { id: number, title: string, goal: string, categoryId: string, categoryName: string, pillars: Pillar[] }`
  - [x] Pillar type: `Pillar = { id: number, name: string, category: string, description?: string }`
  - [x] Response uses camelCase (JSON → TypeScript mapping)

- [x] **Testing: API endpoint test** (AC: #1)
  - [x] File: `server/src/routes/practices.routes.test.ts`
  - [x] Test: GET /api/v1/practices returns paginated practices
  - [x] Test: Pagination works (page=1&pageSize=20)
  - [x] Test: Includes pillar data
  - [x] Test: Error handling on service failure

- [x] **Testing: Frontend component test** (AC: #1, #3)
  - [x] File: `client/src/features/practices/pages/PracticeCatalog.test.tsx`
  - [x] Test: Component renders practice list
  - [x] Test: Shows skeleton during loading
  - [x] Test: Shows error with retry button on failure
  - [x] Test: Shows empty state when no practices

- [x] **Testing: API client test** (AC: #1)
  - [x] File: `client/src/features/practices/api/practices.api.test.ts`
  - [x] Test: fetchPractices() calls correct endpoint
  - [x] Test: Response parsing (items, page, total)
  - [x] Test: Error handling

- [x] **Documentation updates** (Mandatory)
  - [x] `docs/05-backend-api.md`: Add GET /api/v1/practices endpoint documentation
  - [x] `docs/06-frontend.md`: Add Practice Catalog page and components
  - [x] `docs/09-changelog.md`: Add Story 2.1 entry under Epic 2
  - [x] Update "Last Updated" dates in all modified files

## Dev Notes

### Developer Context

This story implements the **practice catalog browsing functionality** for teams to view all available practices and their pillar mappings. It builds directly on Story 2.0 (practice data import) and provides the foundation for Stories 2.2-2.8 (search, filtering, add/remove practices, coverage calculation).

**Critical Mission Context:**
🔥 THIS IS THE FIRST USER-FACING FEATURE TEAMS SEE WHEN MANAGING PRACTICES 🔥

This story is the MVP for "practice visibility" in the system. Teams need to understand:
1. **What practices exist** (complete catalog)
2. **What each practice does** (goal/objective)
3. **Which pillars each practice covers** (visual indicators)

The UI must be:
- ✅ **Fast:** All 42+ practices loaded and rendered within 2 seconds
- ✅ **Clear:** Practice titles, goals, and pillar mappings immediately understandable
- ✅ **Usable:** No complex navigation, pagination works smoothly
- ✅ **Reliable:** Graceful error handling and recovery

**Common LLM Mistakes to Prevent:**
- ❌ Fetching all practice data but not including pillar relationships
- ❌ Rendering hundreds of items without pagination (performance cliff)
- ❌ Showing loading spinner with blank page instead of skeleton placeholders
- ❌ Not preserving scroll position when sidebar opens/closes
- ❌ Forgetting to include teamId in event logging
- ❌ Hardcoding pagination params instead of making configurable
- ❌ Not handling empty state or API errors gracefully
- ❌ Creating components without co-located tests

### Project Context: Practice Catalog Foundation

**Story 2.0 Completion:** Practice data is now in the database:
- 42 practices imported
- 19 pillars assigned across practices
- 5 categories mapped
- `practice.repository.ts` has `findAll()` method ready

**Architecture Requirements (from Epic 1):**
- ✅ **Layered Backend:** Routes → Controllers → Services → Repositories
- ✅ **React Feature Structure:** `features/practices/{pages,components,api,state}`
- ✅ **Zustand State:** Domain slice for practices with selectors
- ✅ **Error Handling:** Structured `{code, message, details?, requestId}`
- ✅ **Event Logging:** All user actions logged to database

**Pillar Color Mapping:**
- **VALEURS HUMAINES** (red/crimson) - 4 pillars
- **FEEDBACK & APPRENTISSAGE** (blue) - 4 pillars
- **EXCELLENCE TECHNIQUE** (purple) - 4 pillars
- **ORGANISATION & AUTONOMIE** (green) - 4 pillars
- **FLUX & RAPIDITÉ** (yellow/amber) - 3 pillars

### Technical Requirements

**Backend API Specification:**

**Endpoint:** `GET /api/v1/practices`

**Query Parameters:**
- `page?: number` (default: 1)
- `pageSize?: number` (default: 20, max: 100)

**Request:** None (query string only)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Daily Stand-up",
      "goal": "Synchronize team progress and identify blockers daily",
      "categoryId": "FEEDBACK_APPRENTISSAGE",
      "categoryName": "FEEDBACK & APPRENTISSAGE",
      "pillars": [
        {
          "id": 5,
          "name": "Communication",
          "category": "FEEDBACK & APPRENTISSAGE",
          "description": "Team alignment through regular synchronization"
        },
        {
          "id": 8,
          "name": "Transparency",
          "category": "VALEURS_HUMAINES",
          "description": "Openness about progress and challenges"
        }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

**Error Response (500):**
```json
{
  "code": "database_error",
  "message": "Failed to fetch practices",
  "details": null,
  "requestId": "req-abc123"
}
```

**Backend Implementation Strategy:**

1. **Controller** (`practices.controller.ts`):
   - Extract pagination params from query string
   - Validate: page > 0, pageSize between 1-100
   - Call service: `getPractices(page, pageSize)`
   - Return paginated response

2. **Service** (`practices.service.ts`):
   - Calculate offset: `(page - 1) * pageSize`
   - Call repository: `findAll(offset, pageSize)` with includes (pillars)
   - Call repository: `count()` for total
   - Return: `{ items, page, pageSize, total }`

3. **Repository** (`practice.repository.ts`):
   - `findAll(skip, take): Promise<Practice[]>` (already exists from Story 2.0)
   - `count(): Promise<number>` (new)
   - Include relations: `{ pillars: true, category: true }`
   - Filter: `where: { isGlobal: true }`

4. **Route** (`practices.routes.ts`):
   - Mount at: `router.get('/', getPractices)`
   - No auth middleware needed (practices are public read-only)
   - Middleware: Request ID tracking, error handling

**Frontend Implementation Strategy:**

1. **API Client** (`practices.api.ts`):
   - Function: `fetchPractices(page = 1, pageSize = 20)`
   - Error handling: Transform API errors to structured shape
   - Type safety: Return typed `PracticesResponse`

2. **Zustand Slice** (`practices.slice.ts`):
   - State: `{ practices, isLoading, error, totalCount, currentPage }`
   - Actions: `setPractices`, `setLoading`, `setError`
   - Computed: `selectPracticesToDisplay` (current page slice)
   - Selector: `selectIsEmpty` (total === 0)

3. **Catalog Page** (`PracticeCatalog.tsx`):
   - On mount: Fetch practices (page 1, pageSize 20)
   - Conditional render:
     - Loading: Show skeleton cards
     - Error: Show error message + [Retry]
     - Empty: Show "No practices available"
     - Success: Show practice cards with pagination
   - Zustand hook: `usePracticesStore()`

4. **Practice Card** (`PracticeCard.tsx`):
   - Props: `practice: Practice`
   - Render: Title, goal, category badge, pillar badges
   - Click handler: Open detail sidebar, emit event
   - Styling: TailwindCSS with card background, hover effect

5. **Detail Sidebar** (`PracticeCatalogDetail.tsx`):
   - Props: `practice: Practice | null, onClose: () => void`
   - Conditional: Render only if `practice` is not null
   - Content: Full details (goal, all pillars, description)
   - Animation: Slide in from right, fade overlay
   - Close: Click overlay, ESC key, [X] button

6. **Event Logging:**
   - After practices load successfully
   - Dispatch: `createEvent({ action: 'catalog.viewed', teamId, practiceCount })`
   - Not part of component render (side effect in service layer)

### Library / Framework Requirements

**Backend Stack:**
- **Node.js 18+** (async/await)
- **Express 4.18+** (HTTP server)
- **TypeScript 5.2+** (strict mode)
- **Prisma 7.2+** with `@prisma/client 7.2+` (ORM)
- **Prisma adapter:** `@prisma/adapter-pg` (PostgreSQL)
- **Zod 4.3+** (input validation)

**Frontend Stack:**
- **React 18.2+** (component framework)
- **TypeScript 5.2+** (strict mode)
- **Zustand 4.4+** (state management)
- **TailwindCSS 3.3+** (styling)
- **Vitest 0.34+** (testing)

**Backend Dependencies (Already Installed from Epic 1):**
- ✅ express 4.18+
- ✅ @prisma/client 7.2+
- ✅ prisma 7.2+
- ✅ zod 4.3+
- ✅ typescript 5.2+
- ✅ jest 30.0+

**Frontend Dependencies (Already Installed from Epic 1):**
- ✅ react 18.2+
- ✅ zustand 4.4+
- ✅ tailwindcss 3.3+
- ✅ typescript 5.2+
- ✅ vitest 0.34+

### File Structure Requirements

**New Backend Files:**

```
server/
├── src/
│   ├── routes/
│   │   └── practices.routes.ts (NEW)
│   ├── controllers/
│   │   ├── practices.controller.ts (NEW)
│   │   └── practices.controller.test.ts (NEW)
│   ├── services/
│   │   ├── practices.service.ts (NEW)
│   │   └── practices.service.test.ts (NEW)
│   ├── dtos/
│   │   └── practices.dto.ts (NEW - type definitions)
│   └── middleware/
│       └── (error handler already exists from Epic 1)
```

**New Frontend Files:**

```
client/
└── src/
    ├── features/
    │   └── practices/ (NEW directory)
    │       ├── pages/
    │       │   ├── PracticeCatalog.tsx (NEW)
    │       │   └── PracticeCatalog.test.tsx (NEW)
    │       ├── components/
    │       │   ├── PracticeCard.tsx (NEW)
    │       │   ├── PracticeCard.test.tsx (NEW)
    │       │   ├── PracticeCatalogDetail.tsx (NEW)
    │       │   ├── PracticeCardSkeleton.tsx (NEW)
    │       │   ├── PracticeEmptyState.tsx (NEW)
    │       │   ├── PracticeErrorState.tsx (NEW)
    │       │   └── PracticeCardSkeleton.test.tsx (NEW)
    │       ├── api/
    │       │   ├── practices.api.ts (NEW)
    │       │   └── practices.api.test.ts (NEW)
    │       ├── state/
    │       │   ├── practices.slice.ts (NEW)
    │       │   └── practices.slice.test.ts (NEW)
    │       ├── types/
    │       │   └── index.ts (NEW - Practice, Pillar types)
    │       └── hooks/ (if needed for complex logic)
```

### Naming Conventions

**Backend:**
- Routes: `practices.routes.ts` (plural noun)
- Controllers: `practices.controller.ts` (public methods: `getPractices`)
- Services: `practices.service.ts` (business logic)
- DTOs: `practices.dto.ts` (response types: `PracticesResponse`, `PracticeDetailDto`)
- Functions: camelCase (`getPractices`, `fetchPracticeById`)

**Frontend:**
- Components: PascalCase (`PracticeCatalog.tsx`, `PracticeCard.tsx`)
- Pages: PascalCase in `pages/` directory
- Hooks: `useX` naming (`usePractices` custom hook if needed)
- Zustand slice: `practices.slice.ts` with `usePracticesStore` export
- API client: `practices.api.ts` with functions like `fetchPractices`
- Types: `PracticesResponse`, `Practice`, `Pillar` (PascalCase interfaces)
- Constants: `CATEGORY_COLORS`, `PILLAR_COLORS` (UPPER_SNAKE_CASE)

### TypeScript Types

**Backend DTOs:**

```typescript
// server/src/dtos/practices.dto.ts
export interface PillarDto {
  id: number
  name: string
  category: string
  description?: string
}

export interface PracticeDetailDto {
  id: number
  title: string
  goal: string
  categoryId: string
  categoryName: string
  pillars: PillarDto[]
}

export interface PracticesListResponse {
  items: PracticeDetailDto[]
  page: number
  pageSize: number
  total: number
}

export interface ApiErrorResponse {
  code: string
  message: string
  details?: any
  requestId: string
}
```

**Frontend Types:**

```typescript
// client/src/features/practices/types/index.ts
export interface Pillar {
  id: number
  name: string
  category: string
  description?: string
}

export interface Practice {
  id: number
  title: string
  goal: string
  categoryId: string
  categoryName: string
  pillars: Pillar[]
}

export interface PracticesResponse {
  items: Practice[]
  page: number
  pageSize: number
  total: number
}

export interface PracticesState {
  practices: Practice[]
  isLoading: boolean
  error: string | null
  currentDetail: Practice | null
  totalCount: number
  currentPage: number
}
```

### Architecture Compliance

**Backend Layering:**
- ✅ **Routes** define HTTP endpoints, delegate to controllers
- ✅ **Controllers** parse requests, delegate to services, format responses
- ✅ **Services** contain business logic, call repositories, handle errors
- ✅ **Repositories** perform database queries only, no branching logic
- ✅ **DTOs** define request/response contracts (separate from DB models)

**Frontend Feature Structure:**
- ✅ **Pages** are route-level components (PracticeCatalog.tsx)
- ✅ **Components** are reusable within feature (PracticeCard.tsx, PracticeCatalogDetail.tsx)
- ✅ **API client** handles HTTP communication (practices.api.ts)
- ✅ **State slice** manages Zustand store (practices.slice.ts)
- ✅ **Types** define interfaces (types/index.ts)
- ✅ **Tests** co-located with implementations (*.test.tsx)

**Error Handling:**
- Backend: Structured `{code, message, details?, requestId}` with proper HTTP status
- Frontend: Toast notifications for errors, inline error messages for forms, graceful fallbacks
- Both: Include `requestId` for end-to-end tracing

### Previous Story Intelligence (Story 2.0)

**Database Completeness:**
- ✅ 42 practices imported and verified
- ✅ 19 pillars seeded successfully
- ✅ 5 categories defined
- ✅ Relationships established (practice_pillars join table)
- ✅ Indexes created for performance

**Repository Available:**
- ✅ `practice.repository.findAll()` returns practices with pillars included
- ✅ `practice.repository.count()` returns total practice count
- ✅ Query performance optimized with Prisma includes

**Known Patterns from Epic 1:**
- Auth middleware: `requireAuth` protects routes (not needed for practices)
- Event middleware: Extracts `teamId` from request context
- Error handling: Central error middleware catches all errors
- Response format: Standardized success/error shapes
- Prisma patterns: Use `include` for relations, transactions for multi-operations

### Latest Tech Information

**Prisma 7.2+ Features:**
- `prisma.practice.findMany()` with filtering and pagination
- `prisma.practice.count()` for total counts
- Relations via `include: { pillars: true }`
- Type-safe queries with auto-generated types

**TypeScript 5.2+ Features:**
- Strict mode by default
- Better type inference
- Const type parameters (useful for generic types)
- No `any` types allowed

**React 18.2+ Features:**
- Concurrent rendering
- Suspense boundaries (not required for MVP)
- Automatic batching of state updates
- `useTransition` hook for pending states

**Zustand 4.4+ Features:**
- Simple store creation with `create()`
- No provider wrapper needed (use hook directly)
- Devtools integration for debugging
- TypeScript support with infer types

**TailwindCSS 3.3+ Features:**
- Arbitrary value support: `bg-[#color]`
- Group hover: `group-hover:` prefix
- Container queries: `@container` (experimental)
- Built-in dark mode support

### Git Intelligence Summary

**Recent Commits (from Story 2.0 completion):**
1. **Database schema:** Practice catalog tables with indexes
2. **Seed scripts:** Imported 42 practices with validation
3. **Repository layer:** `findAll()`, `findById()`, `findByCategory()` methods
4. **Event logging:** Transactional pattern established

**Code Patterns to Reuse:**
- Service error handling: See `teams.service.ts`
- Controller structure: See `teams.controller.ts`
- Repository pattern: See `team.repository.ts`
- Zustand slice: See `auth.slice.ts` (already in use)
- Component testing: See `TeamCoverageCard.test.tsx`

**Files Modified by Epic 1:**
- `server/prisma/schema.prisma` → Add more models, use same `@map/@@@map` pattern
- `server/src/controllers/*.ts` → Follow same structure
- `server/src/services/*.ts` → Follow same error handling
- `client/src/features/*/**` → Follow same component organization
- `docs/05-backend-api.md` → Already has patterns for endpoint docs

### Project Context Reference

From `_bmad-output/project-context.md` (Epic 1 verified):

**Critical Rules (Enforced):**
1. ✅ **Team isolation:** Not applicable here (practices are global), but include `teamId` in event logging
2. ✅ **Event logging:** All user actions logged; include `teamId`, `requestId`, `action`
3. ✅ **Error format:** `{code, message, details?, requestId}` with HTTP status
4. ✅ **Prisma mappings:** Use `@map/@@@map` consistently (already applied in Story 2.0)
5. ✅ **TypeScript strict:** No `any`, all types explicit
6. ✅ **Testing discipline:** Co-located tests, mock external dependencies
7. ✅ **Naming consistency:** PascalCase components, camelCase functions
8. ✅ **Documentation updates:** MANDATORY for every story (Definition of Done)

**Tech Stack Verification:**
- ✅ Node.js 18+
- ✅ React 18.2+
- ✅ TypeScript 5.2+
- ✅ Prisma 7.2+ (with prisma.config.ts)
- ✅ Zustand 4.4+
- ✅ TailwindCSS 3.3+
- ✅ Jest 30.0+ / Vitest 0.34+
- ✅ PostgreSQL 14+

**Path Aliases Status:**
- ❌ NOT configured in project
- Use relative imports: `import { ... } from '../../services/...`
- NO `@/` or `@/*` aliases

### Implementation Strategy

**Phase 1: Backend Setup (Endpoints)**
1. Create DTOs for request/response types
2. Implement service layer (`getPractices()` with pagination)
3. Implement controller layer (query parsing, error handling)
4. Create and register routes
5. Test endpoint manually with curl/Postman

**Phase 2: Frontend Setup (Components & State)**
1. Create Zustand slice for practices state
2. Create API client to communicate with backend
3. Implement page component (PracticeCatalog.tsx)
4. Implement card component (PracticeCard.tsx)
5. Implement skeleton/error/empty states

**Phase 3: Integration & Polish**
1. Wire up page with state and API calls
2. Add detail sidebar
3. Test performance with 40+ items
4. Implement event logging
5. Add unit/integration tests

**Phase 4: Documentation & Verification**
1. Update API documentation (docs/05-backend-api.md)
2. Update frontend documentation (docs/06-frontend.md)
3. Update changelog (docs/09-changelog.md)
4. Run full end-to-end flow
5. Verify all acceptance criteria

### Common Pitfalls & Solutions

**Pitfall 1: N+1 Query Problem**
- ❌ Fetching practices, then fetching pillars for each
- ✅ Use Prisma `include` to load pillars with practices in single query
- Code: `findMany({ include: { pillars: true } })`

**Pitfall 2: Loading Performance**
- ❌ Showing blank page with spinner (user sees nothing)
- ✅ Show skeleton placeholders (user sees layout, data loading)
- Implementation: `PracticeCardSkeleton` renders same structure as real card but with shimmer effect

**Pitfall 3: Scroll Position Loss**
- ❌ Opening detail sidebar scrolls page to top
- ✅ Use `overflow-y-auto` on sidebar, preserve scroll position
- Implementation: Detail sidebar is modal/overlay, doesn't affect list scroll

**Pitfall 4: Missing Type Safety**
- ❌ Using `any` types in API responses
- ✅ Define strict TypeScript interfaces for all API contracts
- Implementation: `PracticesResponse`, `Practice`, `Pillar` types

**Pitfall 5: Forgetting teamId in Events**
- ❌ Logging `{ action: 'catalog.viewed', practiceCount }` without teamId
- ✅ Always include `{ action, teamId, practiceCount }`
- Implementation: Extract teamId from auth state or route param

**Pitfall 6: No Error Handling**
- ❌ API fails silently or shows generic "error"
- ✅ Show specific error message with [Retry] button
- Implementation: Error boundary + retry handler

**Pitfall 7: Hardcoded Pagination**
- ❌ Component always fetches pageSize=20 with no way to change
- ✅ Make pagination configurable, defaults to 20, max 100
- Implementation: Accept `page` and `pageSize` as props/state

### Story Dependencies

**Blocks:**
- Story 2.2 (Search and filter) - needs this catalog view foundation
- Story 2.3 (Add practices) - needs practice selection UI
- Story 2.4 (Remove practices) - needs practice management UI
- Story 2.6 (Coverage calculation) - needs practice data available

**Blocked By:**
- Story 2.0 (Import practice data) - ✅ COMPLETE, data ready

**Related Stories:**
- Story 2.1 is the bridge between practice data (2.0) and practice management (2.2-2.8)

### Acceptance Criteria Mapping

| AC # | Implementation | Test |
|------|----------------|------|
| #1 | GET /api/v1/practices endpoint | All practices returned |
| #2 | Practice card shows title, goal, pillars | Card component render |
| #3 | Skeleton placeholders during load | Loading state visible |
| #4 | List scrolls smoothly with 40+ items | Performance test |
| #5 | Detail sidebar on practice click | Sidebar component |
| #6 | Empty state when no practices | Empty practices response |
| #7 | Error message with retry button | Error handling test |
| #8 | Event logged: catalog.viewed | Event creation test |

## Testing Requirements

**Backend Unit Tests:**
- `practices.controller.test.ts`: Pagination parsing, response format
- `practices.service.test.ts`: getPractices logic, pagination math
- `practices.routes.test.ts`: Endpoint returns correct structure

**Frontend Unit Tests:**
- `PracticeCatalog.test.tsx`: Renders list, handles loading/error states
- `PracticeCard.test.tsx`: Renders practice data with correct formatting
- `practices.api.test.ts`: API client calls correct endpoint, parses response
- `practices.slice.test.ts`: Zustand slice state updates correctly

**Integration Tests:**
- End-to-end: Fetch practices → render list → click practice → show detail
- Performance: Load 40+ practices within 2 seconds
- Error scenario: API fails → retry succeeds

**Test Coverage Target:** 80%+ of new code

## Story Completion Status

**Status:** done

**Completion Note:** Backend and frontend catalog experience implemented, event logging wired with team context, documentation updated.

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (via GitHub Copilot - SM Agent)

### Debug Log References

- Ran server Jest suite (`npm test`) after backend endpoint changes — all 14 suites passing (requestId propagation validated).

### Completion Notes List

- Implemented public GET /api/v1/practices with pagination, structured responses, and pillar/category mapping per AC #1-2.
- Added controller, route, and service coverage for pagination/validation; new service unit test added.

### File List

- server/src/controllers/practices.controller.ts
- server/src/services/practices.service.ts
- server/src/services/practices.service.test.ts
- server/src/repositories/practice.repository.ts
- server/src/routes/practices.routes.ts
- server/src/routes/__tests__/practices.routes.test.ts
- client/src/features/practices/api/practices.api.ts
- client/src/features/practices/api/practices.api.test.ts
- client/src/features/practices/state/practices.slice.ts
- client/src/features/practices/state/practices.slice.test.ts
- client/src/features/practices/pages/PracticeCatalog.tsx
- client/src/features/practices/pages/PracticeCatalog.test.tsx
- client/src/features/practices/components/PracticeCard.tsx
- client/src/features/practices/components/PracticeCard.test.tsx
- client/src/features/practices/components/PracticeCardSkeleton.tsx
- client/src/features/practices/components/PracticeEmptyState.tsx
- client/src/features/practices/components/PracticeErrorState.tsx
- client/src/features/practices/components/PracticeCatalogDetail.tsx
- client/src/features/practices/types/index.ts
- docs/05-backend-api.md
- docs/06-frontend.md
- docs/09-changelog.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

---

## Summary

**Story 2.1** implements the practice catalog browsing UI that allows teams to see all 42+ available practices with their goals and pillar mappings. This is a critical user-facing feature that forms the foundation for all subsequent practice management stories (search, filtering, adding/removing practices, coverage calculations).

**Key Implementation Focus:**
- Fast, smooth rendering of large practice list (40+items)
- Clear visual hierarchy: Title → Goal → Pillars
- Robust error handling and recovery
- Complete event logging for research audit trail
- Clean architecture: separation of concerns across layers

**Next Steps:**
1. ✅ Review this story document completely
2. ✅ Run dev-story workflow to implement all tasks
3. ✅ Execute tests to verify acceptance criteria
4. ✅ Update documentation (Definition of Done)
5. ⏭️ Story 2.2: Search and filter practices
