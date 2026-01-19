# Development Guide

**Development Standards & Practices for AAPR Platform**

Last Updated: January 19, 2026  
Team Size: 3 developers (Bob, Elena, Marcus)

---

## Overview

This guide defines:
- **Coding standards** (TypeScript, React, Express)
- **Testing strategy** (unit, integration)
- **Git workflow** (branching, commits, PRs)
- **Code review process**
- **Definition of Done**

---

## Tech Stack Requirements

### Backend

- **Language:** TypeScript 5.2+ (strict mode)
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express 4.18+
- **ORM:** Prisma 5.0+
- **Database:** PostgreSQL 14+
- **Testing:** Jest 29.5+
- **Linting:** ESLint + Prettier

**Locked Dependencies:**
- `express@4.18.2`
- `prisma@5.0.0`

---

### Frontend

- **Language:** TypeScript 5.2+ (strict mode)
- **Framework:** React 18.2 (LOCKED - do not upgrade)
- **State:** Zustand 4.4+
- **Routing:** React Router 6.x
- **Styling:** TailwindCSS 3.0+
- **Build:** Vite 5.0+
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint + Prettier

**Locked Dependencies:**
- `react@18.2.0`
- `react-dom@18.2.0`

---

## TypeScript Configuration

### Strict Mode (Required)

Both `tsconfig.json` files MUST have:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**No `any` Types:**
- Use explicit types or `unknown`
- Use type guards for narrowing

**Null Safety:**
- Always check for `null`/`undefined` before access
- Use optional chaining: `user?.email`
- Use nullish coalescing: `user?.name ?? "Guest"`

---

## Code Style

### General Principles

1. **KISS:** Keep It Simple, Stupid
2. **DRY:** Don't Repeat Yourself (extract shared logic)
3. **YAGNI:** You Aren't Gonna Need It (no premature optimization)
4. **Readability > Cleverness:** Write code for humans, not compilers

---

### Naming Conventions

**Variables & Functions:**
```typescript
// camelCase
const userName = "Jane";
const fetchTeams = async () => { /* ... */ };
```

**Classes & Interfaces:**
```typescript
// PascalCase
class UserService { /* ... */ }
interface Team { /* ... */ }
```

**Constants:**
```typescript
// UPPER_SNAKE_CASE
const MAX_TEAM_NAME_LENGTH = 50;
const DEFAULT_COVERAGE_THRESHOLD = 0.7;
```

**Files:**
- Components: `SignupForm.tsx` (PascalCase)
- Utilities: `authApi.ts` (camelCase)
- Tests: `SignupForm.test.tsx`

---

### Comments

**Good Comments:**
```typescript
// Calculate coverage as percentage of 19 pillars
const coverage = (pillarsCovered / 19) * 100;

// FIXME: Rate limiting not implemented (Epic 3)
// TODO: Add Redis caching for team membership checks
```

**Bad Comments:**
```typescript
// Increment i
i++;

// Get teams
const teams = await getTeams();
```

**Rule:** Comment *why*, not *what*. Code should be self-documenting.

---

## Backend Architecture

**See:** [03-architecture.md#adr-002-layered-backend](03-architecture.md)

### Layer Responsibilities

1. **Routes:** HTTP request/response, input parsing
2. **Controllers:** Orchestration, validation, error handling
3. **Services:** Business logic, transactions
4. **Repositories:** Database queries (Prisma)

**Example Flow:**
```
POST /api/teams
  ↓
routes/teamRoutes.ts → router.post('/', teamController.createTeam)
  ↓
controllers/teamController.ts → validate input, call service
  ↓
services/teamService.ts → business logic, call repo + eventRepo
  ↓
repositories/teamRepository.ts → Prisma query
```

---

### Error Handling

**All errors MUST use structured format:**
```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
  }
}

throw new AppError("Team not found", 404, "TEAM_NOT_FOUND");
```

**Controller Pattern:**
```typescript
try {
  const result = await teamService.createTeam(name, practices);
  res.status(201).json(result);
} catch (error) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
  } else {
    console.error(error);
    res.status(500).json({ error: "Internal server error", code: "UNKNOWN_ERROR" });
  }
}
```

---

### Event Logging

**ALWAYS log significant actions:**
```typescript
await eventRepository.create({
  eventType: "team.created",
  actorId: userId,
  teamId: team.id,
  entityType: "team",
  entityId: team.id,
  action: "create",
  payload: { name: team.name, practiceIds },
});
```

**See:** [03-architecture.md#adr-004-event-logging](03-architecture.md)

---

## Frontend Architecture

**See:** [06-frontend.md](06-frontend.md)

### Component Structure

**Feature-First Organization:**
```
src/features/
├── auth/
│   ├── SignupForm.tsx
│   ├── LoginForm.tsx
│   ├── authSlice.ts
│   └── authApi.ts
└── teams/
    ├── TeamsList.tsx
    ├── CreateTeamForm.tsx
    ├── teamsSlice.ts
    └── teamsApi.ts
```

---

### React Best Practices

**Functional Components (No Classes):**
```tsx
export const SignupForm: React.FC = () => {
  const [name, setName] = useState("");
  // ...
};
```

**Custom Hooks for Logic:**
```tsx
const useTeams = () => {
  const { teams, fetchTeams } = useTeamsStore();
  
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  
  return teams;
};
```

**Props Typing:**
```tsx
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = "primary" }) => {
  // ...
};
```

---

### State Management (Zustand)

**Slice Pattern:**
```typescript
interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  
  login: async (email, password) => {
    const user = await authApi.login(email, password);
    set({ user });
  },
  
  logout: async () => {
    await authApi.logout();
    set({ user: null });
  },
}));
```

**Usage:**
```tsx
const { user, login } = useAuthStore();
```

---

## Testing Strategy

### Backend Testing (Jest)

**File:** `server/src/__tests__/teamService.test.ts`

**Coverage Target:** 85%+

**Test Structure:**
```typescript
describe("TeamService", () => {
  describe("createTeam", () => {
    it("should create team with practices", async () => {
      const team = await teamService.createTeam("Alpha", [1, 5], userId);
      expect(team.name).toBe("Alpha");
      expect(team.id).toBeDefined();
    });
    
    it("should throw error for duplicate team name", async () => {
      await teamService.createTeam("Alpha", [], userId);
      await expect(teamService.createTeam("Alpha", [], userId))
        .rejects
        .toThrow("Team name already exists");
    });
  });
});
```

**Run Tests:**
```powershell
cd server
npm test
```

**Coverage Report:**
```powershell
npm test -- --coverage
```

---

### Frontend Testing (Vitest)

**File:** `client/src/features/auth/__tests__/SignupForm.test.tsx`

**Coverage Target:** 80%+

**Test Structure:**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import SignupForm from "../SignupForm";

describe("SignupForm", () => {
  it("renders signup form", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
  
  it("submits form with valid data", async () => {
    render(<SignupForm />);
    
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByText("Sign Up"));
    
    await screen.findByText("Welcome, Jane!");
  });
});
```

**Run Tests:**
```powershell
cd client
npm test
```

---

### Integration Tests

**Location:** `server/src/__tests__/integration/`

**Example:** `authFlow.integration.test.ts`
```typescript
describe("Authentication Flow", () => {
  it("should signup, login, and logout", async () => {
    // Signup
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Jane", email: "jane@example.com", password: "password123" });
    expect(signupRes.status).toBe(201);
    
    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@example.com", password: "password123" });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"];
    
    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);
  });
});
```

---

## Git Workflow

### Branching Strategy

**Main Branches:**
- `main` - Production-ready code
- `develop` - Integration branch (not yet implemented)

**Feature Branches:**
```
feature/1-1-user-registration
feature/1-2-user-login
bugfix/fix-invite-email-encoding
```

**Naming Convention:**
```
<type>/<story-id>-<short-description>
```

**Types:** `feature`, `bugfix`, `hotfix`, `docs`, `refactor`

---

### Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(auth): implement user registration with email validation

- Add POST /api/auth/signup endpoint
- Hash passwords with bcrypt (10 rounds)
- Log user.registered event
- Add unit tests for AuthService

Closes #1-1
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

### Pull Request Process

**1. Create Branch:**
```powershell
git checkout -b feature/2-1-practice-catalog
```

**2. Make Changes:**
```powershell
git add .
git commit -m "feat(practices): add practice catalog API endpoint"
```

**3. Push to Remote:**
```powershell
git push origin feature/2-1-practice-catalog
```

**4. Create PR:**
- Title: `[Epic 2] Story 2-1: Practice Catalog API`
- Description:
  - What changed?
  - Why?
  - How to test?
  - Screenshots (if UI)
- Link to story: `Closes #2-1`

**5. Code Review:**
- Assign reviewers (minimum 1)
- Address feedback
- Request re-review

**6. Merge:**
- Squash and merge (keep history clean)
- Delete feature branch

---

## Code Review Checklist

**Reviewer Responsibilities:**

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases handled
- [ ] No regressions

### Code Quality
- [ ] Follows TypeScript strict mode
- [ ] No `any` types
- [ ] DRY principle followed
- [ ] Functions < 50 lines
- [ ] Clear variable names

### Architecture
- [ ] Follows layered backend pattern
- [ ] Feature-first frontend organization
- [ ] No business logic in controllers/components

### Security
- [ ] No SQL injection (Prisma parameterized)
- [ ] Input validation present
- [ ] Passwords hashed (never plaintext)
- [ ] No secrets in code

### Testing
- [ ] Unit tests added/updated
- [ ] Tests pass locally
- [ ] Coverage maintained (85%+)

### Documentation
- [ ] README updated (if needed)
- [ ] API docs updated (if endpoint changed)
- [ ] Comments for complex logic

---

## Definition of Done

**Story is DONE when:**

1. **Code Complete:**
   - [ ] All acceptance criteria met
   - [ ] Code follows style guide
   - [ ] No linting errors

2. **Testing:**
   - [ ] Unit tests written (85%+ coverage)
   - [ ] Integration tests (if applicable)
   - [ ] Manual testing completed
   - [ ] No regressions

3. **Documentation (MANDATORY):**
   - [ ] **Changelog updated** ([09-changelog.md](09-changelog.md) - ALWAYS required)
   - [ ] **API docs updated** ([05-backend-api.md](05-backend-api.md) - if endpoints added/changed)
   - [ ] **Database docs updated** ([04-database.md](04-database.md) - if schema changed)
   - [ ] **Frontend docs updated** ([06-frontend.md](06-frontend.md) - if components/routes added)
   - [ ] **Architecture docs updated** ([03-architecture.md](03-architecture.md) - if ADR added/modified)
   - [ ] **Infrastructure docs updated** ([07-infrastructure.md](07-infrastructure.md) - if env vars/deployment changed)
   - [ ] README updated (if setup process changed)
   - [ ] "Last Updated" dates updated in all modified docs

4. **Code Review:**
   - [ ] PR approved by 1+ reviewer
   - [ ] All feedback addressed
   - [ ] **Reviewer verified documentation accuracy**

5. **Deployment:**
   - [ ] Merged to `main`
   - [ ] Deployed to production (or staging)
   - [ ] Smoke tests passed

6. **Research Integrity (AAPR-specific):**
   - [ ] Events logged for significant actions
   - [ ] No breaking changes to event schema (or migration documented)

**⚠️ IMPORTANT:** Documentation updates are **NOT OPTIONAL**. PRs without documentation updates will be rejected during code review.

---

## Performance Guidelines

### Backend

**Target Response Times:**
- Auth endpoints: < 200ms
- Team list: < 100ms
- Team creation: < 300ms

**Database Queries:**
- Use indexes for WHERE/JOIN clauses
- Avoid N+1 queries (use Prisma `include`)
- Profile slow queries: `EXPLAIN ANALYZE`

**Example:**
```typescript
// BAD: N+1 query
const teams = await prisma.team.findMany();
for (const team of teams) {
  team.members = await prisma.teamMember.findMany({ where: { teamId: team.id } });
}

// GOOD: Single query with join
const teams = await prisma.team.findMany({
  include: { teamMembers: true },
});
```

---

### Frontend

**Target Metrics:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 300 KB (gzipped)

**Optimization:**
- Code splitting: `lazy(() => import("./TeamDetail"))`
- Memoization: `useMemo`, `React.memo`
- Debounce user input (search)

---

## Security Guidelines

### Input Validation

**ALWAYS validate:**
- Email format (RFC 5322)
- Password strength (≥ 8 chars)
- String lengths (prevent buffer overflow)
- Array lengths (prevent DoS)

**Backend:**
```typescript
if (name.length < 1 || name.length > 100) {
  throw new AppError("Name must be 1-100 characters", 400, "INVALID_NAME");
}
```

**Frontend:**
```tsx
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

### Authentication

**JWT Best Practices:**
- Store in HTTP-only cookies (NEVER localStorage)
- Set `secure=true` in production
- Set `sameSite=Lax` or `Strict`
- Expire after 24 hours

**Password Best Practices:**
- Hash with bcrypt (10+ rounds)
- Never log passwords
- Never return password in API response

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed:**
```powershell
# Check Docker container
docker ps

# Restart container
docker restart aapr-postgres

# Check DATABASE_URL in .env
```

**2. TypeScript Errors:**
```powershell
# Regenerate Prisma Client
cd server
npx prisma generate

# Clear TypeScript cache
rm -rf node_modules/.cache
```

**3. Port Already in Use:**
```powershell
# Find process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess

# Kill process
Stop-Process -Id <PID>
```

---

## Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com/) - IDE
- [Postman](https://www.postman.com/) - API testing
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Mailtrap](https://mailtrap.io/) - Email testing

---

**Last Updated:** January 19, 2026
