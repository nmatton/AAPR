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

## Document Maintenance

**Definition of Done for All Epics:**
- Documentation in `/docs` must be updated to reflect new features
- All new API endpoints documented in `05-backend-api.md`
- All new database changes documented in `04-database.md`
- Changelog updated in `09-changelog.md`

**Last Epic Documented:** Epic 1 (Authentication & Team Onboarding)  
**Next Documentation Update:** Epic 2 (Practice Catalog & Coverage)

---

## Contributing to Documentation

When implementing new features:
1. Update relevant sections in existing docs
2. Add new sections if introducing new subsystems
3. Keep examples up-to-date with actual code
4. Document architectural decisions (add to ADRs in `03-architecture.md`)
5. Update changelog with summary of changes

**Documentation is part of the deliverable, not an afterthought.**

---

## Research Integrity Note

This platform is part of a PhD research project. Documentation serves multiple purposes:
- **Reproducibility:** Other researchers must be able to understand and replicate the system
- **Audit Trail:** Committee members need to verify implementation matches research design
- **Knowledge Transfer:** Future maintainers (post-research) need comprehensive handover
- **Academic Rigor:** Documentation quality reflects research quality

All documentation should be clear, accurate, and verifiable against the actual codebase.
