# AAPR Platform Documentation

**As-Built Documentation for the Agile Adaptation Practice Research (AAPR) Platform**

Last Updated: January 19, 2026  
Current State: Epic 1 Complete (Authentication & Team Onboarding)

---

## Purpose

This documentation describes the **actual implemented state** of the AAPR platform. Unlike planning documents (PRD, architecture specs), this documentation reflects what has been built, deployed, and tested.

**Audience:** Developers, researchers, future maintainers, PhD committee members

---

## Documentation Structure

### 📘 Core Documentation

1. **[Project Overview](./01-project-overview.md)**
   - What is AAPR?
   - Research context and goals
   - Current implementation status
   - Technology stack

2. **[Getting Started](./02-getting-started.md)**
   - Developer onboarding guide
   - Environment setup
   - Running the application locally
   - Initial test data seeding

3. **[Architecture](./03-architecture.md)**
   - System architecture (as-built)
   - Key architectural decisions (ADRs)
   - Component interactions
   - Security architecture

4. **[Database](./04-database.md)**
   - Database schema (current state)
   - Entity relationships
   - Migration history
   - Data model decisions

5. **[Backend API](./05-backend-api.md)**
   - All implemented endpoints
   - Authentication flow
   - Request/response formats
   - Error handling patterns

6. **[Frontend](./06-frontend.md)**
   - Application routes
   - Component structure
   - State management
   - UI/UX patterns

7. **[Infrastructure](./07-infrastructure.md)**
   - Docker setup
   - Environment variables
   - Deployment process
   - Local development workflow

8. **[Development Guide](./08-development-guide.md)**
   - Coding standards
   - Testing strategy
   - Code review process
   - Definition of Done

9. **[Changelog](./09-changelog.md)**
   - Epic-by-epic implementation history
   - What was added when
   - Breaking changes
   - Migration notes

---

## Quick Links

- **Planning Artifacts:** `/_bmad-output/planning-artifacts/`
- **Implementation Stories:** `/_bmad-output/implementation-artifacts/`
- **Project Context:** `/_bmad-output/project-context.md`
- **Sprint Status:** `/_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Maintaining This Documentation

**🚨 CRITICAL REQUIREMENT:** Documentation updates are **MANDATORY** for every story implementation.

**Ownership:** All developers are responsible for keeping this documentation up-to-date.

**When to Update:**
- **EVERY STORY:** Documentation updates are part of Definition of Done
- After implementing a new feature
- When fixing a bug that changes behavior
- When refactoring architecture
- When adding/modifying API endpoints
- When changing database schema
- At the end of each Epic (Changelog update)

**How to Update:**
1. Identify affected documentation files during story planning
2. Update content to reflect current state as you implement
3. Update "Last Updated" date at the top of the file
4. Include documentation updates in your PR (required for approval)
5. Reviewer must verify documentation accuracy

**Which Files to Update Per Story Type:**
- **New API endpoint:** [05-backend-api.md](05-backend-api.md), [09-changelog.md](09-changelog.md)
- **Database change:** [04-database.md](04-database.md), [09-changelog.md](09-changelog.md)
- **New UI component:** [06-frontend.md](06-frontend.md), [09-changelog.md](09-changelog.md)
- **Architecture decision:** [03-architecture.md](03-architecture.md)
- **Infrastructure change:** [07-infrastructure.md](07-infrastructure.md)
- **New development practice:** [08-development-guide.md](08-development-guide.md)
- **Story completion:** [09-changelog.md](09-changelog.md) (always update)

**Last Epic Documented:** Epic 1 (Authentication & Team Onboarding)  
**Next Documentation Update:** Epic 2 (Practice Catalog & Coverage)

---

## Definition of Done for All Epics

Documentation in `/docs` must be updated with every story:
- [ ] Changelog updated ([09-changelog.md](09-changelog.md)) - **ALWAYS required**
- [ ] API docs updated ([05-backend-api.md](05-backend-api.md)) - if endpoints added/changed
- [ ] Database docs updated ([04-database.md](04-database.md)) - if schema changed
- [ ] Frontend docs updated ([06-frontend.md](06-frontend.md)) - if components/routes added
- [ ] Architecture docs updated ([03-architecture.md](03-architecture.md)) - if ADR added/modified
- [ ] "Last Updated" dates refreshed in all modified docs
- [ ] Reviewer verified documentation accuracy

**Documentation is not optional—it's part of the deliverable.**

---

## Research Integrity Note

This platform is part of a PhD research project. Documentation serves multiple purposes:
- **Reproducibility:** Other researchers must be able to understand and replicate the system
- **Audit Trail:** Committee members need to verify implementation matches research design
- **Knowledge Transfer:** Future maintainers (post-research) need comprehensive handover
- **Academic Rigor:** Documentation quality reflects research quality

All documentation should be clear, accurate, and verifiable against the actual codebase.
