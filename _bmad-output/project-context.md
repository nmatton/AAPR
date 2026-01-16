---
projectName: AAPPR
createdDate: 2026-01-15
sectionsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
---

# Project Context - AAPPR

**Purpose:** This document captures critical implementation rules and patterns that AI agents MUST follow when writing code for this project. It focuses on unobvious details and version constraints that prevent costly mistakes.

---

## 1. Technology Stack & Version Constraints

### Frontend Stack

**Core Technologies (MUST use exact versions or newer):**
- **React 18.2.x** (component framework, peer dependency) - LOCKED to 18.2 for MVP stability
- **TypeScript 5.2+** (strict mode: true required)
- **Vite 5.0+** (build tool, < 600ms HMR)
- **TailwindCSS 3.3+** (utility-first styling)
- **Zustand 4.4+** (state management, domain slices)
- **Vitest 0.34+** (testing framework, Vite-native)

**Critical Peer Dependencies:**
- `@types/react` MUST match `react` major.minor version (e.g., both 18.2.x)
- `@types/react-dom` MUST match `react-dom` major.minor version
- PostCSS 8.4+ (required by TailwindCSS 3+)
- Autoprefixer 10.4+ (CSS vendor prefixes)

### Backend Stack

**Core Technologies (MUST use exact versions or newer):**
- **Node.js 18+ LTS** (native ES modules, async/await)
- **Express 4.18+** (HTTP framework, NOT NestJS)
- **TypeScript 5.2+** (strict mode: true required)
- **Prisma 5.0+** (ORM, schema-first)
- **PostgreSQL 14+** (database, Prisma adapter support)
- **Jest 29.7+** (testing framework)

**Critical Peer Dependencies:**
- `@prisma/client` runtime MUST match `prisma` CLI version (e.g., 5.0.0 both)
- `@types/express` MUST match `express` major version
- `@types/node` MUST match Node.js version (e.g., 20.x for Node 20)
- bcrypt 5.1+ (password hashing, version 4.x has performance issues)

### Dependency Chain Constraints

**Frontend Chain:**
```
React 18.2 → @types/react 18.2 (MUST match)
Vite 5.0 → esbuild (TypeScript support required)
           → Rollup (bundling)
           → Node 18+ (HMR support)
TailwindCSS 3.3 → PostCSS 8.4+ (required peer)
                → Autoprefixer 10.4+
Vitest → Vite (shared config)
      → Node 18+ (test runner)
```

**Backend Chain:**
```
Prisma 5.0 → @prisma/client (runtime)
          → prisma (CLI) - MUST match versions
          → PostgreSQL adapter (DB specific)
Express 4.18 → Node 18+ (required)
            → TypeScript 5.2+ (transpilation)
jsonwebtoken 9.1 → JWT signing/verification
bcrypt 5.1 → 10+ rounds for hashing (performance critical)
Jest 29.7 → ts-jest (TypeScript support)
```

### Version Pinning Rules for AI Agents

**Frontend package.json:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^0.34.0"
  },
  "engines": {
    "node": "^18.0.0"
  }
}
```

**Decision Note:** React locked to 18.2.x for MVP stability (3-week timeline). DO NOT upgrade to React 19 during MVP.

**Backend package.json:**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.0.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.0",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "prisma": "^5.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0"
  },
  "engines": {
    "node": "^18.0.0"
  }
}
```

### Critical Version Mismatch Prevention Rules

**MUST CHECK before writing code:**

1. **Prisma versions aligned:**
   - `@prisma/client` version MUST equal `prisma` CLI version
   - Example: Both 5.0.0 or both 5.1.0, NOT mixed 5.0 and 5.1
   - Mismatch = database migration failures

2. **React types aligned:**
   - `@types/react` major.minor MUST match `react` major.minor
   - Example: React 18.2.x requires @types/react 18.2.x
   - Mismatch = TypeScript compilation errors with hooks

3. **Express types matched:**
   - `@types/express` major version MUST match `express` major version
   - Example: Express 4.18 requires @types/express 4.17+
   - Mismatch = route handlers lose type safety

4. **Node version constraint:**
   - Node 18+ is REQUIRED (not optional)
   - Vite HMR requires Node 18+ (Node 16 fails on startup)
   - PostgreSQL native driver requires Node 18+ for async

5. **TypeScript strict mode:**
   - Both frontend and backend tsconfig.json MUST have `"strict": true`
   - NO exceptions for any module
   - Enables type safety for schema generation and validation

### Known Good Compatibility Matrix

| Frontend | Backend | Node | TypeScript | Status |
|----------|---------|------|------------|--------|
| React 18.2 + Vite 5 | Express 4.18 + Prisma 5 | 18.17+ | 5.2+ | ✅ MVP Stack (LOCKED) |
| React 18.2 + Vite 4 | Express 4.18 + Prisma 5 | 18.17+ | 5.2+ | ⚠️ Works, not recommended |
| React 19.2 + Vite 5 | Express 4.18 + Prisma 5 | 18.17+ | 5.2+ | ❌ Post-MVP only |

### What Could Break (Anti-Patterns)

**NEVER MIX:**
- ❌ React 18.0 with @types/react 18.2 (type mismatch)
- ❌ Prisma 4.x with prisma CLI 5.x (major version mismatch)
- ❌ Node 16 with Vite (HMR incompatible)
- ❌ TailwindCSS v2 with PostCSS 8 (compatibility break)
- ❌ TypeScript strict: false anywhere (loses type safety)
- ❌ bcrypt < 5.0 (performance issues, security concerns)

**ALWAYS VERIFY:**
- After npm install: `npm ls typescript` (single version)
- After npm install: `npm ls @types/react` (matches React version)
- Prisma schema changes: run `prisma generate` to sync types
- Frontend type generation: check `npm run generate:types` before commits

---

## 2. Language-Specific Rules (TypeScript)

### TypeScript Configuration Requirements

**Frontend tsconfig.json - CRITICAL SETTINGS:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Backend tsconfig.json - CRITICAL SETTINGS:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**NON-NEGOTIABLE Settings:**
- ✅ `"strict": true` (both frontend and backend - NO EXCEPTIONS)
- ✅ `"noUnusedLocals": true` (catch unused variables)
- ✅ `"noUnusedParameters": true` (catch unused function params)
- ✅ `"noFallthroughCasesInSwitch": true` (prevent switch fall-through bugs)

### Import/Export Conventions

**MUST DO:**
```typescript
// ✅ Frontend: named exports for components
export const TeamCoverageCard = () => { ... }
export const IssueList = () => { ... }

// ✅ Backend: named exports for functions/services
export const calculateCoverage = (teamId: number) => { ... }
export const createIssue = async (dto: CreateIssueDto) => { ... }

// ✅ Index files re-export for convenience
// src/components/index.ts
export { TeamCoverageCard } from './TeamCoverageCard'
export { IssueList } from './IssueList'

// ✅ Absolute imports using path aliases
// tsconfig.json: "baseUrl": ".", "paths": { "@/*": ["src/*"] }
import { TeamCoverageCard } from '@/components/TeamCoverageCard'
import { calculateCoverage } from '@/services/coverage.service'
```

**NEVER DO:**
```typescript
// ❌ Mixing default and named exports in same file
export default TeamCoverageCard
export const IssueList = () => { ... }

// ❌ Wildcard imports in application code
import * as utils from '@/utils'

// ❌ Relative imports for cross-feature modules
import { CoverageService } from '../../../services/coverage'

// ❌ Circular imports
// ComponentA imports from ComponentB, B imports from A = build error
```

### Async/Await & Promise Patterns

**MUST DO:**
```typescript
// ✅ Async/await for all async operations
async function fetchTeam(teamId: number): Promise<Team> {
  try {
    const response = await fetch(`/api/v1/teams/${teamId}`)
    if (!response.ok) throw new Error('Network error')
    return response.json()
  } catch (error) {
    throw new AppError('team_fetch_failed', 'Failed to fetch team', error)
  }
}

// ✅ Promise.all() for parallel operations
const [team, practices, coverage] = await Promise.all([
  fetchTeam(teamId),
  fetchPractices(teamId),
  fetchCoverage(teamId)
])

// ✅ Proper error handling with context
try {
  await prisma.issue.create({ data: { ...issueData } })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new AppError('duplicate_issue', 'Issue already exists')
    }
  }
  throw error
}
```

**NEVER DO:**
```typescript
// ❌ .then().catch() chains
fetchTeam(id).then(t => console.log(t)).catch(e => console.error(e))

// ❌ Fire-and-forget promises
fetchTeam(id) // Error silently fails!

// ❌ Swallowing errors
try { await operation() } catch (error) { }
```

### Error Handling Patterns

**MUST DO - Structured Error Objects:**
```typescript
// ✅ Custom AppError class
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ✅ Use in services with structured context
export const createIssue = async (teamId: number, dto: CreateIssueDto) => {
  if (!dto.title) {
    throw new AppError(
      'validation_error',
      'Issue title is required',
      { field: 'title' },
      400
    )
  }
  try {
    return await prisma.issue.create({
      data: { teamId, ...dto }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientUniqueConstraintError) {
      throw new AppError(
        'duplicate_issue',
        'An issue with this title already exists',
        { existingId: error.meta?.target },
        409
      )
    }
    throw new AppError(
      'database_error',
      'Failed to create issue',
      { originalError: error },
      500
    )
  }
}
```

**NEVER DO:**
```typescript
// ❌ Generic Error('message only')
throw new Error('Something went wrong')

// ❌ Returning error objects
return { error: 'Failed to create issue' }

// ❌ Catching and ignoring
try { await operation() } catch (e) { }

// ❌ Throwing without context
throw new Error('fail')
```

### Type Definitions

**MUST DO:**
```typescript
// ✅ Define types before using them
interface Team {
  id: number
  name: string
  createdAt: Date
}

// ✅ Explicit function types
function getTeam(teamId: number): Promise<Team> {
  // implementation
}

// ✅ Discriminated unions for variants
type IssueEvent = 
  | { type: 'created'; issueId: number }
  | { type: 'resolved'; issueId: number; resolution: string }
```

**NEVER DO:**
```typescript
// ❌ Using 'any' type
function process(data: any) { ... }

// ❌ Implicit any
function getUser(id) { ... }

// ❌ No return types
function calculate(x: number, y: number) { ... }
```

---

**[C] Continue - Save Language-Specific Rules and proceed to Framework-Specific Rules

---

## 3. Framework-Specific Rules (React & Express)

### React Hooks & Component Patterns

**MUST DO - React Hooks:**
```typescript
// ✅ Use hooks at top level (not in loops/conditionals)
export const TeamDashboard = ({ teamId }: Props) => {
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const data = await fetchCoverage(teamId)
        setCoverage(data)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [teamId])
  
  return <Dashboard {...} />
}

// ✅ Custom hooks for shared logic
export const useTeamData = (teamId: number) => {
  const [data, setData] = useState<TeamData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    fetch(`/api/v1/teams/${teamId}`)
      .then(r => r.json())
      .then(setData)
      .catch(setError)
  }, [teamId])
  
  return { data, error, isLoading: data === null && !error }
}

// ✅ useCallback for event handlers passed to children
export const IssueForm = ({ onSubmit }: Props) => {
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }, [onSubmit])
  
  return <form onSubmit={handleSubmit}>...</form>
}

// ✅ useMemo for expensive computations
const expensiveValue = useMemo(() => {
  return calculateCoverage(practices, pillars)
}, [practices, pillars])
```

**NEVER DO:**
```typescript
// ❌ Calling hooks conditionally
if (isValid) {
  const [value, setValue] = useState(null) // ERROR!
}

// ❌ Calling hooks in loops
teams.forEach(team => {
  const [data, setData] = useState(null) // ERROR!
})

// ❌ Missing dependency arrays
useEffect(() => {
  fetchData(teamId)
}) // Re-runs on EVERY render!

// ❌ Not using useCallback for event handlers
const handleClick = () => { doSomething() }
// Recreated on every render, breaks child memoization
```

### Express Routes & Controllers

**MUST DO - Express Route Structure:**
```typescript
// ✅ routes/teams.routes.ts
import { Router } from 'express'
import * as teamController from '@/controllers/teams.controller'
import { requireAuth } from '@/middleware/auth'
import { validateTeamIsolation } from '@/middleware/team-isolation'

export const teamsRouter = Router()

// All routes include auth + team isolation middleware
teamsRouter.get('/:teamId/practices', 
  requireAuth,
  validateTeamIsolation,
  teamController.getPractices
)

teamsRouter.post('/:teamId/practices',
  requireAuth,
  validateTeamIsolation,
  teamController.addPractice
)

// ✅ controllers/teams.controller.ts (thin, delegates to service)
export const getPractices = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const teamId = parseInt(req.params.teamId)
    const practices = await teamService.getPractices(teamId)
    res.json({ items: practices })
  } catch (error) {
    next(error) // Pass to error middleware
  }
}

// ✅ services/teams.service.ts (business logic)
export const getPractices = async (teamId: number): Promise<Practice[]> => {
  if (!teamId) {
    throw new AppError('invalid_team_id', 'Team ID required', {}, 400)
  }
  return await practiceRepository.findByTeam(teamId)
}

// ✅ repositories/practice.repository.ts (data access only)
export const findByTeam = async (teamId: number): Promise<Practice[]> => {
  return prisma.practice.findMany({
    where: { teamPractices: { some: { teamId } } },
    orderBy: { name: 'asc' }
  })
}
```

**NEVER DO:**
```typescript
// ❌ Business logic in routes
app.get('/teams/:id/practices', async (req, res) => {
  const practices = await db.query(...)
  const filtered = practices.filter(p => p.active)
  res.json(filtered)
})

// ❌ Direct database queries in controllers
export const getPractices = async (req, res) => {
  const data = await prisma.practice.findMany() // Should be in repo
  res.json(data)
}

// ❌ Missing error handling
export const getTeam = async (req, res) => {
  const team = await teamService.getTeam(req.params.id)
  res.json(team) // What if service throws?
}

// ❌ Not using middleware for cross-cutting concerns
app.get('/teams/:id', (req, res) => {
  const teamId = req.params.id
  // Auth check scattered everywhere
})
```

### Prisma Schema Patterns

**MUST DO - Snake Case DB, Strict Types:**
```prisma
// ✅ schema.prisma: @map for DB column names
model Team {
  /// Auto-incrementing ID, used in URLs
  id        Int      @id @default(autoincrement())
  
  /// Unique team name (business key)
  name      String   @unique @db.VarChar(255)
  
  /// ISO 8601 creation timestamp
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relationships
  members   TeamMember[]
  practices TeamPractice[]
  issues    Issue[]
  coverage  TeamCoverage?
  
  @@map("teams")
}

model Event {
  id           Int      @id @default(autoincrement())
  eventType    String   @map("event_type") @db.VarChar(50)
  actorId      Int?     @map("actor_id")
  teamId       Int      @map("team_id")
  entityType   String?  @map("entity_type") @db.VarChar(50)
  entityId     Int?     @map("entity_id")
  action       String?  @db.VarChar(50)
  payload      Json?
  schemaVersion String  @default("v1") @map("schema_version")
  createdAt    DateTime @default(now()) @map("created_at")
  
  @@index([teamId, eventType], map: "idx_events_team_type")
  @@index([entityType, entityId], map: "idx_events_entity")
  @@map("events")
}

// ✅ Client generation produces correct camelCase types
// Prisma generates: { id, name, createdAt, updatedAt, ... }
```

**NEVER DO:**
```prisma
// ❌ No @map (forces camelCase in DB, violates convention)
model Team {
  id    Int
  name  String
  createdAt DateTime // DB column is "createdAt" - inconsistent
}

// ❌ Missing field documentation (/// comments)
model Team {
  id   Int  // What does this mean to researchers?
  name String
}

// ❌ Missing indexes for query performance
model Event {
  teamId Int // Events queried by (teamId, type) but no index!
  type   String
}
```

---

## 4. Testing Rules (Jest & Vitest)

### Test File Organization

**MUST DO - Co-Located Tests:**
```typescript
// Frontend:
// src/features/teams/
//   ├── components/
//   │   ├── TeamCard.tsx
//   │   └── TeamCard.test.tsx
//   ├── hooks/
//   │   ├── useTeamData.ts
//   │   └── useTeamData.test.ts
//   └── api/
//       ├── teams.api.ts
//       └── teams.api.test.ts

// Backend:
// src/
//   ├── services/
//   │   ├── teams.service.ts
//   │   └── teams.service.test.ts
//   ├── repositories/
//   │   ├── team.repository.ts
//   │   └── team.repository.test.ts
//   └── routes/
//       ├── teams.routes.ts
//       └── teams.routes.test.ts

// Shared test utilities:
// src/__tests__/helpers/
//   ├── fixtures/
//   │   ├── team.fixtures.ts
//   │   └── issue.fixtures.ts
//   └── mocks/
//       ├── prisma.mock.ts
//       └── api.mock.ts
```

**MUST DO - Test Structure:**
```typescript
// ✅ Frontend component test
describe('TeamCoverageCard', () => {
  it('displays coverage percentage', () => {
    const { getByText } = render(
      <TeamCoverageCard coverage={{ overall_coverage_pct: 75 }} />
    )
    expect(getByText('75%')).toBeInTheDocument()
  })
  
  it('shows warning when coverage < 50%', () => {
    const { getByRole } = render(
      <TeamCoverageCard coverage={{ overall_coverage_pct: 30 }} />
    )
    expect(getByRole('alert')).toHaveClass('warning')
  })
})

// ✅ Service test with mocked repository
describe('TeamService', () => {
  it('calculates coverage from practices', async () => {
    const mockPractices = [
      { pillarId: 1 }, { pillarId: 2 }, { pillarId: 3 }
    ]
    jest.spyOn(practiceRepository, 'findByTeam').mockResolvedValue(mockPractices)
    
    const coverage = await teamService.calculateCoverage(1)
    
    expect(coverage.pillarCount).toBe(3)
    expect(coverage.percentage).toBe(3/19 * 100)
  })
  
  it('throws AppError for invalid team', async () => {
    await expect(teamService.calculateCoverage(999))
      .rejects.toThrow(AppError)
  })
})

// ✅ Integration test with real database
describe('Team API Integration', () => {
  it('POST /teams/:id/practices adds practice to team', async () => {
    const response = await request(app)
      .post('/api/v1/teams/1/practices')
      .set('Authorization', `Bearer ${token}`)
      .send({ practiceId: 5 })
    
    expect(response.status).toBe(201)
    expect(response.body.id).toBeDefined()
  })
})
```

**NEVER DO:**
```typescript
// ❌ Tests without describe blocks
it('does something', () => { ... })
it('does another thing', () => { ... })

// ❌ Overly broad test assertions
expect(result).toBeDefined() // Too vague

// ❌ Sharing state between tests
let team
beforeAll(() => { team = createTeam() })
it('test 1', () => { ... })
it('test 2', () => { team.name = 'modified' }) // Affects test 1!

// ❌ No test fixtures/factories
// Duplicated test data in every test
const team = { id: 1, name: 'Team A', createdAt: ... }
const team2 = { id: 2, name: 'Team B', createdAt: ... }
```

### Test Fixtures & Factories

**MUST DO:**
```typescript
// src/__tests__/helpers/fixtures/team.fixtures.ts
export const createTeamFixture = (overrides?: Partial<Team>): Team => ({
  id: 1,
  name: 'Test Team',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides
})

export const createIssueFixture = (overrides?: Partial<Issue>): Issue => ({
  id: 1,
  teamId: 1,
  title: 'Test Issue',
  status: 'open',
  createdAt: new Date('2026-01-15'),
  ...overrides
})

// Usage in tests:
const team = createTeamFixture({ name: 'Custom Team' })
const issue = createIssueFixture({ status: 'resolved' })
```

---

## 5. Code Quality & Style Rules

### Naming Conventions (Strict)

**MUST DO:**
```typescript
// ✅ PascalCase: Components, Classes, Types
export const TeamCoverageCard = () => { }
export class AppError extends Error { }
export interface TeamData { }

// ✅ camelCase: Functions, variables, constants
export const calculateCoverage = (teamId: number) => { }
const isDarkMode = true
const maxRetries = 3

// ✅ UPPER_SNAKE_CASE: Immutable constants
const MAX_COVERAGE_THRESHOLD = 100
const API_BASE_URL = 'https://api.example.com'

// ✅ useX: Custom hooks
export const useTeamData = () => { }
export const useCoverage = () => { }

// ✅ Event naming: domain.action (lowercase snake_case)
export const EVENT_TYPES = {
  ISSUE_CREATED: 'issue.created',
  ISSUE_RESOLVED: 'issue.resolved',
  PRACTICE_ADDED: 'practice.added'
} as const

// ✅ Files: Match export (PascalCase for components/classes)
// TeamCoverageCard.tsx (component)
// teams.service.ts (service)
// team.repository.ts (repository)
```

**NEVER DO:**
```typescript
// ❌ Inconsistent casing
export const teamCoverageCard = () => { } // Should be TeamCoverageCard
const IsDarkMode = true // Should be isDarkMode
const maxCoverageThreshold = 100 // Should be MAX_COVERAGE_THRESHOLD

// ❌ Single letter names except in loops
const t = getTeam() // What is 't'?
const p = practices // What is 'p'?

// ❌ Abbreviated names that lose clarity
const calc = (id) => { } // Should be calculateCoverage
const chk = isValid // Should be check
```

### Documentation & Comments

**MUST DO:**
```typescript
// ✅ JSDoc for public functions
/**
 * Calculate team's practice coverage percentage across all pillars
 * @param teamId - The team identifier
 * @param practices - List of practices to analyze
 * @returns Coverage percentage (0-100)
 * @throws AppError if teamId is invalid
 */
export const calculateCoverage = (teamId: number, practices: Practice[]): number => {
  // implementation
}

// ✅ Inline comments for "why", not "what"
// Why: Concurrency control prevents lost updates when multiple users edit simultaneously
const version = entity.version
const expected = updateDto.version

// ❌ DON'T:
// Set version to entity version (obvious!)
const version = entity.version

// ✅ Type documentation in Prisma schema
/// Team entity - represents a research team using the platform
/// Isolation: team_id is the primary boundary for all queries
/// Privacy: Team names are not anonymized in research exports
model Team {
  id Int
}
```

**NEVER DO:**
```typescript
// ❌ Obvious comments
const name = 'test' // set name to test

// ❌ Outdated comments
// TODO: Fix this in the next sprint (written 6 months ago!)

// ❌ No function documentation
export const process(data: any) { }
```

---

## 6. Critical Don't-Miss Rules (Anti-Patterns & Edge Cases)

### Team Isolation - DO NOT SKIP

**CRITICAL - EVERY query must enforce team isolation:**
```typescript
// ✅ CORRECT: Always filter by teamId
export const findByTeam = async (teamId: number): Promise<Issue[]> => {
  return prisma.issue.findMany({
    where: { teamId } // REQUIRED
  })
}

// ❌ WRONG: Missing teamId filter = data leak!
export const findAll = async (): Promise<Issue[]> => {
  return prisma.issue.findMany()
  // Team A can read Team B's issues!
}

// ✅ CORRECT: Even in nested queries
export const getTeamWithIssues = async (teamId: number) => {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      issues: {
        where: { teamId } // ALSO filter includes!
      }
    }
  })
}
```

### Event Logging - MUST BE TRANSACTIONAL

**CRITICAL - Operation + event must both succeed or both rollback:**
```typescript
// ✅ CORRECT: Atomic transaction
await prisma.$transaction(async (tx) => {
  // Create issue
  const issue = await tx.issue.create({
    data: { teamId, title, content }
  })
  
  // Log event (fails = whole transaction rolls back)
  await tx.event.create({
    data: {
      eventType: 'issue.created',
      teamId,
      entityType: 'issue',
      entityId: issue.id,
      payload: { issueId: issue.id, title }
    }
  })
  
  return issue
})

// ❌ WRONG: Separate operations = event gets lost on error
const issue = await prisma.issue.create({ data: {...} })
await prisma.event.create({ data: {...} }) // If this fails, issue exists but event missing!
```

### API Response Format - MUST ALWAYS INCLUDE requestId

**CRITICAL - Every response includes requestId for tracing:**
```typescript
// ✅ CORRECT: Success response
res.json({
  items: practices,
  page: 1,
  pageSize: 20,
  total: 42
})
// Middleware adds: headers: { 'x-request-id': '...' }

// ✅ CORRECT: Error response
res.status(400).json({
  code: 'validation_error',
  message: 'Issue title is required',
  details: { field: 'title', code: 'required' },
  requestId: req.id
})

// ❌ WRONG: No requestId in error
res.status(500).json({ error: 'Something broke' })
// Can't trace the issue in logs!
```

### Optimistic Concurrency - ONLY WITH VERSION

**CRITICAL - Version-based updates prevent overwrites:**
```typescript
// ✅ CORRECT: Version-based update
UPDATE issues 
SET content = ?, status = ?, version = version + 1
WHERE id = ? AND teamId = ? AND version = ?
-- If version doesn't match: 0 rows affected = return 409 Conflict

// ❌ WRONG: No version check = silent overwrites
UPDATE issues 
SET content = ?, status = ?
WHERE id = ? AND teamId = ?
-- Both users' changes accepted, one overwrites the other
```

### Prisma Mappings - MUST SYNC DB TO TS

**CRITICAL - Every snake_case DB column needs @map:**
```prisma
// ✅ CORRECT: @map ensures consistency
model Issue {
  id        Int      @id
  teamId    Int      @map("team_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("issues")
}
// Generated types: { id, teamId, createdAt, ... }
// API returns: { id, teamId, createdAt, ... }
// DB columns: team_id, created_at
// All consistent!

// ❌ WRONG: No @map = API leaks DB column names
model Issue {
  id        Int
  team_id   Int // TypeScript has team_id everywhere
  created_at DateTime
}
// Generated types: { id, team_id, created_at }
// API returns camelCase: { teamId, createdAt }
// Frontend confused!
```

### TypeScript Strict Mode - NON-NEGOTIABLE

```typescript
// ✅ CORRECT: Strict mode catches issues
// tsconfig.json: "strict": true

const data: string = 42 // ERROR: Type 'number' is not assignable to type 'string'
function getData(id: number): string { return id } // ERROR: 'number' is not assignable to 'string'

// ❌ WRONG: Without strict mode = silent bugs
const data = 42
data.toUpperCase() // No error! But crashes at runtime
```

### React Dependencies - ALWAYS SPECIFY

**CRITICAL - Missing dependencies cause stale closures:**
```typescript
// ✅ CORRECT: Dependency array includes all dependencies
useEffect(() => {
  loadData(teamId, filters)
}, [teamId, filters]) // Re-runs when either changes

// ❌ WRONG: Missing filters dependency
useEffect(() => {
  loadData(teamId, filters)
}, [teamId]) // filters changes ignored!
```

---

## Summary: Critical Rules for AI Agents

**These rules are NON-NEGOTIABLE and will be enforced by CI tests:**

1. ✅ **Team isolation:** EVERY query filters by `teamId`
2. ✅ **Event logging:** ALL mutations wrapped in transactions
3. ✅ **Error format:** Structured `{code, message, details?, requestId}`
4. ✅ **Prisma mappings:** All `@map/@@@map` present, no DB column leakage
5. ✅ **TypeScript strict:** No `any`, no implicit types
6. ✅ **Version-based concurrency:** Only update with version match
7. ✅ **Testing discipline:** Co-located tests, fixtures, mocks
8. ✅ **Naming consistency:** PascalCase/camelCase/UPPER_SNAKE_CASE per type
9. ✅ **React dependencies:** Dependency arrays complete
10. ✅ **Error handling:** Structured AppError, no silent failures

**Violations will:**
- Fail linting (ESLint rules)
- Fail type checking (TypeScript strict mode)
- Fail tests (pattern compliance)
- Be caught in code review (architectural validation)

---

**Status:** Project context file complete and ready for AI agent implementation.

**Location:** `_bmad-output/project-context.md`

**Next Steps:**
1. Review complete architecture document: `_bmad-output/planning-artifacts/architecture.md`
2. Review complete project context: `_bmad-output/project-context.md`
3. Share both documents with development team
4. Begin Week 1 infrastructure setup from Architecture document
5. AI agents read both documents before implementing each story

**🎉 Workflow Complete!****