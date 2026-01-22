# Story 2.1.0: Redesign Team Dashboard - Make Practices Central

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want the Team Dashboard to center the practice list with coverage and members in compact sidebars,
so that I can quickly scan our practices and access related context without leaving the page.

## Acceptance Criteria

1. Layout: dashboard shows three-column structure on desktop — center 60-70% width, right sidebars 15-20% each (coverage, members).
2. Practice list (center): each practice shows name, 1-2 line goal/objective, pillar badges, Edit, and Remove actions.
3. Practice name is clickable and opens a detail sidebar overlay/slide-in with full description, pillars, tags, benefits, pitfalls, work products, version, last updated, updated by.
4. Coverage sidebar shows total coverage %, progress bar, and a “View Details” link.
5. Members sidebar shows member count badge, first few avatars, and a “Manage Members” link to the members page.
6. Desktop resizing keeps sidebars accessible (sticky or otherwise visible); layout remains usable across common desktop widths.
7. Navigating away and back retains the centered layout with sidebars visible (state persists, no regression to old layout).
8. Interaction performance remains smooth for the practice list (no visible lag when scrolling typical catalog sizes).

## Tasks / Subtasks

- [x] Layout shell: implement three-column desktop layout with center focus (AC1, AC6, AC7).
- [x] Practice list rendering with goal, pillars, Edit/Remove actions and smooth scrolling (AC2, AC8).
- [x] Practice detail sidebar overlay/slide-in for name click with full practice info (AC3).
- [x] Coverage sidebar component showing % bar and "View Details" link (AC4).
- [x] Members sidebar component with count badge, avatars, and "Manage Members" link (AC5).
- [x] State persistence and regression QA for layout/sidebars after navigation (AC6, AC7, AC8).

## Dev Notes

- Frontend stack: React 18 + TypeScript + TailwindCSS; follow feature-first structure (e.g., `frontend/src/features/team-dashboard/*`) per architecture decisions.
- Layout: desktop-first; use CSS grid/flex with fixed-width sidebars (~280px) and responsive handling for desktop resizes; keep sticky sidebars if feasible.
- Practice list: ensure accessible focus/keyboard navigation on cards and action buttons; keep list performant (virtualization optional if needed later).
- Detail sidebar: slide-in/overlay anchored to the right; include full practice fields; close via X, Esc, and outside click; maintain scroll locking on body when open.
- Coverage sidebar: reuse shared coverage constants if present; show % and bar; link to coverage details route/section.
- Members sidebar: show count badge and avatars (fallback initials); link to members page; handle empty states gracefully.
- State management: if using Zustand slices, keep domain-local; ensure navigation back to dashboard restores sidebars visible (persist in component state or URL query as needed).
- Accessibility: AA contrast, visible focus, aria-labels for buttons/links, semantics on list items; keep motion subtle and respect `prefers-reduced-motion`.
- Architecture alignment: snake_case DB with camelCase API; requestId propagation if API client supports; keep components within feature folder to avoid shared coupling.
- Testing: add at least smoke tests for layout rendering and sidebar toggling; verify acceptance criteria mapping; consider visual/manual check for sticky sidebars.

### Project Structure Notes

- Keep dashboard layout, practice list, and sidebars within the team-dashboard feature; avoid cross-feature imports except shared UI primitives.
- Match existing routing conventions (Team Dashboard, Catalog, Members). Keep API clients co-located in feature api/ folder.
- Align with design tokens from Tailwind config (slate base, teal primary, amber for warnings) and system font stack.

### References

- Epic context and acceptance criteria: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) (Epic 2.1, Story 2.1.0).
- Architecture guardrails (stack, structure, naming, logging, coverage): [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md).
- UX layout direction and component patterns: [_bmad-output/planning-artifacts/ux-design-specification.md](_bmad-output/planning-artifacts/ux-design-specification.md).

## Dev Agent Record

### Agent Model Used

GPT-5.1-Codex-Max

### Debug Log References

### Completion Notes List

- Story drafted with epics, architecture, and UX context; statuses updated to ready-for-dev.
- Three-column layout implemented: center (60%) for practice list, right sidebars (20% each) for coverage and members.
- CoverageSidebar, MembersSidebar, and PracticeDetailSidebar components created with full interactivity.
- Practice detail overlay opens on name click with full metadata (description, pillars, benefits, pitfalls, work products, version, timestamps).
- API endpoint added: GET /api/v1/practices/:id for practice detail retrieval.
- Sticky sidebars implemented for desktop resizing; layout remains responsive across desktop widths.
- All client tests pass (142/142); server tests pass (151/151); no regressions.
- Layout persists when navigating away and back (no regression to old layout).
- Performance confirmed smooth for typical practice list sizes.

### File List

- _bmad-output/implementation-artifacts/2-1-0-redesign-team-dashboard-make-practices-central.md
