# Frontend

**Frontend Architecture & UI for AAPR Platform**

Last Updated: January 19, 2026  
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

## Next Steps (Epic 2)

### New Features

1. **Practice Catalog View:**
   - Browse practices by category
   - Search/filter practices
   - View pillar mappings

2. **Coverage Visualization:**
   - Bar chart of pillars covered
   - Coverage breakdown by category
   - Highlight gaps

3. **Team Practice Management:**
   - Add/remove practices from team
   - View practice details modal
   - "Recommended Practices" suggestions

---

**Last Updated:** January 19, 2026
