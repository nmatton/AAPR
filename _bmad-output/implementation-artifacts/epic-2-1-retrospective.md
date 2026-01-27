# Retrospective: Epic 2.1 - Team Dashboard & UX Refinement

**Date:** 2026-01-27
**Participants:** nicolas (Project Lead), Bob (SM), Alice (PO), Charlie (Dev), Dana (QA), Sally (UX)
**Epic Status:** Completed (12/13 Stories)

## 1. Epic Review (Summary)

*Note: Detailed review discussion was skipped by user request to focus on next epic preparation.*

### Highlights
- **Success:** Epic 2.1 delivered major UX improvements (Dashboard, Catalog, Inline Editing) and standardized the Database (Practice Associations).
- **Quality Logic:** Story `2.1.12` (Remove category_id) was correctly identified as **INVALID** by the team because it violated the normalized architecture. This prevented a significant regression.
- **Correction:** Story `2.1.11` was successfully executed to fix migration logging gaps identified in 2.1.10.

### Metrics
- **Total Stories:** 13
- **Completed:** 12
- **Invalid/Skipped:** 1 (Story 2.1.12)
- **Completion Rate:** 92% (Excluding invalid story: 100%)

## 2. Preparation for Epic 3: Big Five Personality Profiling

The team focused on assessing readiness for the next major feature: Integration of the Big Five Inventory (BFI).

### Key Decisions
| Area | Decision | Rationale |
|------|----------|-----------|
| **Data Storage** | **Final Scores Only** | User privacy is paramount. Raw answers (item-level data) will NOT be stored. Only the calculated trait scores (0-100%) will be persisted. |
| **UX Design** | **Single Long Scroll** | Preferred for speed and simplicity over a multi-step wizard. Users can scroll through all 44/45 items quickly. |
| **Scoring Logic** | **Provided via Docs** | Validity ensured. `docs/BFI-EN.md` and `docs/BFI-FR.md` provided by Project Lead. |

### Action Items & Risks
- **[Dev] Handle Dynamic Item Counts:** The French version (BFI-FR) has **45 items**, while English (BFI-EN) has **44 items**. The Questionnaire component must be dynamic, not hardcoded to 44.
- **[Dev] Scoring Algorithm:** Implement precise reverse-coding logic based on the provided markdown files.
- **[UX] Scroll Experience:** Ensure the "Single Long Scroll" doesn't feel overwhelming. Use clear grouping or visual markers every 10 items without breaking the page.

## 3. Next Steps
- Move to **Sprint Planning** for Epic 3.
- Create Story 3.1 (Questionnaire Implementation) incorporating the "Scores Only" and "Single Scroll" constraints.
