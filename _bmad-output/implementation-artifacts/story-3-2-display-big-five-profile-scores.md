# Story 3.2: Display Big Five Profile Scores

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want to **see my Big Five profile with scores for Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism**,
so that **I understand my personality dimensions and how they might influence my work**.

## Acceptance Criteria

1. **Given** I've completed the questionnaire
   **When** I view my Big Five Profile page
   **Then** I see a "Radar Chart" visualization showing my 5 dimensions
   **And** I see a breakdown list with the score (0-100) for each dimension

2. **Given** my score for a trait (e.g., Extraversion is 35/100)
   **When** I view the profile
   **Then** I see the qualitative label: "Introversion" (or "Low Extraversion")
   **And** the UI color-codes the score (e.g., Low/High distinct from neutral)

3. **Given** I view my profile
   **When** I hover over a score or trait name
   **Then** I see a brief explanation (e.g., "High Conscientiousness: You're organized, reliable, and deliberate")

4. **Given** I've completed the questionnaire
   **When** I view the profile
   **Then** I see the completion date (e.g., "Completed on: Jan 15, 2026")
   **And** an option to [Retake] the questionnaire

5. **Given** responses are saved (from Story 3.1)
   **When** the profile loads
   **Then** the scores match the IPIP-NEO algorithm results EXACTLY (verified against backend calculation)

6. **Given** I haven't completed the questionnaire
   **When** I try to access the Profile page
   **Then** I am redirected to the Questionnaire start page (or see a "Start Questionnaire" empty state)

## Tasks / Subtasks

- [ ] 1. Dependencies & Setup (AC: 1)
  - [ ] Install `recharts` for the Radar chart visualization (Standard, lightweight, customizable)
    - `npm install recharts`
  - [ ] Create `BigFiveProfile` feature folder structure if missing (`client/src/features/big-five/components/Profile/...`)

- [ ] 2. Interpretation Logic (AC: 2, 3)
  - [ ] Implement `BigFiveInterpreter` utility/hook
    - [ ] Map scores (0-100) to labels (Low/Neutral/High)
    - [ ] Store trait descriptions and hover text (See Dev Notes for copy)
    - [ ] Define color palette for the 5 traits (align with UX "Teal Focus" but distinct)

- [ ] 3. UI Implementation (AC: 1, 4)
  - [ ] Create `ProfileRadarChart` component using Recharts
    - [ ] Configure axes (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
    - [ ] Style the polygon and grid
  - [ ] Create `TraitScoreCard` component (List view)
    - [ ] Progress bar or circular indicator
    - [ ] Label and Description
  - [ ] Combine into `BigFiveProfilePage`
    - [ ] Header with date and Retake button
    - [ ] Responsive layout (Chart + Cards)

- [ ] 4. Data Integration (AC: 5, 6)
  - [ ] Create `useBigFiveProfile` hook using `bigFiveApi`
  - [ ] Handle loading states (Skeletons)
  - [ ] Handle "No Data" state (Redirect to Questionnaire)

## Dev Notes

### Interpretation Logic (Source: Research & Standard BFI)

Use these ranges and labels for the UI:

| Trait | Low Score (< 45) | High Score (> 55) | Neutral (45-55) |
| :--- | :--- | :--- | :--- |
| **Openness** | **Practical / Conventional**<br>Prefers routine, tradition, and familiar tasks. | **Imaginative / Curious**<br>Enjoys novelty, abstract thinking, and variety. | Balanced |
| **Conscientiousness** | **Spontaneous / Flexible**<br>Dislikes structure, prefers multitasking or improvising. | **Organized / Dependable**<br>Disciplined, goal-oriented, and detail-focused. | Balanced |
| **Extraversion** | **Reserved / Solitary**<br>Enjoys solitude, contemplative, lower energy in groups. | **Outgoing / Energetic**<br>Social, talkative, assertive, seeking stimulation. | Balanced |
| **Agreeableness** | **Critical / Competitive**<br>Skeptical, challenges ideas, focuses on self-interest. | **Compassionate / Cooperative**<br>Trusting, helpful, values harmony and empathy. | Balanced |
| **Neuroticism** | **Calm / Resilient**<br>Emotionally stable, handles stress well, confident. | **Sensitive / Anxious**<br>Prone to stress, worry, and emotional reactivity. | Balanced |

*Note: Neuroticism is sometimes labeled "Emotional Stability" (reversed). Stick to "Neuroticism" for scientific accuracy but explain "Low Neuroticism" as positive (Calm).*

### Recharts Implementation Guide

Use `RadarChart` from Recharts.
```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { subject: 'Openness', A: 85, fullMark: 100 },
  { subject: 'Conscientiousness', A: 65, fullMark: 100 },
  // ...
];

<ResponsiveContainer width="100%" height={300}>
  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
    <PolarGrid />
    <PolarAngleAxis dataKey="subject" />
    <PolarRadiusAxis angle={30} domain={[0, 100]} />
    <Radar name="My Profile" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
  </RadarChart>
</ResponsiveContainer>
```

### Architecture Constraints

- **Single source of truth:** Scores come from `BigFiveScore` table (calculated in Story 3.1). **Do NOT recalculate in frontend.**
- **Color System:** Ensure the chart colors match the application theme (Tailwind config).
- **Responsiveness:** The Radar chart can be tricky on mobile. Ensure `ResponsiveContainer` is used.

### File Structure

- `client/src/features/big-five/pages/BigFiveProfilePage.tsx`
- `client/src/features/big-five/components/ProfileRadarChart.tsx`
- `client/src/features/big-five/components/TraitScoreList.tsx`
- `client/src/features/big-five/utils/traitInterpretation.ts` (Logic)

### Completeness Check

- Has `BigFiveService` (Backend) already exposed GET `/api/v1/big-five/me`? **Yes (Story 3.1 AC).**
- Does the response include scores? **Yes.**
- Do we need new backend work? **No.** (Pure frontend story).

## Dev Agent Record

### Agent Model Used
Antigravity

### Debug Log References
- Confirmed Story 3.1 completed score calculation and API.
- Validated `recharts` availability as standard React library.
- Sourced interpretation labels from standard BFI psychology resources.

### Completion Notes List
- Verified implementation against all ACs.
- Fixed type safety issues and code duplication found during review.
- Added comprehensive unit tests for all components and hooks.

### File List
- `client/src/features/big-five/pages/BigFivePage.tsx`
- `client/src/features/big-five/components/ProfileRadarChart.tsx`
- `client/src/features/big-five/components/ProfileRadarChart.test.tsx`
- `client/src/features/big-five/components/TraitScoreCard.tsx`
- `client/src/features/big-five/components/TraitScoreCard.test.tsx`
- `client/src/features/big-five/hooks/useBigFiveProfile.ts`
- `client/src/features/big-five/hooks/useBigFiveProfile.test.ts`
- `client/src/features/big-five/components/ProfileView.tsx`
- `client/src/features/big-five/components/ProfileView.test.tsx`
- `client/src/features/big-five/utils/traitInterpretation.ts`
- `client/src/features/big-five/utils/traitInterpretation.test.ts`
