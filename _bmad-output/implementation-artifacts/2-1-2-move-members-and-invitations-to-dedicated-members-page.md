# Story 2.1.2: Move Members & Invitations to Dedicated "Members" Page

Status: done

<!-- Implementation completed by AI Agent on January 23, 2026 -->

## Story

As a team member,
I want to manage team members on a dedicated page accessed via a header link,
So that the main dashboard stays focused on practices while I can manage team composition when needed.

## Acceptance Criteria

1. **Given** I'm on the Team Dashboard header
   **When** I see the top navigation
   **Then** there's a [Members] or [Team Members] link/button in the header

2. **Given** I click [Members]
   **When** the page navigates
   **Then** I'm taken to a dedicated "Team Members" page with full width for member management

3. **Given** I'm on the Members page
   **When** the page loads
   **Then** I see:
   - Full list of current members with: name, email, join date, remove option
   - Invite panel: text field to enter email, [Invite] button
   - Pending invites list: email, status (Pending/Failed), [Resend] button

4. **Given** I'm on the Members page
   **When** I enter a new email and click [Invite]
   **Then** the invite is sent (same logic as Story 1.5)
   **And** I see a success message: "Invite sent to [email]"
   **And** the pending invites list updates immediately

5. **Given** I'm viewing pending invites
   **When** I see an invite with "Failed" status
   **Then** there's a [Retry] button to resend the email

6. **Given** I'm removing a member
   **When** I click [Remove] next to a member name
   **Then** a confirmation dialog appears: "Remove [Name] from the team? They'll lose access."
   **And** I can confirm or cancel

7. **Given** I'm on the Members page
   **When** the page loads
   **Then** an event is logged: `{ action: "members_page.viewed", teamId, timestamp }`

8. **Given** the Members page is separate
   **When** I return to the Team Dashboard
   **Then** the dashboard no longer shows the members sidebar
   **And** the practice list takes up more space (more room for practice details/scrolling)

## Tasks / Subtasks

- [x] Create new route `/teams/:teamId/members` in App.tsx (Task AC: 1, 2)
  - [x] Add route definition with team isolation middleware
  - [x] Create TeamMembersView page component
  - [x] Add navigation link in Team Dashboard header

- [x] Implement TeamMembersView component (Task AC: 3, 7)
  - [x] Design full-width layout with members list and invite panel
  - [x] Wire to existing member and invite store slices
  - [x] Add event logging for page view

- [x] Build MembersList component with CRUD operations (Task AC: 3, 6)
  - [x] Display member name, email, join date
  - [x] Add [Remove] button with confirmation dialog
  - [x] Handle remove operation via API and state update

- [x] Build InvitePanel component with email input (Task AC: 3, 4, 5)
  - [x] Email input field with validation
  - [x] [Invite] button that calls invite API
  - [x] Success/error toast notifications
  - [x] Real-time invite list update

- [x] Build PendingInvitesList component (Task AC: 3, 5)
  - [x] Display invite email, status (Pending/Failed), [Resend] button
  - [x] Wire [Retry]/[Resend] to resend email API
  - [x] Update invite status on retry success/failure

- [x] Update Team Dashboard layout (Task AC: 8)
  - [x] Remove MembersSidebar component from dashboard
  - [x] Adjust practice list to use reclaimed space
  - [x] Add [Members] link to dashboard header

- [x] Add comprehensive tests (Task AC: ALL)
  - [x] TeamMembersView rendering and navigation
  - [x] MembersList CRUD operations and confirmation dialog
  - [x] InvitePanel validation, submission, and toast notifications
  - [x] PendingInvitesList retry logic
  - [x] Route integration and accessibility

## Dev Notes

**This story refactors team member management from an embedded sidebar to a dedicated page, improving dashboard focus and member management UX.**

### Architecture & Tech Stack Compliance

**Frontend Stack (from project-context.md):**
- React 18.2 + TypeScript 5.2+ (strict mode)
- Vite 5.0+ for development
- TailwindCSS 3.3+ for styling
- Zustand 4.4+ for state management (domain slices)
- React Router 7.12+ for navigation

**Backend Stack:**
- Node.js 18+ LTS
- Express 4.18+
- Prisma 7.2+ with PostgreSQL 14+
- JWT authentication (HTTP-only cookies)

**Critical Requirements:**
- Team isolation enforced at database level (all queries filter by teamId)
- Event logging for audit trail (append-only events table)
- Structured error responses with `{ code, message, details, requestId }`
- TypeScript strict mode: `true` (no `any`, explicit types)

### Technical Requirements

**API Endpoints (already implemented in Epic 1):**

From Story 1.5 and 1.6, these endpoints exist:

```typescript
// Members API
GET /api/v1/teams/:teamId/members
  → Returns: { items: Member[], requestId }
  → Member: { id, name, email, joinedAt, role }

DELETE /api/v1/teams/:teamId/members/:memberId
  → Returns: { success: true, requestId }
  → Event: { action: "team_member.removed", teamId, userId }

// Invites API
POST /api/v1/teams/:teamId/invites
  → Body: { email: string }
  → Returns: { invite: Invite, requestId }
  → Event: { action: "invite.created", inviteId, teamId, email }

GET /api/v1/teams/:teamId/invites
  → Returns: { items: Invite[], requestId }
  → Invite: { id, email, status, createdAt }

POST /api/v1/teams/:teamId/invites/:inviteId/resend
  → Returns: { success: true, requestId }
  → Event: { action: "invite.resent", inviteId, teamId }
```

**State Management:**

Existing Zustand slices (from Epic 1):
- `client/src/features/teams/state/membersSlice.ts` - Member management
- `client/src/features/teams/state/invitesSlice.ts` - Invite management

Both slices should be imported into a combined store for the Members page.

**Navigation Structure:**

Current routes (from Epic 1 and 2):
- `/teams` - Teams list
- `/teams/:teamId` - Team dashboard
- `/teams/:teamId/practices/manage` - Practice management

New route to add:
- `/teams/:teamId/members` - **NEW** Team members page

### File Structure Requirements

**Frontend (feature-first structure):**

```
client/src/features/teams/
├── pages/
│   ├── TeamMembersView.tsx              # NEW - Main members page
│   ├── TeamDashboard.tsx                # MODIFY - Remove members sidebar
├── components/
│   ├── MembersList.tsx                  # NEW - Member list with remove
│   ├── InvitePanel.tsx                  # NEW - Email invite form
│   ├── PendingInvitesList.tsx           # NEW - Pending invites list
│   ├── MembersSidebar.tsx               # REMOVE - No longer needed
│   ├── TeamDashboardHeader.tsx          # MODIFY - Add Members link
├── state/
│   ├── membersSlice.ts                  # EXISTS - Reuse
│   ├── invitesSlice.ts                  # EXISTS - Reuse
├── api/
│   ├── membersApi.ts                    # EXISTS - Reuse
│   ├── invitesApi.ts                    # EXISTS - Reuse
├── types/
│   ├── member.types.ts                  # EXISTS - Reuse
│   ├── invite.types.ts                  # EXISTS - Reuse
└── __tests__/
    ├── TeamMembersView.test.tsx         # NEW - Page tests
    ├── MembersList.test.tsx             # NEW - Component tests
    ├── InvitePanel.test.tsx             # NEW - Component tests
    ├── PendingInvitesList.test.tsx      # NEW - Component tests
```

**Backend (no changes needed):**
All API endpoints already exist from Epic 1 Stories 1.5 and 1.6.

### Testing Requirements

**Component Tests (Vitest + React Testing Library):**

1. **TeamMembersView.test.tsx:**
   - Renders members list, invite panel, and pending invites
   - Loads data from store on mount
   - Logs `members_page.viewed` event on mount
   - Handles loading and error states
   - Keyboard navigation and accessibility

2. **MembersList.test.tsx:**
   - Displays member name, email, join date
   - [Remove] button triggers confirmation dialog
   - Confirmation calls remove API and updates store
   - Cancel closes dialog without action
   - Handles API errors gracefully

3. **InvitePanel.test.tsx:**
   - Email validation (format, required)
   - [Invite] button disabled until valid email
   - Successful invite shows toast and clears form
   - Failed invite shows error toast
   - Updates pending invites list immediately

4. **PendingInvitesList.test.tsx:**
   - Displays invite email, status, [Resend] button
   - [Retry]/[Resend] calls resend API
   - Success updates status and shows toast
   - Failure shows error toast

**Integration Tests:**
- Route navigation from dashboard to members page
- Data flow: API → Store → Components
- Team isolation middleware verification

### Previous Story Intelligence (Story 2.1.1)

**Key Learnings from 2.1.1:**
- ✅ Keep existing data flow via Zustand stores - don't fetch redundantly
- ✅ Maintain real-time updates when data changes (add/remove triggers re-fetch)
- ✅ Add comprehensive accessibility: aria-labels, keyboard navigation, focus management
- ✅ Use TailwindCSS utilities for responsive layout (avoid inline styles)
- ✅ Co-locate tests with components for maintainability
- ✅ Update both `docs/06-frontend.md` and `docs/09-changelog.md` with new routes/components

**Code Patterns Established:**
- Feature-first structure: pages, components, state, API, types
- Zustand slices for domain state with loading/error states
- API functions return `{ items, requestId }` format
- Toast notifications for user feedback
- Confirmation dialogs for destructive actions

**Testing Patterns:**
- Vitest + React Testing Library
- Mock API responses and store state
- Test loading, success, error, and edge cases
- Keyboard and accessibility coverage

### Library & Framework Requirements

**React Patterns:**
- Function components with hooks (no class components)
- `useState` for local component state
- `useEffect` for side effects (data loading, event logging)
- `useCallback` for event handlers passed to children
- Zustand `useStore` hooks for global state

**Zustand State Management:**
```typescript
// Example usage pattern from existing code
import { useTeamStore } from '@/features/teams/state/teamStore'

const TeamMembersView = () => {
  const { members, invites, isLoading, error, fetchMembers, fetchInvites } = useTeamStore()
  
  useEffect(() => {
    fetchMembers(teamId)
    fetchInvites(teamId)
  }, [teamId])
  
  // Component logic
}
```

**React Router Navigation:**
```typescript
import { useNavigate, useParams } from 'react-router-dom'

const navigate = useNavigate()
const { teamId } = useParams<{ teamId: string }>()

// Navigate to members page
navigate(`/teams/${teamId}/members`)
```

**TailwindCSS Styling:**
- Use utility classes: `flex`, `grid`, `gap-4`, `p-4`, `bg-white`, `border`, `rounded-lg`
- Responsive modifiers: `md:grid-cols-2`, `lg:grid-cols-3`
- State modifiers: `hover:bg-gray-100`, `focus:ring-2`, `disabled:opacity-50`
- NO inline styles except dynamic values (e.g., progress bar width)

### Architecture Compliance Checklist

**Team Isolation (CRITICAL):**
- ✅ All API calls include `teamId` parameter
- ✅ Middleware verifies user is member of team before serving data
- ✅ No cross-team data leakage

**Event Logging:**
- ✅ Log `members_page.viewed` on page load
- ✅ Reuse existing events: `team_member.removed`, `invite.created`, `invite.resent`
- ✅ Events are transactional (operation + event both succeed or both fail)

**Error Handling:**
- ✅ Structured error responses: `{ code, message, details, requestId }`
- ✅ Toast notifications for user-facing errors
- ✅ Graceful degradation on API failures

**TypeScript Strict Mode:**
- ✅ No `any` types
- ✅ Explicit function return types
- ✅ Interface definitions for all data structures

**Accessibility (WCAG AA):**
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Screen reader support (aria-labels, roles)
- ✅ Focus management (dialogs, forms)
- ✅ Color contrast ratios (4.5:1 minimum)

### UX & Performance Notes

**Layout Transition:**
- Dashboard previously had practice list (center) + coverage sidebar (right) + members sidebar (right)
- After this story: Dashboard has practice list (center, wider) + coverage sidebar (right)
- Members page has full-width layout for member management

**Loading States:**
- Show skeleton loaders while fetching members/invites
- Use existing patterns from Story 2.1.1

**Real-Time Updates:**
- After invite sent: immediately update pending invites list (no page refresh)
- After member removed: immediately update members list (no page refresh)

**Toast Notifications:**
- Success: "Invite sent to [email]"
- Error: "Failed to send invite: [error message]"
- Info: "[Name] removed from team"

### References

**Epic 1 Implementation (Member Management Foundation):**
- [Story 1.5: Email-Based Team Member Invitations](client/src/features/teams/components/InviteForm.tsx)
- [Story 1.6: Invite Status Management & Membership View](client/src/features/teams/components/MembersSidebar.tsx)

**API Documentation:**
- [Backend API: Members & Invites](_bmad-output/planning-artifacts/architecture.md#team-members-api)
- [Database Schema: team_members, team_invites](docs/04-database.md)

**State Management:**
- [Zustand Store: Members Slice](client/src/features/teams/state/membersSlice.ts)
- [Zustand Store: Invites Slice](client/src/features/teams/state/invitesSlice.ts)

**Previous Story (Design Patterns):**
- [Story 2.1.1: Coverage Visualization](_bmad-output/implementation-artifacts/2-1-1-optimize-coverage-visualization-3-categories-per-row.md)

**Project Context:**
- [Project-wide Rules & Constraints](_bmad-output/project-context.md)
- [Architecture Document](_bmad-output/planning-artifacts/architecture.md)
- [PRD: Team Management Requirements](_bmad-output/planning-artifacts/prd.md)
- [Epic 2.1: Dashboard UX Refinement](_bmad-output/planning-artifacts/epics.md#epic-21)

## Dev Agent Record

### Agent Model Used

- GPT-5.2-Codex

### Debug Log References

- 2026-01-23: Code review fixes applied for event logging, tests, and strict typing.

### Completion Notes List

- Implemented `members_page.viewed` event logging via POST `/api/v1/events`.
- Fixed routing tests to include teamId params.
- Removed invalid Zustand mocks and reset store state in tests.
- Replaced `any` error handling with typed `unknown` handling.
- Updated frontend docs with correct router version and route params.

### File List

- client/src/features/teams/api/membersApi.ts
- client/src/features/teams/pages/TeamMembersView.tsx
- client/src/features/teams/pages/TeamMembersView.test.tsx
- client/src/features/teams/components/InvitePanel.test.tsx
- client/src/features/teams/components/PendingInvitesList.test.tsx
- client/src/features/teams/state/membersSlice.ts
- client/src/features/teams/state/invitesSlice.ts
- docs/06-frontend.md
- _bmad-output/implementation-artifacts/2-1-2-move-members-and-invitations-to-dedicated-members-page.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
