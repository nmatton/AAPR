# Story 2.1.14: Extended Practice Editor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team member,
I want to edit the full details of a practice including activities, roles, completion criteria, metrics, resources, and associated practices,
so that our practice definition completely aligns with the reference guide schema.

## Acceptance Criteria

1. Given I am creating or editing a practice, when the form opens, then I see inputs for Activities (ordered list), Roles (RACI), Completion Criteria, Metrics (name, unit, formula), Resources (guidelines, pitfalls, benefits), and Associated Practices.

2. Given I fill in the extended inputs, when I save the practice, then all structured data is preserved in the existing practice storage model without losing previously supported fields.

3. Given I link associated practices, when saved, then the relationships are stored with their association types and can be read back into the editor reliably.

4. Given I duplicate an existing practice as a template, when the editor pre-fills the form, then extended fields are also loaded and duplicated, not only the basic catalog fields.

5. Given I edit a global practice and choose Save as Team-Specific Copy, when the copy is created, then the submitted extended fields are applied to the new team-specific practice instead of reverting to the original source values.

6. Given another user updated the practice first, when I submit stale data, then the existing optimistic-locking behavior still protects the update path and the user can refresh before retrying.

7. Given I submit invalid structured data, when validation runs, then the API returns structured validation errors consistent with the existing error shape and the client surfaces them without crashing.

8. Given associations are edited, when persistence completes, then the canonical source of truth is the relational `practice_associations` table introduced in Epic 2.1, not the deprecated JSON-only workflow.

## Tasks / Subtasks

- [ ] Extend shared practice DTOs and payload contracts for the full editor schema
  - [ ] Add typed client payload support for `activities`, `roles`, `workProducts`, `completionCriteria`, `metrics`, `guidelines`, `benefits`, `pitfalls`, and `associatedPractices` in `client/src/features/teams/api/teamPracticesApi.ts`
  - [ ] Extend `client/src/features/teams/types/practice.types.ts` so editor entry points can hold the structured fields returned by detail endpoints
  - [ ] Keep request/response naming camelCase in API/TypeScript while respecting Prisma `@map` mappings to snake_case columns

- [ ] Upgrade practice creation to the full schema
  - [ ] Expand `CreatePracticeModal.tsx` from the current basic form into a sectioned extended editor
  - [ ] Support ordered Activities rows with sequence, name, and description
  - [ ] Support Roles rows with RACI enum values: `Responsible`, `Accountable`, `Consulted`, `Informed`
  - [ ] Support Work Products rows with name and description
  - [ ] Support Completion Criteria, Metrics rows, and Resources input groups
  - [ ] Support Associated Practices selection with association type per linked practice
  - [ ] When duplicating from template, fetch full practice detail before pre-filling so extended fields are copied too

- [ ] Upgrade practice editing to the same full schema
  - [ ] Expand `PracticeEditForm.tsx` to expose the same structured sections as create flow
  - [ ] Ensure edit entry points have full practice data available before opening the form; do not rely on shallow list payloads only
  - [ ] Preserve unsaved-change guard, conflict banner, and global-practice warning behavior
  - [ ] Keep save-as-copy behavior for global practices while applying the edited structured values to the new copy

- [ ] Extend backend validation and service contracts
  - [ ] Add Zod validation for the structured fields in `server/src/controllers/teams.controller.ts` for both create and edit payloads
  - [ ] Reuse or align with `server/src/schemas/practice.schema.ts` shapes where practical instead of creating divergent ad hoc validation rules
  - [ ] Extend `CreateCustomPracticePayload` and `EditPracticePayload` in `server/src/services/teams.service.ts`

- [ ] Persist extended fields correctly in the database model
  - [ ] Store structured practice fields on `Practice` using the existing JSON/Text columns already present in Prisma (`activities`, `roles`, `workProducts`, `completionCriteria`, `metrics`, `guidelines`, `benefits`, `pitfalls`)
  - [ ] Update create and edit service paths so structured fields are written during normal save and save-as-copy flows
  - [ ] Do not regress existing fields such as `title`, `goal`, `categoryId`, `method`, `tags`, and `pillarIds`

- [ ] Make associated-practice persistence architecture-compliant
  - [ ] Persist associations canonically through `PracticeAssociation` rows instead of treating `Practice.associatedPractices` JSON as the authoritative store
  - [ ] Implement create/update sync logic for association additions, removals, and type changes in a transaction
  - [ ] Exclude self-links and prevent duplicate `(sourcePracticeId, targetPracticeId, associationType)` rows
  - [ ] Decide and document whether the deprecated JSON field remains temporarily mirrored for compatibility or whether detail/read models are fully switched to relational mapping now

- [ ] Return editor-friendly detail data after persistence
  - [ ] Ensure detail hydration for create/edit can read back extended fields and associations consistently
  - [ ] If the editor depends on `fetchPracticeDetail`, update the service/repository mapping so returned associations reflect the relational model

- [ ] Add targeted automated coverage
  - [ ] Client tests for the extended create flow, template prefill, structured validation, and payload normalization
  - [ ] Client tests for the extended edit flow, save-as-copy, stale-version conflict handling, and editor hydration
  - [ ] Server controller/service tests for create/edit validation, structured persistence, and association synchronization
  - [ ] Regression tests proving legacy fields still save correctly and no existing practice-management flows break

## Dev Notes

### Story Foundation

- Epic 2.1 is refining the team dashboard and practice-management UX around a normalized practice model.
- This story extends Story 2.1.4 rather than replacing it. The create flow already supports description, method, tags, benefits, pitfalls, and work products, but it stops short of the full reference-guide schema.
- Story 2.1.15 will improve the detail view, so this story should focus on authoring/editing and persistence first.

### Current Implementation Reality

- The server-side schema already supports most of the extended practice structure:
  - `server/src/schemas/practice.schema.ts` defines `activities`, `roles`, `work_products`, `completion_criteria`, `metrics`, `resources.guidelines`, and `associated_practices`.
  - `server/prisma/schema.prisma` already has columns for `activities`, `roles`, `workProducts`, `completionCriteria`, `metrics`, `guidelines`, `benefits`, `pitfalls`, and the deprecated JSON field `associatedPractices`.
- The create/edit API contracts currently expose only a subset:
  - Create accepts `description`, `method`, `tags`, `benefits`, `pitfalls`, `workProducts`, but not the rest of the structured schema.
  - Edit currently accepts only `title`, `goal`, `pillarIds`, `categoryId`, `method`, `tags`, `saveAsCopy`, and `version`.
- `CreatePracticeModal.tsx` and `PracticeEditForm.tsx` currently operate on shallow list data and basic fields, so the main gap is UI + payload + service wiring, not schema invention.

### Critical Developer Guardrails

- Do not invent a second schema for the same practice fields. Reuse the existing server-side shapes and naming patterns.
- Do not keep associated practices JSON-only. Architecture and Prisma already introduced `PracticeAssociation` as the normalized model.
- Do not depend on list endpoints for editor hydration when extended data is required. Current `Practice` list types are intentionally shallow.
- Do not lose extended values in the `saveAsCopy` path. The current copy path clones old structured values from `existingPractice`; this story must apply the user-submitted structured edits.
- Do not break optimistic locking. `version` remains required for edit updates.
- Do not break existing coverage recalculation, event logging, or practice-team linking behavior.

### Technical Requirements

- Structured editor fields required by this story:
  - Activities: ordered collection with `sequence`, `name`, `description`
  - Roles: collection with `role`, `responsibility`
  - Work Products: collection with `name`, `description`
  - Completion Criteria: free text
  - Metrics: collection with `name`, optional `unit`, optional `formula`
  - Resources: guidelines collection plus pitfalls/benefits lists
  - Associated Practices: target practice plus `associationType`
- Preserve trimming/normalization for optional text fields and array entries.
- Keep the existing API error contract: `{ code, message, details?, requestId }`.
- Maintain transactional behavior when saving practice core fields, pillar mappings, team links, events, and associations.

### Architecture Compliance

- Frontend remains feature-first:
  - `client/src/features/teams/components/` for modal/editor UI
  - `client/src/features/teams/api/` for request contracts
  - `client/src/features/teams/state/` for Zustand orchestration
- Backend remains layered:
  - routes -> controllers -> services -> repositories
  - validation in controller ingress, business rules in services, DB-only logic in repositories
- Use camelCase on the wire and in TypeScript, relying on Prisma `@map` for snake_case DB fields.
- Respect the normalized database direction from Epic 2.1.10 and 2.1.11. Story 2.1.12 is marked invalid in sprint tracking, so do not plan around removing normalized support.

### Library / Framework Requirements

- Frontend repo versions currently in use:
  - React `18.2.0`
  - TypeScript `^5.2.0`
  - Vite `^5.0.0`
  - Vitest `^0.34.6`
  - Zod `^4.3.6`
  - Zustand `^5.0.10`
- Backend repo versions currently in use:
  - Express `^4.22.1`
  - Prisma and `@prisma/client` `^7.2.0`
  - Jest `^30.2.0`
  - Zod `^4.3.5`
- External web verification was not available during story generation. Use the repo-pinned versions above as the implementation baseline.

### File Structure Requirements

- Expected frontend touch points:
  - `client/src/features/teams/components/CreatePracticeModal.tsx`
  - `client/src/features/teams/components/PracticeEditForm.tsx`
  - `client/src/features/teams/api/teamPracticesApi.ts`
  - `client/src/features/teams/state/managePracticesSlice.ts`
  - `client/src/features/teams/types/practice.types.ts`
  - Supporting tests beside the modified components and API modules
- Expected backend touch points:
  - `server/src/controllers/teams.controller.ts`
  - `server/src/services/teams.service.ts`
  - `server/src/repositories/practice.repository.ts`
  - Potentially `server/src/services/practices.service.ts` if detail mapping must expose relational associations back to the editor
  - Related Jest tests in controllers/services/repositories

### Testing Requirements

- Create-flow tests must cover:
  - empty-state validation for required structured fields where applicable
  - normalization of list/text inputs into payload objects/arrays
  - template duplication pre-filling extended data after full-detail fetch
  - association input behavior and payload shape
- Edit-flow tests must cover:
  - opening with prefilled structured values
  - stale version conflict path
  - global-practice warning + save-as-copy with extended changes preserved
  - success path updating local state or reloading list as appropriate
- Backend tests must cover:
  - controller validation for malformed nested objects
  - service persistence of extended JSON/text fields
  - association sync logic for add/update/remove
  - duplicate/self association rejection
  - event logging and coverage recalculation remaining intact

### Previous Story Intelligence

- Story 2.1.13 reinforced a pattern used repeatedly in this repo:
  - favor dedicated endpoints or loading paths when list data is too shallow for a UI requirement
  - keep store state explicit rather than deriving critical UI options from partial in-memory subsets
  - add targeted tests for the exact user flow that previously regressed
- Apply that lesson here:
  - template duplication should load full detail instead of assuming list items contain the full practice schema
  - edit entry points should hydrate the editor with the right detail model, not the summary card model

### Git Intelligence Summary

- Recent commits show active work in practice-management UX and planning artifacts, including consolidation of practice management views.
- That increases the risk of accidental regressions in shared practice flows. Keep the implementation focused and reuse the current `ManagePracticesView`, `PracticeCatalog`, and detail-sidebar patterns instead of introducing a parallel editor flow.

### Latest Technical Information

- `server/src/services/practices.service.ts` already returns full practice detail including `activities`, `roles`, `workProducts`, `completionCriteria`, `metrics`, `guidelines`, `benefits`, `pitfalls`, and `associatedPractices`.
- `PracticeDetailSidebar.tsx` currently renders only part of that detail set. That is acceptable for this story; do not turn this into the detail-view redesign planned in Story 2.1.15.
- The main implementation risk is mismatched contracts between:
  - shallow list DTOs
  - full detail DTOs
  - create/edit payloads
  - normalized association persistence

### Project Structure Notes

- Current docs still describe `PracticeEditForm` as a basic editor and `CreatePracticeModal` as the current full-editor surface for the limited field set. This story should extend those established entry points, not replace them.
- Database documentation still lists `associated_practices` JSONB on `practices`. Treat that as a transitional compatibility artifact, because Prisma and recommendation logic already use `practice_associations` relationally.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.1.14 definition and Epic 2.1 context
- `_bmad-output/implementation-artifacts/2-1-13-practice-selection-advanced-filters.md` - recent implementation patterns and testing discipline
- `_bmad-output/project-context.md` - stack constraints and implementation rules
- `docs/PRACTICES_REFERENCE_GUIDE.md` - authoritative practice schema fields
- `docs/04-database.md` - persisted practice columns
- `docs/06-frontend.md` - current documented create/edit flows
- `server/src/schemas/practice.schema.ts` - existing structured validation shapes
- `server/prisma/schema.prisma` - canonical Prisma model including `PracticeAssociation`
- `server/src/controllers/teams.controller.ts` - current create/edit ingress validation
- `server/src/services/teams.service.ts` - current create/edit/save-as-copy behavior
- `server/src/services/practices.service.ts` - current full detail mapping
- `client/src/features/teams/components/CreatePracticeModal.tsx` - current create/template UI
- `client/src/features/teams/components/PracticeEditForm.tsx` - current edit UI
- `client/src/features/teams/api/teamPracticesApi.ts` - current client payload contracts
- `client/src/features/teams/state/managePracticesSlice.ts` - current store orchestration

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Recent git history inspected during story generation:
  - `8273c52 feat: Implement cancel invite functionality for team members`
  - `9947ca2 planning fixes`
  - `4f0f354 adding user guide v0311a`
  - `54b0591 feat: Consolidate practice management views into a unified ManagePracticesView and add its associated tech spec`
  - `7761cdd fix: create issue`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Canonical risk identified: the server schema is ahead of the create/edit contracts, so this story is mainly an integration and persistence-alignment task.
- Canonical regression risk identified: template duplication and save-as-copy currently work with shallow/basic data and would silently drop extended edits if left unchanged.
- Canonical architecture risk identified: associated practices must be reconciled with the normalized `practice_associations` table instead of extending the deprecated JSON-only pattern.

### File List

- client/src/features/teams/components/CreatePracticeModal.tsx
- client/src/features/teams/components/CreatePracticeModal.test.tsx
- client/src/features/teams/components/PracticeEditForm.tsx
- client/src/features/teams/components/PracticeEditForm.test.tsx
- client/src/features/teams/api/teamPracticesApi.ts
- client/src/features/teams/api/teamPracticesApi.test.ts
- client/src/features/teams/state/managePracticesSlice.ts
- client/src/features/teams/types/practice.types.ts
- server/src/controllers/teams.controller.ts
- server/src/controllers/teams.controller.test.ts
- server/src/services/teams.service.ts
- server/src/services/teams.service.test.ts
- server/src/services/practices.service.ts
- server/src/repositories/practice.repository.ts
- server/prisma/schema.prisma