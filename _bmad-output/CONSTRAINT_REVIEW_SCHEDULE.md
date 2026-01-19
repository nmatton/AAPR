# Constraint Review Schedule

Generated: 2026-01-19

## React 18.2.x Lock (MVP Requirement)
- Constraint: Stay on React 18.2.x during MVP
- Rationale: Stability and risk reduction for MVP delivery
- Review Date: 2026-03-31 (Post-MVP checkpoint)
- Next Actions:
  - Evaluate React 19 migration guide and breaking changes
  - Run smoke tests on React 19 in a feature branch
  - Decide go/no-go and plan migration if approved

## Quarterly Dependency Audit Cadence
- Frequency: Quarterly (end of each quarter)
- Next Audits:
  - 2026-03-31
  - 2026-06-30
  - 2026-09-30
  - 2026-12-31

## Additional Constraints to Monitor
- TypeScript: Keep strict mode enabled; review minor updates monthly
- Vite: Plan major upgrade to 7.x next sprint for esbuild fix
- TailwindCSS: Research 4.x impacts; defer until after Vite upgrade
- Prisma: Ensure adapter-pg matches @prisma/client exactly; review changelogs monthly

## Process for Reviews
1. Run `npm audit` and `npm outdated` in both client and server
2. Verify documentation currency via Context7 MCP (mode='code')
3. Validate version constraints and peer dependencies
4. Update VERSION_MANIFEST.md and record changes
5. Create/update UPDATE_PLAN.md with priorities and timelines

## Owners
- Tech Lead: Dependency policy and approvals
- Dev Agent: Execution of audits and documentation updates
- QA: Test validation on upgrades
