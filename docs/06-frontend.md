# Frontend

**Frontend Architecture & UI for AAPR Platform**

Last Updated: January 20, 2026  
Stack: React 18.2, TypeScript 5.2+, Vite 5.0+, TailwindCSS 3.0+

---

## Overview

The AAPR frontend is a **single-page application (SPA)** built with:
- **UI Framework:** React 18.2 (locked version for stability)
- **State Management:** Zustand 4.4+ (lightweight, no boilerplate)
- **Routing:** React Router 6.x (declarative routing)
- **Styling:** TailwindCSS 3.0+ (utility-first CSS)
- **HTTP Client:** Fetch API (native, no axios)
- **Build Tool:** Vite 5.0+ (fast HMR, optimized builds)

---

## Project Structure

```
client/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # TailwindCSS imports
│   ├── features/
│   │   ├── auth/
│   │   │   ├── SignupForm.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── authSlice.ts      # Zustand store
│   │   │   └── authApi.ts        # API calls
│   │   └── teams/
│   │       ├── TeamsList.tsx
│   │       ├── CreateTeamForm.tsx
│   │       ├── TeamMembersPanel.tsx
│   │       ├── InviteMembersPanel.tsx
│   │       ├── teamsSlice.ts      # Zustand store
│   │       └── teamsApi.ts        # API calls
│   ├── components/            # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Navbar.tsx
│   └── __tests__/             # Vitest tests
│       ├── SignupForm.test.tsx
│       └── TeamsList.test.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Routing

**File:** [src/App.tsx](../client/src/App.tsx)

### Routes

| Path | Component | Authentication | Description |
|------|-----------|----------------|-------------|
| `/` | Redirect → `/teams` or `/login` | Optional | Landing page |
| `/signup` | `SignupForm` | Public | User registration |
| `/login` | `LoginForm` | Public | User login |
| `/teams` | `TeamsList` | Required | List user's teams |
| `/teams/create` | `CreateTeamForm` | Required | Create new team |
| `/teams/:id` | `TeamDetail` | Required | Team practices (Epic 2) |
| `/practices` | `PracticeCatalog` | Required | Global practice catalog (Story 2.1) |

### Route Guards

**Protected Routes:**
```tsx
<Route
  path="/teams"
  element={isAuthenticated ? <TeamsList /> : <Navigate to="/login" />}
/>
```

**Logic:**
- Check `authSlice.user` in Zustand store
- If user exists → render component
- If null → redirect to `/login`

---

## State Management

**Library:** Zustand 4.4+  
**Pattern:** Feature-based slices (no global store)

### Practices Slice

**File:** [src/features/practices/state/practices.slice.ts](../client/src/features/practices/state/practices.slice.ts)

**State:**
```typescript
{
  practices: Practice[],
  isLoading: boolean,
  error: string | null,
  total: number,
  page: number,
  pageSize: number,
  currentDetail: Practice | null,
  catalogViewed: boolean
}
```

**Actions:**
```typescript
loadPractices(page = 1, pageSize = 20, teamId?: number | null): Promise<void>
setCurrentDetail(practice | null): void
retry(): Promise<void>
```

**Side effects:**
- Calls `fetchPractices(page, pageSize)` and updates state
- After success, logs `catalog.viewed` with `{ teamId, practiceCount, timestamp }`
- On error, captures message and exposes `retry()` with last page params

---

## Practice Catalog (Story 2.1)

**Route:** `/practices` (protected)

**Page:** [PracticeCatalog.tsx](../client/src/features/practices/pages/PracticeCatalog.tsx)
- Fetch on mount: `loadPractices(1, 20, teamIdFromQuery)` where `teamId` is read from `?teamId=` query param
- States handled: loading skeleton (10 cards), error with retry, empty state, success grid
- Detail sidebar: click a card to open; closes on overlay click, ESC, or [X]; body scroll locked while open
- Header: Back to Teams, Logout

**Components:**
- `PracticeCard.tsx`: Title, goal, category badge, pillar badges (category-color mapped)
- `PracticeCardSkeleton.tsx`: Shimmer placeholders (10 items)
- `PracticeEmptyState.tsx`: "No practices available. Please contact support."
- `PracticeErrorState.tsx`: Error copy + [Retry]
- `PracticeCatalogDetail.tsx`: Slide-in sidebar with goal, category, pillars, notes

**API Client:** [practices.api.ts](../client/src/features/practices/api/practices.api.ts)
- `fetchPractices(page, pageSize)` → `{ items, page, pageSize, total, requestId }`
- Adds `X-Request-Id` header; tolerates missing `requestId` in response
- `logCatalogViewed(teamId, practiceCount)` best-effort POST `/api/v1/events`

**Testing:**
- `PracticeCatalog.test.tsx`: loading, list render, empty state, error state
- `PracticeCard.test.tsx`: content render and click handler
- `practices.slice.test.ts`: load success, error, retry uses last params and logs teamId
- `practices.api.test.ts`: happy path, network failure, non-ok response

### authSlice

**File:** `src/features/auth/authSlice.ts`

**State:**
```typescript
{
  user: { userId: number; name: string; email: string } | null,
  isLoading: boolean,
  error: string | null
}
```

**Actions:**
```typescript
signup(name, email, password): Promise<void>
login(email, password): Promise<void>
logout(): Promise<void>
setUser(user): void
clearError(): void
```

**Usage:**
```tsx
const { user, login, logout } = useAuthStore();

await login("jane@example.com", "password123");
if (user) {
  // Redirect to /teams
}
```

---

### teamsSlice

**File:** `src/features/teams/teamsSlice.ts`

**State:**
```typescript
{
  teams: Team[],
  selectedTeam: Team | null,
  members: TeamMember[],
  isLoading: boolean,
  error: string | null
}
```

**Team Type:**
```typescript
interface Team {
  id: number;
  name: string;
  createdAt: string;
  memberCount: number;
  pillars_covered: number;
  coverage: number;
}
```

**Actions:**
```typescript
fetchTeams(): Promise<void>
createTeam(name, practiceIds): Promise<void>
fetchTeamMembers(teamId): Promise<void>
inviteMembers(teamId, emails): Promise<void>
removeMember(teamId, userId): Promise<void>
```

**Usage:**
```tsx
const { teams, fetchTeams, createTeam } = useTeamsStore();

useEffect(() => {
  fetchTeams();
}, [fetchTeams]);

await createTeam("Alpha Squad", [1, 5, 12]);
```

---

## Feature Breakdown

### Authentication

#### SignupForm
**File:** `src/features/auth/SignupForm.tsx`

**Features:**
- Name, email, password inputs
- Client-side validation (email format, password length)
- Submit → POST `/api/auth/signup`
- Success → Set cookie, redirect to `/teams`
- Error → Display error message

**Validation Rules:**
- Name: Required, 1-100 characters
- Email: Valid format (RFC 5322)
- Password: ≥ 8 characters

**UI Elements:**
```tsx
<Input label="Name" type="text" />
<Input label="Email" type="email" />
<Input label="Password" type="password" />
<Button type="submit">Sign Up</Button>
```

---

#### LoginForm
**File:** `src/features/auth/LoginForm.tsx`

**Features:**
- Email, password inputs
- Submit → POST `/api/auth/login`
- Success → Set cookie, redirect to `/teams`
- Error → Display "Invalid credentials"

**UI Elements:**
```tsx
<Input label="Email" type="email" />
<Input label="Password" type="password" />
<Button type="submit">Log In</Button>
<Link to="/signup">Don't have an account? Sign up</Link>
```

---

### Teams

#### TeamsList
**File:** `src/features/teams/TeamsList.tsx`

**Features:**
- Fetch teams on mount → GET `/api/teams`
- Display team cards with:
  - Team name
  - Member count
  - Coverage % (colored badge)
  - "View Team" button
- "Create Team" button → Navigate to `/teams/create`

**Coverage Badges:**
- 0-33%: Red (`bg-red-500`)
- 34-66%: Yellow (`bg-yellow-500`)
- 67-100%: Green (`bg-green-500`)

**Empty State:**
```tsx
{teams.length === 0 && (
  <div className="text-center">
    <p>You're not in any teams yet.</p>
    <Button onClick={() => navigate("/teams/create")}>
      Create Your First Team
    </Button>
  </div>
)}
```

---

#### CreateTeamForm
**File:** `src/features/teams/CreateTeamForm.tsx`

**Features:**
- Team name input
- Practice selection checkboxes (fetched from backend - Epic 2)
- Submit → POST `/api/teams`
- Success → Redirect to `/teams`

**Practice Selection (Epic 2):**
```tsx
<div className="grid grid-cols-2 gap-4">
  {practices.map(p => (
    <label key={p.id}>
      <input type="checkbox" value={p.id} />
      {p.title}
    </label>
  ))}
</div>
```

**Validation:**
- Team name: 3-50 characters, required
- Practices: Optional (0-N practices)

---

#### TeamMembersPanel
**File:** `src/features/teams/TeamMembersPanel.tsx`

**Features:**
- Display members and pending invites
- "Remove" button for each member (except self)
- Status badges:
  - `Added`: Green badge
  - `Pending`: Yellow badge
  - `Failed`: Red badge with retry option

**UI:**
```tsx
<div className="members-list">
  {members.map(m => (
    <div key={m.email} className="flex items-center justify-between">
      <div>
        <p>{m.name || m.email}</p>
        <span className={statusBadgeClass(m.status)}>
          {m.status}
        </span>
      </div>
      {m.id !== currentUserId && (
        <Button onClick={() => removeMember(teamId, m.id)}>
          Remove
        </Button>
      )}
    </div>
  ))}
</div>
```

---

#### InviteMembersPanel
**File:** `src/features/teams/InviteMembersPanel.tsx`

**Features:**
- Email input (comma-separated or one-per-line)
- Submit → POST `/api/teams/:teamId/invites`
- Display results (success/failure per email)
- Clear input on success

**Email Parsing:**
```tsx
const parseEmails = (input: string): string[] => {
  return input
    .split(/[\n,]/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
};
```

**Validation:**
- 1-10 emails per request
- Valid email format
- No duplicates

**UI:**
```tsx
<textarea
  placeholder="Enter emails (one per line or comma-separated)"
  rows={4}
/>
<Button onClick={handleInvite}>Send Invitations</Button>
```

---

## Shared Components

### Button
**File:** `src/components/Button.tsx`

**Variants:**
- Primary: `bg-blue-600 text-white hover:bg-blue-700`
- Secondary: `bg-gray-200 text-gray-800 hover:bg-gray-300`
- Danger: `bg-red-600 text-white hover:bg-red-700`

**Props:**
```typescript
interface ButtonProps {
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}
```

---

### Input
**File:** `src/components/Input.tsx`

**Features:**
- Label, input, error message
- Types: text, email, password, number
- Auto-focus, disabled, required

**Props:**
```typescript
interface InputProps {
  label: string;
  type?: "text" | "email" | "password" | "number";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
```

**UI:**
```tsx
<div className="input-group">
  <label>{label}</label>
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={error ? "border-red-500" : "border-gray-300"}
  />
  {error && <p className="text-red-500 text-sm">{error}</p>}
</div>
```

---

### Navbar
**File:** `src/components/Navbar.tsx`

**Features:**
- Logo / App title
- Navigation links (if authenticated):
  - Teams
  - Create Team
- User menu (dropdown):
  - User name
  - Logout button

**UI:**
```tsx
<nav className="bg-blue-600 text-white p-4">
  <div className="flex justify-between items-center">
    <Link to="/">AAPR Platform</Link>
    {user && (
      <div className="flex items-center gap-4">
        <Link to="/teams">Teams</Link>
        <div className="user-menu">
          <p>{user.name}</p>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    )}
  </div>
</nav>
```

---

## API Integration

### authApi.ts

**File:** `src/features/auth/authApi.ts`

**Functions:**
```typescript
export const signup = async (name: string, email: string, password: string) => {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Send cookies
    body: JSON.stringify({ name, email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Signup failed");
  }
  
  return res.json();
};

export const login = async (email: string, password: string) => { /* ... */ };
export const logout = async () => { /* ... */ };
```

**Key Pattern:**
- `credentials: "include"` → Always send cookies
- Throw errors for non-200 responses
- Parse JSON error messages

---

### teamsApi.ts

**File:** `src/features/teams/teamsApi.ts`

**Functions:**
```typescript
export const fetchTeams = async (): Promise<Team[]> => {
  const res = await fetch("/api/teams", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
};

export const createTeam = async (name: string, practiceIds: number[]) => { /* ... */ };
export const fetchTeamMembers = async (teamId: number) => { /* ... */ };
export const inviteMembers = async (teamId: number, emails: string[]) => { /* ... */ };
export const removeMember = async (teamId: number, userId: number) => { /* ... */ };
```

---

## Styling

**Framework:** TailwindCSS 3.0+  
**Config:** `tailwind.config.js`

### Custom Theme

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",   // Blue-600
        secondary: "#64748b", // Gray-500
        danger: "#dc2626",    // Red-600
        success: "#16a34a",   // Green-600
      },
    },
  },
};
```

### Utility Classes

**Common Patterns:**
- Flexbox: `flex items-center justify-between`
- Grid: `grid grid-cols-2 gap-4`
- Spacing: `p-4 m-2 px-6 py-3`
- Typography: `text-lg font-bold text-gray-800`
- Borders: `border border-gray-300 rounded-lg`
- Hover: `hover:bg-blue-700 hover:shadow-lg`

---

## Testing

**Framework:** Vitest + React Testing Library

**Test Files:**
- `SignupForm.test.tsx`
- `LoginForm.test.tsx`
- `TeamsList.test.tsx`
- `CreateTeamForm.test.tsx`

**Run Tests:**
```powershell
cd client
npm test
```

**Coverage Target:** 80%+ (Epic 1: 85%)

**Example Test:**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import SignupForm from "./SignupForm";

test("submits signup form with valid data", async () => {
  render(<SignupForm />);
  
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  
  fireEvent.click(screen.getByText("Sign Up"));
  
  await screen.findByText("Welcome, Jane!");
});
```

---

## Performance

### Optimizations

1. **Code Splitting (Future):**
   ```typescript
   const TeamDetail = lazy(() => import("./TeamDetail"));
   ```

2. **Memoization:**
   ```typescript
   const filteredTeams = useMemo(() => {
     return teams.filter(t => t.coverage > 50);
   }, [teams]);
   ```

3. **Debounced Input (Future):**
   ```typescript
   const debouncedSearch = useDebounce(searchTerm, 300);
   ```

### Build Optimization

**Vite Config:**
```typescript
export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
```

**Bundle Size (Epic 1):**
- Vendor chunk: ~150 KB (gzipped)
- App chunk: ~50 KB (gzipped)
- Total: ~200 KB

---

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Remove member">
  <TrashIcon />
</button>
```

### Keyboard Navigation

- All interactive elements focusable
- Tab order matches visual order
- Enter/Space triggers buttons

### Screen Reader Support

- Semantic HTML (`<nav>`, `<main>`, `<section>`)
- Alt text for images
- Form labels associated with inputs

---

## Browser Support

**Target:** Modern browsers (last 2 versions)
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Not Supported:** IE11 (React 18 dropped support)

---

### practicesSlice

**File:** `src/features/practices/state/practices.slice.ts`

**State:**
```typescript
{
  practices: Practice[],
  isLoading: boolean,
  error: string | null,
  page: number,
  pageSize: number,
  total: number,
  currentDetail: Practice | null,
  catalogViewed: boolean
}
```

**Practice Type:**
```typescript
interface Practice {
  id: number;
  title: string;
  goal: string;
  categoryId: string;
  categoryName: string;
  pillars: Array<{
    id: number;
    name: string;
    category: string;
  }>;
}
```

**Actions:**
```typescript
loadPractices(page: number, pageSize: number, category?: string | null): Promise<void>
setCurrentDetail(practice: Practice | null): void
retry(): Promise<void>
```

**Usage:**
```tsx
const { practices, isLoading, loadPractices } = usePracticesStore();

useEffect(() => {
  loadPractices(1, 20);
}, []);
```

---

## Practice Catalog Feature

### PracticeCatalog Page
**File:** `src/features/practices/pages/PracticeCatalog.tsx`

**Features:**
- Fetch practices on mount → GET `/api/v1/practices`
- Display paginated grid of practice cards
- Click card to view details in sidebar
- Loading skeleton UI
- Error state with retry
- Empty state fallback

**UI Layout:**
```tsx
<div className="min-h-screen bg-gray-50">
  <header>Back to Teams | Practice Catalog | Logout</header>
  <main>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {practices.map(p => <PracticeCard key={p.id} practice={p} />)}
    </div>
    {currentDetail && <PracticeCatalogDetail practice={currentDetail} />}
  </main>
</div>
```

**Pagination (Not Yet Implemented):**
- Default: 20 items per page
- Next/Previous buttons to paginate
- Show "Page X of Y"

---

### PracticeCard Component
**File:** `src/features/practices/components/PracticeCard.tsx`

**Features:**
- Display practice title and goal
- Show category badge with tailored color
- Display pillar names
- Hover effect to indicate clickable
- Click → Open detail sidebar

**UI:**
```tsx
<div className="border rounded-lg p-4 hover:shadow-lg cursor-pointer">
  <h3 className="font-bold text-lg">{practice.title}</h3>
  <p className="text-gray-600 text-sm">{practice.goal}</p>
  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${categoryColor}`}>
    {practice.categoryName}
  </span>
  <div className="mt-2 flex flex-wrap gap-1">
    {practice.pillars.map(p => (
      <span key={p.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
        {p.name}
      </span>
    ))}
  </div>
</div>
```

**Category Colors:**
- `FEEDBACK & APPRENTISSAGE`: `bg-blue-500`
- `PLANIFICATION`: `bg-green-500`
- `EXCELLENCE_TECHNIQUE`: `bg-purple-500`
- etc.

---

### PracticeCatalogDetail Component
**File:** `src/features/practices/components/PracticeCatalogDetail.tsx`

**Features:**
- Sidebar modal showing full practice details
- Close button (X) to dismiss
- Display all pillar mappings
- "Back to Catalog" button
- Add to team button (Epic 2)

**UI:**
```tsx
<div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50">
  <div className="p-6 flex flex-col h-full">
    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 mb-4">
      ✕ Close
    </button>
    <h2 className="text-2xl font-bold">{practice.title}</h2>
    <p className="text-gray-600 mt-2">{practice.goal}</p>
    <div className="mt-6">
      <h3 className="font-semibold">Pillars Covered:</h3>
      <ul className="mt-2">
        {practice.pillars.map(p => (
          <li key={p.id} className="text-sm text-gray-700">• {p.name} ({p.category})</li>
        ))}
      </ul>
    </div>
  </div>
</div>
```

---

### PracticeCardSkeleton
**File:** `src/features/practices/components/PracticeCardSkeleton.tsx`

**Features:**
- Animated placeholder during loading
- Matches PracticeCard dimensions
- Uses `animate-pulse` TailwindCSS class

---

### PracticeEmptyState
**File:** `src/features/practices/components/PracticeEmptyState.tsx`

**UI:**
```tsx
<div className="text-center py-12">
  <p className="text-gray-500 text-lg">No practices available</p>
  <p className="text-gray-400 text-sm mt-1">Check back soon for practice data</p>
</div>
```

---

### PracticeErrorState
**File:** `src/features/practices/components/PracticeErrorState.tsx`

**Features:**
- Display error message
- Retry button to re-fetch

**UI:**
```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
  <h3 className="text-lg font-semibold text-red-700">Unable to load practices</h3>
  <p className="text-red-600 mt-2">{message}</p>
  <Button onClick={onRetry} className="mt-4 bg-red-600 hover:bg-red-700">
    Try Again
  </Button>
</div>
```

---

### practicesApi.ts

**File:** `src/features/practices/api/practices.api.ts`

**Functions:**
```typescript
export const fetchPractices = async (
  page: number = 1,
  pageSize: number = 20,
  category?: string | null
): Promise<PracticesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (category) {
    params.append("category", category);
  }
  
  const res = await fetch(`/api/v1/practices?${params}`, {
    credentials: "include",
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new ApiError(error.code || "unknown", error.error || "Failed to fetch");
  }
  
  return res.json();
};

export const logCatalogViewed = async (teamId?: number) => {
  try {
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        event_type: "catalog_viewed",
        team_id: teamId,
      }),
    });
  } catch {
    // Silently fail, don't block UX
  }
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

**Response Type:**
```typescript
interface PracticesResponse {
  items: Practice[];
  page: number;
  pageSize: number;
  total: number;
  requestId?: string;
}
```

---

## Routing Update

**File:** `src/App.tsx`

**New Routes:**
```tsx
<Route
  path="/practices"
  element={
    <ProtectedRoute>
      <PracticeCatalog />
    </ProtectedRoute>
  }
/>
```

**Navigation:**
- Header button "Practice Catalog" (visible when authenticated)
- Navigates to `/practices`
- Accessible from all authenticated pages

---

## Next Steps (Epic 2)

### Enhancements

1. **Pagination UI:**
   - Previous/Next buttons
   - Page indicator
   - Jump to page input

2. **Filtering & Search:**
   - Filter by category dropdown
   - Search by practice title
   - Clear filters button

3. **Coverage Dashboard:**
   - Bar chart of pillar coverage
   - Category breakdown
   - Comparison with other teams

---

**Last Updated:** January 20, 2026
