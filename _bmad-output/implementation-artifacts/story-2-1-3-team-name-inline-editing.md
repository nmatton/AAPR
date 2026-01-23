# Story 2.1.3: Team Name Inline Editing with Pencil Icon

**Epic:** 2.1 - Team Dashboard & Catalog UX Refinement + Database Normalization  
**Status:** READY FOR DEVELOPMENT  
**Sequence:** 3rd story (after 2-1-1: Redesign, 2-1-2: Members Page)  
**Date Created:** January 23, 2026

---

## Story

**As a** team member,  
**I want to** edit my team's name by clicking a pencil icon next to the name,  
**So that** I can update the team name without navigating to settings.

---

## Acceptance Criteria (from epics.md)

### AC1: Pencil Icon Visibility
**Given** I'm on the Team Dashboard  
**When** I see the team name at the top (e.g., "Platform Team")  
**Then** there's a small pencil icon (✏️) next to the name

### AC2: Click to Edit
**Given** I click the pencil icon  
**When** the name becomes editable  
**Then** the text field is focused and shows the current name

### AC3: Character Count Feedback
**Given** the name field is active  
**When** I type a new name  
**Then** the text is captured and character count is shown (e.g., "15/50")

### AC4: Action Buttons
**Given** I've typed a new name  
**When** I see the action buttons  
**Then** a green checkmark (✓) button appears to save and a red X button appears to cancel

### AC5: Save Operation
**Given** I click the ✓ button  
**When** the save is triggered  
**Then** the team name is updated and I see a brief success message: "Team name updated" and the name is no longer in edit mode

### AC6: Cancel Operation
**Given** I click the X button  
**When** the cancel is triggered  
**Then** the edit mode closes and the team name reverts to the original value

### AC7: Event Logging
**Given** I've saved a new team name  
**When** the update completes  
**Then** an event is logged: `{ action: "team.name_updated", teamId, oldName, newName, timestamp }`

### AC8: Concurrency Conflict Handling
**Given** I'm editing the team name  
**When** another member updates it simultaneously  
**Then** the conflict is handled: I see "Team name was updated by another member" and the field is reset

---

## Critical Intelligence Summary

### 1. DATABASE SCHEMA REQUIREMENTS

#### Current State (from schema.prisma)
```prisma
model Team {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  // ... relationships
  @@map("teams")
}
```

#### Missing for Optimistic Locking ❌ **ACTION REQUIRED**
The `Team` model is **missing a version column** needed for concurrent edit detection (AC8).

**Migration Required:**
```sql
ALTER TABLE teams ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
```

**Prisma Schema Update Needed:**
```prisma
model Team {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(100)
  version   Int      @default(1)  // NEW - for optimistic locking
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // ... relationships
  @@map("teams")
}
```

#### Team Name Validation Rules (from teams.controller.ts)
```typescript
// Existing validation schema in project:
const updateTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be less than 50 characters')  // CHANGE: was 100
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Can only contain letters, numbers, spaces, hyphens'),
  version: z.number().int().positive()  // NEW - for concurrency
});
```

**Character Limit:** Update to 50 characters max for inline editing (better UX in header)

#### Event Schema (from events table)
```prisma
model Event {
  id            BigInt   @id @default(autoincrement())
  eventType     String   @map("event_type") @db.VarChar(50)
  actorId       Int?     @map("actor_id")
  teamId        Int      @map("team_id")
  entityType    String?  @map("entity_type")
  entityId      Int?     @map("entity_id")
  action        String?  @db.VarChar(50)
  payload       Json?
  schemaVersion String   @default("v1") @map("schema_version")
  createdAt     DateTime @default(now()) @map("created_at")
  @@map("events")
}
```

**Event to Log:**
```json
{
  "eventType": "team.name_updated",
  "action": "team.name_updated",
  "teamId": 1,
  "entityType": "team",
  "entityId": 1,
  "payload": {
    "oldName": "Old Team Name",
    "newName": "New Team Name",
    "actorId": 123,
    "timestamp": "2026-01-23T10:30:00Z"
  },
  "schemaVersion": "v1"
}
```

---

### 2. FRONTEND COMPONENT STRUCTURE

#### Current Team Dashboard Location
**File:** [client/src/features/teams/components/TeamDashboard.tsx](client/src/features/teams/components/TeamDashboard.tsx)

**Current Header:**
```tsx
<div className="mb-4">
  <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
</div>
```

**This is where the inline edit component will be integrated.**

#### New Component: TeamNameInlineEdit

**Location:** `client/src/features/teams/components/TeamNameInlineEdit.tsx`

**Component Responsibility:**
- Display team name with pencil icon
- Toggle edit mode on pencil click
- Show character count during editing
- Provide checkmark (✓) and X button
- Handle save/cancel operations
- Show success/error toast notifications

**Implementation Signature:**
```typescript
interface TeamNameInlineEditProps {
  teamId: number;
  initialName: string;
  maxLength?: number;  // Default: 50
  onNameUpdated: (newName: string) => void;
  onError?: (error: string) => void;
}

export const TeamNameInlineEdit = ({
  teamId,
  initialName,
  maxLength = 50,
  onNameUpdated,
  onError
}: TeamNameInlineEditProps) => {
  // Implementation
}
```

#### Hooks Integration with Zustand

**Existing Store:** [client/src/features/teams/state/teamsSlice.ts](client/src/features/teams/state/teamsSlice.ts)

**Current State Structure:**
```typescript
export interface TeamsState {
  teams: Team[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, practiceIds: number[]) => Promise<Team>;
  reset: () => void;
}
```

**Required Addition to Zustand Store:**
```typescript
// In teamsSlice.ts - ADD these methods:
updateTeamName: (teamId: number, newName: string, version: number) => Promise<void>;
```

**Hook Pattern Used in Project:**
```typescript
// Example from existing code
const { teams, isLoading, fetchTeams, error } = useTeamsStore();
```

#### Zustand Implementation Pattern

From [project-context.md](#3.-framework-specific-rules-(react-&-express)):

```typescript
// ✅ CORRECT pattern for Zustand stores
export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  isLoading: false,
  error: null,
  
  updateTeamName: async (teamId: number, newName: string, version: number) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTeam = await updateTeamNameApi(teamId, newName, version);
      
      // Update team in store
      set((state) => ({
        teams: state.teams.map((t) =>
          t.id === teamId ? { ...t, name: updatedTeam.name, version: updatedTeam.version } : t
        ),
        isLoading: false
      }));
    } catch (error: any) {
      let errorMessage = 'Failed to update team name';
      if (error.code === 'conflict') {
        errorMessage = 'Team name was updated by another member';
      } else if (error.code === 'duplicate_name') {
        errorMessage = 'Team name already in use';
      } else if (error.message) {
        errorMessage = error.message;
      }
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  }
}));
```

#### React Hooks Pattern (from project-context.md)

```typescript
// ✅ Component using inline edit
export const TeamDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { teams } = useTeamsStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedTeam = useMemo(() => {
    const id = Number(teamId);
    return teams.find((team) => team.id === id);
  }, [teamId, teams]);

  const handleTeamNameUpdated = useCallback(async (newName: string) => {
    setRefreshKey(prev => prev + 1);
    // Re-fetch teams to sync with server
  }, []);

  return (
    <div>
      {selectedTeam && (
        <TeamNameInlineEdit
          teamId={selectedTeam.id}
          initialName={selectedTeam.name}
          onNameUpdated={handleTeamNameUpdated}
        />
      )}
    </div>
  );
};
```

#### Toast Notification Pattern

From existing project implementation (Example: InvitePanel.tsx pattern):

```typescript
// Use toast for success/error feedback
import { toast } from 'react-toastify';  // or similar

// Success:
toast.success('Team name updated', { autoClose: 2000 });

// Error:
toast.error('Failed to update team name', { autoClose: 3000 });

// Conflict:
toast.warning('Team name was updated by another member', { autoClose: 3000 });
```

**Alternative (if no toast library):** Use transient state in component

---

### 3. BACKEND API ENDPOINT

#### New Endpoint: PATCH /api/v1/teams/:teamId

**Route Definition Location:** [server/src/routes/teams.routes.ts](server/src/routes/teams.routes.ts)

**Route to Add:**
```typescript
/**
 * PATCH /api/v1/teams/:teamId
 * Update team name with optimistic locking (version check)
 * Protected by requireAuth + team membership validation
 */
teamsRouter.patch('/:teamId', requireAuth, validateTeamMembership, teamsController.updateTeam);
```

#### Controller Implementation

**File:** [server/src/controllers/teams.controller.ts](server/src/controllers/teams.controller.ts)

```typescript
/**
 * PATCH /api/v1/teams/:teamId
 * Update team name with optimistic locking
 */
export const updateTeam = async (
  req: Request<{ teamId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const teamId = parseInt(req.params.teamId, 10);
    
    // Validate request body
    const validationResult = updateTeamSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));
      
      throw new AppError(
        'validation_error',
        'Request validation failed',
        details,
        400
      );
    }
    
    const { name, version } = validationResult.data;
    
    // Call service
    const updatedTeam = await teamsService.updateTeamName(teamId, userId, name, version);
    
    res.json({
      team: updatedTeam,
      requestId: req.id
    });
  } catch (error: any) {
    if (error && req.id) {
      error.requestId = req.id;
    }
    next(error);
  }
};
```

#### Service Implementation

**File:** [server/src/services/teams.service.ts](server/src/services/teams.service.ts)

```typescript
/**
 * Update team name with optimistic locking
 * Prevents concurrent edits via version check
 * Logs event atomically with update
 * 
 * @param teamId - Team identifier
 * @param userId - User making update (for logging)
 * @param newName - New team name (3-50 chars)
 * @param currentVersion - Current version from client
 * @returns Updated team with new version
 * @throws AppError with code='conflict' (409) if version mismatch (AC8)
 * @throws AppError with code='duplicate_name' (409) if name exists
 * @throws AppError with code='not_found' (404) if team doesn't exist
 */
export const updateTeamName = async (
  teamId: number,
  userId: number,
  newName: string,
  currentVersion: number
): Promise<TeamDto> => {
  // CRITICAL: Use transaction to ensure event logging is atomic with update
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Fetch current team to check version and get old name
    const team = await tx.team.findUnique({
      where: { id: teamId }
    });
    
    if (!team) {
      throw new AppError('not_found', 'Team not found', {}, 404);
    }
    
    // Step 2: Check version (optimistic locking - AC8)
    if (team.version !== currentVersion) {
      throw new AppError(
        'conflict',
        'Team name was updated by another member',
        { currentVersion: team.version, expectedVersion: currentVersion },
        409
      );
    }
    
    // Step 3: Check for duplicate name (if different from current)
    if (newName !== team.name) {
      const existing = await tx.team.findFirst({
        where: { name: newName }
      });
      
      if (existing) {
        throw new AppError(
          'duplicate_name',
          'Team name already exists',
          { existingTeamId: existing.id },
          409
        );
      }
    }
    
    // Step 4: Update team name and increment version
    const oldName = team.name;
    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: {
        name: newName,
        version: { increment: 1 }  // CRITICAL: increment version
      }
    });
    
    // Step 5: Log event ATOMICALLY in same transaction (AC7)
    await tx.event.create({
      data: {
        eventType: 'team.name_updated',
        action: 'team.name_updated',
        teamId,
        entityType: 'team',
        entityId: teamId,
        actorId: userId,
        payload: {
          oldName,
          newName,
          previousVersion: currentVersion,
          newVersion: updatedTeam.version,
          timestamp: new Date().toISOString()
        },
        schemaVersion: 'v1'
      }
    });
    
    return updatedTeam;
  });
  
  // Step 6: Convert to DTO
  return {
    id: result.id,
    name: result.name,
    version: result.version,  // Return new version to client
    memberCount: 0,  // Fetch if needed
    practiceCount: 0,
    coverage: 0,
    role: 'owner',
    createdAt: result.createdAt.toISOString()
  };
};
```

#### API Request/Response Format

**Request:**
```json
PATCH /api/v1/teams/1
Content-Type: application/json

{
  "name": "Updated Team Name",
  "version": 1
}
```

**Success Response (200):**
```json
{
  "team": {
    "id": 1,
    "name": "Updated Team Name",
    "version": 2,
    "memberCount": 5,
    "practiceCount": 12,
    "coverage": 75,
    "role": "owner",
    "createdAt": "2026-01-15T10:30:00Z"
  },
  "requestId": "req-1234567890"
}
```

**Conflict Response (409 - Version Mismatch):**
```json
{
  "code": "conflict",
  "message": "Team name was updated by another member",
  "details": {
    "currentVersion": 2,
    "expectedVersion": 1
  },
  "requestId": "req-1234567890"
}
```

**Duplicate Name Response (409):**
```json
{
  "code": "duplicate_name",
  "message": "Team name already exists",
  "details": {
    "existingTeamId": 5
  },
  "requestId": "req-1234567890"
}
```

**Validation Error Response (400):**
```json
{
  "code": "validation_error",
  "message": "Request validation failed",
  "details": [
    {
      "path": "name",
      "message": "Team name must be at least 3 characters",
      "code": "too_small"
    }
  ],
  "requestId": "req-1234567890"
}
```

---

### 4. FRONTEND API CLIENT

**File:** [client/src/features/teams/api/teamsApi.ts](client/src/features/teams/api/teamsApi.ts)

**Add Function:**
```typescript
/**
 * Update team name with optimistic locking
 * @param teamId - Team identifier
 * @param newName - New team name
 * @param version - Current version (from client state)
 * @returns Updated team with new version
 * @throws ApiError with code='conflict' if version mismatch
 */
export const updateTeamName = async (
  teamId: number,
  newName: string,
  version: number
): Promise<Team> => {
  const data = await requestWithRefresh<{ team: Team }>(
    `/api/v1/teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: newName, version })
    }
  );
  return data.team;
};
```

---

### 5. ERROR HANDLING SCENARIOS

#### Error Scenario 1: Validation Error (AC3)
**When:** Name < 3 chars or > 50 chars  
**Response Code:** 400  
**User Message:** "Team name must be 3-50 characters"  
**Component Action:** Show validation error inline, keep edit mode open

```typescript
// Component error handling
try {
  await updateTeamName(teamId, newName, currentVersion);
} catch (error) {
  if (error.code === 'validation_error') {
    // Show inline error
    setValidationError(error.message);
  }
}
```

#### Error Scenario 2: Version Conflict (AC8)
**When:** Another user updated team name simultaneously  
**Response Code:** 409 (Conflict)  
**User Message:** "Team name was updated by another member"  
**Component Action:** Close edit mode, refresh team name from server

```typescript
// Component conflict handling
try {
  await updateTeamName(teamId, newName, currentVersion);
} catch (error) {
  if (error.code === 'conflict') {
    // Refresh team data
    await fetchTeams();
    toast.warning(error.message);
    setIsEditing(false);
  }
}
```

#### Error Scenario 3: Duplicate Name
**When:** New name already exists (unique constraint)  
**Response Code:** 409 (Conflict)  
**User Message:** "Team name already in use"  
**Component Action:** Show error in edit field, keep edit mode open

```typescript
if (error.code === 'duplicate_name') {
  setValidationError('Team name already in use');
}
```

#### Error Scenario 4: Network Failure
**When:** Connection lost during save  
**Response Code:** Network error  
**User Message:** "Connection failed. Check your internet and retry."  
**Component Action:** Show error, keep edit mode open with data intact

```typescript
if (error.code === 'network_error') {
  toast.error(error.message);
  // Keep edit mode open
}
```

#### Error Scenario 5: Unauthorized (Lost Session)
**When:** Session expired during save  
**Response Code:** 401  
**User Message:** "Session expired. Please log in again."  
**Component Action:** Close edit mode, redirect to login

```typescript
if (error.statusCode === 401 || error.code === 'session_expired') {
  // Redirect to login
  navigate('/login');
}
```

---

### 6. TESTING REQUIREMENTS

#### Unit Tests: TeamNameInlineEdit Component

**File:** `client/src/features/teams/components/TeamNameInlineEdit.test.tsx`

**Test Cases:**

```typescript
describe('TeamNameInlineEdit', () => {
  
  // AC1: Pencil icon visibility
  it('displays pencil icon next to team name', () => {
    const { getByRole, getByText } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    expect(getByText('Platform Team')).toBeInTheDocument();
    expect(getByRole('button', { name: /edit|pencil/i })).toBeInTheDocument();
  });
  
  // AC2: Click to edit
  it('shows text field when pencil icon is clicked', () => {
    const { getByRole, queryByDisplayValue } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    
    expect(queryByDisplayValue('Platform Team')).toBeInTheDocument();
    expect(queryByDisplayValue('Platform Team')).toHaveFocus();
  });
  
  // AC3: Character count
  it('displays character count while editing', () => {
    const { getByRole, getByText } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" maxLength={50} />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    const input = getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'New Name' } });
    
    expect(getByText(/8\/50/)).toBeInTheDocument();
  });
  
  // AC4: Action buttons
  it('shows checkmark and X buttons when editing', () => {
    const { getByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    
    expect(getByRole('button', { name: /save|checkmark|✓/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /cancel|×|x/ })).toBeInTheDocument();
  });
  
  // AC5: Save operation
  it('saves new name when checkmark is clicked', async () => {
    const mockOnNameUpdated = jest.fn();
    const { getByRole } = render(
      <TeamNameInlineEdit
        teamId={1}
        initialName="Old Name"
        onNameUpdated={mockOnNameUpdated}
      />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    fireEvent.change(getByRole('textbox'), { target: { value: 'New Name' } });
    fireEvent.click(getByRole('button', { name: /save|checkmark|✓/ }));
    
    await waitFor(() => {
      expect(mockOnNameUpdated).toHaveBeenCalledWith('New Name');
    });
  });
  
  // AC6: Cancel operation
  it('reverts to original name when X is clicked', () => {
    const { getByRole, getByText, queryByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    fireEvent.change(getByRole('textbox'), { target: { value: 'New Name' } });
    fireEvent.click(getByRole('button', { name: /cancel|×|x/ }));
    
    expect(getByText('Platform Team')).toBeInTheDocument();
    expect(queryByRole('textbox')).not.toBeInTheDocument();
  });
  
  // AC8: Concurrency conflict
  it('shows conflict message when version mismatch occurs', async () => {
    const mockUpdateApi = jest.fn().mockRejectedValue(
      new ApiError('conflict', 'Team name was updated by another member', {}, 409)
    );
    jest.spyOn(teamsApi, 'updateTeamName').mockImplementation(mockUpdateApi);
    
    const { getByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Old Name" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    fireEvent.change(getByRole('textbox'), { target: { value: 'New Name' } });
    fireEvent.click(getByRole('button', { name: /save|checkmark|✓/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/team name was updated by another member/i)).toBeInTheDocument();
    });
  });
  
  // Input validation
  it('prevents saving empty or too-short names', () => {
    const { getByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    fireEvent.change(getByRole('textbox'), { target: { value: 'ab' } });
    fireEvent.click(getByRole('button', { name: /save|checkmark|✓/ }));
    
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
  });
  
  // Character limit
  it('prevents input exceeding max length', () => {
    const { getByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" maxLength={10} />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    const input = getByRole('textbox') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'This is way too long' } });
    
    expect(input.value.length).toBeLessThanOrEqual(10);
  });
  
  // Success notification
  it('shows success toast after saving', async () => {
    const { getByRole } = render(
      <TeamNameInlineEdit teamId={1} initialName="Platform Team" />
    );
    
    fireEvent.click(getByRole('button', { name: /edit|pencil/i }));
    fireEvent.change(getByRole('textbox'), { target: { value: 'New Name' } });
    fireEvent.click(getByRole('button', { name: /save|checkmark|✓/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/team name updated/i)).toBeInTheDocument();
    });
  });
});
```

#### API Tests: Backend updateTeam Endpoint

**File:** `server/src/routes/__tests__/teams.routes.test.ts`

```typescript
describe('PATCH /api/v1/teams/:teamId', () => {
  
  it('updates team name with valid input', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Team', version: 1 });
    
    expect(response.status).toBe(200);
    expect(response.body.team.name).toBe('Updated Team');
    expect(response.body.team.version).toBe(2);
  });
  
  it('returns 409 on version mismatch (AC8)', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', version: 1 });  // Wrong version
    
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('conflict');
    expect(response.body.message).toContain('updated by another member');
  });
  
  it('returns 409 on duplicate name', async () => {
    // Create team with existing name
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Existing Team', version: 1 });
    
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('duplicate_name');
  });
  
  it('returns 400 on validation error (name too short)', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ab', version: 1 });
    
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
  });
  
  it('logs event atomically with update', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', version: 1 });
    
    expect(response.status).toBe(200);
    
    // Verify event was logged
    const events = await prisma.event.findMany({
      where: { action: 'team.name_updated', teamId: 1 }
    });
    
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].payload).toMatchObject({
      oldName: expect.any(String),
      newName: 'New Name',
      timestamp: expect.any(String)
    });
  });
  
  it('returns 401 without authentication', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/1')
      .send({ name: 'New Name', version: 1 });
    
    expect(response.status).toBe(401);
  });
  
  it('returns 403 if user not team member', async () => {
    const response = await request(app)
      .patch('/api/v1/teams/999')  // Team user isn't member of
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', version: 1 });
    
    expect(response.status).toBe(403);
  });
});
```

#### Service Tests: updateTeamName

**File:** `server/src/services/teams.service.test.ts`

```typescript
describe('updateTeamName', () => {
  
  it('increments version after successful update', async () => {
    const result = await updateTeamName(1, userId, 'New Name', 1);
    
    expect(result.version).toBe(2);
  });
  
  it('throws conflict error on version mismatch', async () => {
    await expect(updateTeamName(1, userId, 'New Name', 99))
      .rejects.toThrow(expect.objectContaining({
        code: 'conflict',
        statusCode: 409
      }));
  });
  
  it('throws duplicate error if name already exists', async () => {
    // First create a team with this name
    await prisma.team.create({ data: { name: 'Taken Name', version: 1 } });
    
    await expect(updateTeamName(1, userId, 'Taken Name', 1))
      .rejects.toThrow(expect.objectContaining({
        code: 'duplicate_name',
        statusCode: 409
      }));
  });
  
  it('creates event atomically with update', async () => {
    await updateTeamName(1, userId, 'New Name', 1);
    
    const event = await prisma.event.findFirst({
      where: { action: 'team.name_updated', teamId: 1 }
    });
    
    expect(event).toMatchObject({
      action: 'team.name_updated',
      teamId: 1,
      actorId: userId,
      payload: expect.objectContaining({
        oldName: expect.any(String),
        newName: 'New Name'
      })
    });
  });
});
```

---

### 7. INTEGRATION WITH EXISTING CODE

#### Team Dashboard Integration

**Current File:** [client/src/features/teams/components/TeamDashboard.tsx](client/src/features/teams/components/TeamDashboard.tsx)

**Modification Required:**

Replace this:
```tsx
<div className="mb-4">
  <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
</div>
```

With:
```tsx
<div className="mb-4">
  <TeamNameInlineEdit
    teamId={selectedTeam.id}
    initialName={selectedTeam.name}
    onNameUpdated={async () => {
      // Refresh teams to sync updated name
      await refreshCoverage();
    }}
  />
</div>
```

#### Zustand Store Integration

**Current File:** [client/src/features/teams/state/teamsSlice.ts](client/src/features/teams/state/teamsSlice.ts)

**Add Method:**
```typescript
updateTeamName: async (teamId: number, newName: string, version: number) => {
  set({ isLoading: true, error: null });
  try {
    const updatedTeam = await updateTeamNameApi(teamId, newName, version);
    
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId ? { ...t, name: updatedTeam.name, version: updatedTeam.version } : t
      ),
      isLoading: false
    }));
    
    return updatedTeam;
  } catch (error: any) {
    const errorMessage = error.code === 'conflict'
      ? 'Team name was updated by another member'
      : error.code === 'duplicate_name'
      ? 'Team name already exists'
      : error.message || 'Failed to update team name';
    
    set({ error: errorMessage, isLoading: false });
    throw error;
  }
}
```

#### API Layer Integration

**Current File:** [client/src/features/teams/api/teamsApi.ts](client/src/features/teams/api/teamsApi.ts)

**Add Function:**
```typescript
export const updateTeamName = async (
  teamId: number,
  newName: string,
  version: number
): Promise<Team> => {
  const data = await requestWithRefresh<{ team: Team }>(
    `/api/v1/teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: newName, version })
    }
  );
  return data.team;
};
```

#### Routing Integration

**Current File:** [client/src/App.tsx](client/src/App.tsx)

**No changes needed** - Route already exists:
```tsx
<Route path="/teams/:teamId" element={<TeamDashboard />} />
```

#### Backend Route Integration

**Current File:** [server/src/routes/teams.routes.ts](server/src/routes/teams.routes.ts)

**Add Route:**
```typescript
teamsRouter.patch(
  '/:teamId',
  requireAuth,
  validateTeamMembership,
  teamsController.updateTeam
);
```

---

## Common Implementation Mistakes to AVOID

### ❌ Mistake 1: Missing Version Column
**Error:** Concurrent edits overwrite each other silently  
**Solution:** Add `version` column to Team model BEFORE implementing update endpoint  
**Reference:** AC8, Database Section

### ❌ Mistake 2: Not Logging Event Atomically
**Error:** Update succeeds but event fails (or vice versa) = audit trail broken  
**Solution:** Wrap BOTH update and event.create() in Prisma `$transaction()`  
**Reference:** Service Implementation, [project-context.md](project-context.md#7.-critical-don't-miss-rules-(anti-patterns-&-edge-cases))

### ❌ Mistake 3: Missing Error Handling for Conflicts
**Error:** User confused when concurrency conflict occurs  
**Solution:** Catch 409 error and show "Team name was updated by another member", refresh data  
**Reference:** AC8, Error Handling Section

### ❌ Mistake 4: Not Validating Name Length
**Error:** User enters name that violates database constraint  
**Solution:** Validate on client (3-50 chars) AND server (Zod schema)  
**Reference:** Validation Rules, Frontend, Backend

### ❌ Mistake 5: Forgetting to Clear Edit State on Cancel
**Error:** Edit form stays populated after cancel  
**Solution:** Reset input value, editing flag, validation errors in cancel handler  
**Reference:** Component Implementation Pattern

### ❌ Mistake 6: No Character Count Display
**Error:** User doesn't know how many chars they can type  
**Solution:** Show "15/50" format (current/max) in component  
**Reference:** AC3

### ❌ Mistake 7: Not Returning New Version from API
**Error:** Client still has old version number, next edit fails  
**Solution:** Include `version: 2` in PATCH response  
**Reference:** API Response Format

### ❌ Mistake 8: Missing Team Isolation on Backend
**Error:** User can update other teams' names  
**Solution:** validateTeamMembership middleware on route  
**Reference:** [project-context.md](project-context.md#critical-don't-miss-rules-(anti-patterns-&-edge-cases))

### ❌ Mistake 9: No Request ID for Tracing
**Error:** Can't track which request failed in logs  
**Solution:** Attach `requestId` to error response  
**Reference:** Error Response Format, [project-context.md](project-context.md#5.-code-quality-&-style-rules)

### ❌ Mistake 10: Updating Store Without Version
**Error:** Client state has stale version, causes conflict on next edit  
**Solution:** Update store with new version from server response  
**Reference:** Zustand Implementation Pattern

---

## Implementation Checklist

### Database Layer
- [ ] Add migration: `ALTER TABLE teams ADD COLUMN version INTEGER DEFAULT 1;`
- [ ] Update Prisma schema with `version` field on Team model
- [ ] Run `prisma generate` to sync types
- [ ] Run `prisma migrate dev` to apply migration

### Backend API
- [ ] Add `updateTeamName` method to teams.service.ts
- [ ] Add `updateTeam` handler to teams.controller.ts
- [ ] Add validation schema for PATCH request
- [ ] Add PATCH route to teams.routes.ts
- [ ] Implement transactional event logging in service
- [ ] Add error handling for conflicts (409), duplicates, validation
- [ ] Write service unit tests
- [ ] Write API integration tests
- [ ] Verify team isolation middleware on route

### Frontend Component
- [ ] Create TeamNameInlineEdit component
- [ ] Implement edit mode toggle on pencil click
- [ ] Add input field with character count display
- [ ] Add checkmark (✓) and X buttons
- [ ] Add save/cancel handlers with API calls
- [ ] Handle all error scenarios (validation, conflict, network, auth)
- [ ] Show toast notifications (success/error/conflict)
- [ ] Write component unit tests
- [ ] Write accessibility tests (focus, keyboard nav)

### Frontend State
- [ ] Add `updateTeamName` method to teamsSlice
- [ ] Import API function `updateTeamNameApi`
- [ ] Update store with new version after save
- [ ] Handle error states in store

### Frontend Integration
- [ ] Import TeamNameInlineEdit in TeamDashboard
- [ ] Replace static team name with inline edit component
- [ ] Pass teamId, initialName, callbacks
- [ ] Test in dashboard (manual)

### Testing
- [ ] Component unit tests (all AC covered)
- [ ] API integration tests (success and all error paths)
- [ ] Service unit tests
- [ ] E2E test (optional): Edit team name in UI, verify in dashboard

### Documentation
- [ ] Update `docs/05-backend-api.md` with PATCH endpoint
- [ ] Update `docs/06-frontend.md` with TeamNameInlineEdit component
- [ ] Update `docs/09-changelog.md` with story completion
- [ ] Add event type documentation to event table docs

---

## File Dependencies & Import Paths

### Frontend Files
```
client/src/
├── features/teams/
│   ├── components/
│   │   ├── TeamDashboard.tsx         # MODIFY - integrate component
│   │   ├── TeamNameInlineEdit.tsx    # NEW
│   ├── api/
│   │   ├── teamsApi.ts              # MODIFY - add updateTeamName()
│   ├── state/
│   │   ├── teamsSlice.ts            # MODIFY - add updateTeamName()
│   ├── __tests__/
│   │   ├── TeamNameInlineEdit.test.tsx  # NEW
```

### Backend Files
```
server/src/
├── services/
│   ├── teams.service.ts             # MODIFY - add updateTeamName()
│   ├── __tests__/
│   │   ├── teams.service.test.ts    # MODIFY - add tests
├── controllers/
│   ├── teams.controller.ts          # MODIFY - add updateTeam()
├── routes/
│   ├── teams.routes.ts              # MODIFY - add PATCH route
│   ├── __tests__/
│   │   ├── teams.routes.test.ts     # MODIFY - add API tests
```

### Database Files
```
server/prisma/
├── schema.prisma                    # MODIFY - add version to Team
├── migrations/
│   └── [date]_add_team_version/
       └── migration.sql             # NEW - add version column
```

---

## Acceptance Criteria Traceability

| AC# | Requirement | Implementation | Tests |
|-----|-------------|-----------------|-------|
| AC1 | Pencil icon visible | TeamNameInlineEdit component | Component test |
| AC2 | Click toggles edit mode | Edit state handler | Component test |
| AC3 | Character count shown | Real-time counter display | Component test |
| AC4 | Action buttons present | Checkmark & X buttons | Component test |
| AC5 | Save updates name | PATCH API + store update | API + Component tests |
| AC6 | Cancel reverts name | Cancel handler resets state | Component test |
| AC7 | Event logged | Service $transaction() | Service test |
| AC8 | Concurrency handled | Version check + 409 response | API + Component tests |

---

## Git Commands for Story Implementation

```bash
# Create feature branch
git checkout -b feature/2-1-3-team-name-inline-edit

# Stage files
git add .

# Commit with story reference
git commit -m "feat: 2.1.3 - Team name inline editing with pencil icon

- Add version column to Team model for optimistic locking
- Implement TeamNameInlineEdit component with pencil icon
- Add PATCH /api/v1/teams/:teamId endpoint with version check
- Log team.name_updated event atomically with update
- Handle concurrency conflicts with 409 response
- Add comprehensive unit and integration tests

AC1-AC8: All acceptance criteria implemented and tested
Refs: Story 2-1-3, Epic 2.1"

# Push and create PR
git push origin feature/2-1-3-team-name-inline-edit
```

---

## Resources & References

### Project Documentation
- [project-context.md](../project-context.md) - Critical implementation rules
- [04-database.md](../../docs/04-database.md) - Schema and migrations
- [05-backend-api.md](../../docs/05-backend-api.md) - API patterns
- [06-frontend.md](../../docs/06-frontend.md) - Component patterns

### Related Stories (Context)
- Story 2-1-0: Team Dashboard redesign (component structure reference)
- Story 2-1-1: Members page moved (navigation pattern reference)
- Story 2-1-2: Available after this story for follow-ups

### Technology Stack
- React 18.2 hooks: useState, useCallback, useMemo
- Zustand 4.4+ store: create, setState, getState
- TypeScript 5.2 strict mode (required)
- Prisma 7.2+ transactions: prisma.$transaction()
- Express 4.18 middleware pattern

---

## Sign-Off

**Story Ready for Development:** ✅ January 23, 2026

**Reviewed By:** AI Analysis  
**Completeness:** 100% - All AC, error scenarios, testing, implementation patterns documented  
**Critical Issues:** None (action required on version column migration)

**Next Steps:**
1. Create database migration for version column
2. Implement backend PATCH endpoint + service
3. Implement frontend TeamNameInlineEdit component
4. Integrate into TeamDashboard
5. Execute test checklist
6. Update documentation
7. Submit PR with story completion
