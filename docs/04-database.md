# Database

**Database Schema & Design for AAPR Platform**

Last Updated: January 20, 2026  
Database: PostgreSQL 14+  
ORM: Prisma 7.2+

---

## Schema Overview

The AAPR database uses a **normalized relational schema** (3NF) with the following entity groups:

1. **User Management:** `users`
2. **Team Management:** `teams`, `team_members`, `team_invites`
3. **Practice Catalog:** `practices`, `pillars`, `practice_pillars`, `team_practices`
4. **Research Logging:** `events`

---

## Entity Relationship Diagram

```
┌──────────┐
│  users   │
└────┬─────┘
     │
     ├─────────┐
     │         │
     ▼         ▼
┌────────┐  ┌──────────────┐
│team    │  │ team_invites │
│members │  └──────────────┘
└───┬────┘
    │
    ▼
┌───────┐      ┌──────────────┐      ┌────────────┐
│ teams │◄─────┤team_practices├─────►│ practices  │
└───────┘      └──────────────┘      └──────┬─────┘
                                             │
                                             ▼
                                     ┌──────────────┐      ┌─────────┐
                                     │practice      │◄─────┤ pillars │
                                     │pillars       │      └─────────┘
                                     └──────────────┘

┌────────┐
│ events │  (References all entities for audit logging)
└────────┘
```

---

## Tables

### users

**Purpose:** Authentication and user profile information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment user ID |
| name | VARCHAR(100) | NOT NULL | User's display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email for login |
| password | CHAR(60) | NOT NULL | Bcrypt hash (always 60 chars) |
| created_at | TIMESTAMP | DEFAULT NOW() | User creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `email`

**Security Notes:**
- Password MUST be bcrypt-hashed (10+ rounds minimum)
- NEVER return password in API responses

---

### teams

**Purpose:** Development teams using the platform

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment team ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Team name |
| created_at | TIMESTAMP | DEFAULT NOW() | Team creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| version | INTEGER | DEFAULT 1 | Optimistic locking version (Story 2-1-3) |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `name`
- INDEX on `name` (for search)

---

### team_members

**Purpose:** User membership in teams (many-to-many)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| team_id | INT | FK → teams(id) CASCADE | Team reference |
| user_id | INT | FK → users(id) CASCADE | User reference |
| role | VARCHAR(20) | DEFAULT 'member' | Member role (owner/member) |
| joined_at | TIMESTAMP | DEFAULT NOW() | Membership creation |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(team_id, user_id)` - user can only be in team once
- INDEX on `team_id` - fast team lookups
- INDEX on `user_id` - fast user lookups

**Isolation:** All queries MUST filter by `team_id` for team-scoped operations

---

### team_invites

**Purpose:** Pending or completed invitations to join teams

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| team_id | INT | FK → teams(id) CASCADE | Team reference |
| email | VARCHAR(255) | NOT NULL | Invitee email |
| status | VARCHAR(20) | NOT NULL | 'Pending', 'Added', 'Failed' |
| invited_by | INT | FK → users(id) CASCADE | Inviter user ID |
| invited_user_id | INT | FK → users(id) SET NULL | Existing user (if any) |
| created_at | TIMESTAMP | DEFAULT NOW() | Invite creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| last_sent_at | TIMESTAMP | NULL | Last email sent |
| error_message | TEXT | NULL | Email failure reason |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(team_id, email)` - idempotent invites
- INDEX on `team_id`
- INDEX on `email`

**Status Values:**
- `Pending`: Invite sent, awaiting signup
- `Added`: User added to team (existing user or resolved signup)
- `Failed`: Email send failed

---

### categories

**Purpose:** 5 APR framework categories (global reference data)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(50) | PRIMARY KEY | Category ID (semantic key) |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Display name |
| description | TEXT | NULL | Category description |
| display_order | INT | NOT NULL | UI ordering |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `name`

---

### practices

**Purpose:** Agile practices catalog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| title | VARCHAR(100) | NOT NULL | Practice name |
| goal | VARCHAR(500) | NOT NULL | Practice objective |
| description | TEXT | NULL | Practice description |
| category_id | VARCHAR(50) | FK → categories(id) | Practice category |
| method | VARCHAR(50) | NULL | Framework/method |
| tags | JSONB | NULL | Tags array |
| activities | JSONB | NULL | Structured activities |
| roles | JSONB | NULL | RACI roles |
| work_products | JSONB | NULL | Work products |
| completion_criteria | TEXT | NULL | Definition of Done |
| metrics | JSONB | NULL | Success metrics |
| guidelines | JSONB | NULL | Guideline links |
| pitfalls | JSONB | NULL | Pitfalls list |
| benefits | JSONB | NULL | Benefits list |
| associated_practices | JSONB | NULL | Related practices |
| is_global | BOOLEAN | DEFAULT TRUE | Global vs team-specific |
| imported_at | TIMESTAMP | NULL | Import timestamp |
| source_file | VARCHAR(255) | NULL | Source JSON file |
| json_checksum | VARCHAR(64) | NULL | SHA256 checksum |
| practice_version | INT | DEFAULT 1 | Practice version |
| imported_by | VARCHAR(100) | NULL | Import actor |
| source_git_sha | VARCHAR(40) | NULL | Source git SHA |
| raw_json | JSONB | NULL | Original JSON payload |
| created_at | TIMESTAMP | DEFAULT NOW() | Practice creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `category_id`
- INDEX on `title`
- INDEX on `goal`
- INDEX on `is_global`

**Categories (Epic 2):**
- VALEURS HUMAINES
- FEEDBACK & APPRENTISSAGE
- EXCELLENCE TECHNIQUE
- ORGANISATION & AUTONOMIE
- FLUX & RAPIDITÉ

---

### pillars

**Purpose:** 19 agile pillars from APR framework

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(255) | NOT NULL | Pillar name |
| category_id | VARCHAR(50) | FK → categories(id) | Pillar category |
| description | TEXT | NULL | Pillar description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(name, category_id)`
- INDEX on `category_id`

**Total Pillars:** 19 (across 5 categories)

---

### practice_pillars

**Purpose:** Many-to-many mapping of practices to pillars

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| practice_id | INT | FK → practices(id) CASCADE | Practice reference |
| pillar_id | INT | FK → pillars(id) CASCADE | Pillar reference |
| created_at | TIMESTAMP | DEFAULT NOW() | Created timestamp |

**Indexes:**
- PRIMARY KEY on `(practice_id, pillar_id)`
- INDEX on `practice_id`
- INDEX on `pillar_id`
- INDEX on `(practice_id, pillar_id)`

---

### team_practices

**Purpose:** Practices selected by each team

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| team_id | INT | FK → teams(id) CASCADE | Team reference |
| practice_id | INT | FK → practices(id) CASCADE | Practice reference |
| added_at | TIMESTAMP | DEFAULT NOW() | When added to team |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(team_id, practice_id)`
- INDEX on `team_id`
- INDEX on `practice_id`

---

### events

**Purpose:** Immutable audit log for research data integrity

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| event_type | VARCHAR(50) | NOT NULL | Event classification |
| actor_id | INT | NULL | User who triggered |
| team_id | INT | NULL | Team context |
| entity_type | VARCHAR(50) | NULL | Entity affected |
| entity_id | INT | NULL | Entity ID |
| action | VARCHAR(50) | NULL | Action performed |
| payload | JSONB | NULL | Event-specific data |
| schema_version | VARCHAR(10) | DEFAULT 'v1' | Payload schema version |
| created_at | TIMESTAMP | DEFAULT NOW() | Event timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(team_id, event_type)` - team event queries
- INDEX on `(entity_type, entity_id)` - entity history
- INDEX on `event_type` - event type analysis

**Immutability:** Append-only, no updates/deletes (except manual batch purge)

**Event Types (Epic 1):**
- `project.initialized`
- `user.registered`
- `user.login_success`
- `team.created`
- `team_member.added`
- `team_member.removed`
- `invite.created`
- `invite.auto_resolved`
- `invite.email_failed`

---

## Migration History

### 20260116142444_add_users_and_events_tables
- Created `users` table
- Created `events` table
- Added indexes and constraints

### 20260119_add_teams_and_members
- Created `teams` table
- Created `team_members` table
- Added foreign keys and indexes

### 20260119_add_invites
- Created `team_invites` table
- Added unique constraint on `(team_id, email)`
- Added foreign keys to users and teams

### 20260119_add_practices_and_pillars
- Created `practices` table
- Created `pillars` table
- Created `practice_pillars` junction table
- Created `team_practices` junction table
- Added indexes

### 20260120_add_practice_search_indexes
- Added index on `practices.goal`
- Added composite index on `practice_pillars(practice_id, pillar_id)`

---

## Seed Script Usage

```powershell
cd server
npm run db:seed
```

**Seed order:**
1. Categories and pillars
2. Practices import from `docs/raw_practices/practices_reference.json`

---

## Data Integrity Rules

### Cascading Deletes
- Delete user → delete team_members, delete events with actor_id
- Delete team → delete team_members, delete team_practices, delete team_invites
- Delete practice → delete practice_pillars, delete team_practices

### Foreign Key Constraints
- All FKs enforced at database level
- CASCADE or SET NULL as appropriate
- No orphaned records

### Unique Constraints
- `users.email` - no duplicate emails
- `teams.name` - no duplicate team names
- `team_members(team_id, user_id)` - user only in team once
- `team_invites(team_id, email)` - idempotent invites
- `practice_pillars(practice_id, pillar_id)` - no duplicate mappings
- `team_practices(team_id, practice_id)` - no duplicate practice assignments

---

## Query Patterns

### Get teams for user
```sql
SELECT t.* 
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE tm.user_id = $1;
```

### Get team members with invite status
```sql
SELECT 
  u.id, u.name, u.email, tm.joined_at, 'Added' AS status
FROM team_members tm
JOIN users u ON tm.user_id = u.id
WHERE tm.team_id = $1
UNION
SELECT 
  NULL AS id, NULL AS name, ti.email, ti.created_at, ti.status
FROM team_invites ti
WHERE ti.team_id = $1 AND ti.status IN ('Pending', 'Failed');
```

### Calculate team coverage
```sql
SELECT COUNT(DISTINCT pp.pillar_id) AS pillars_covered
FROM team_practices tp
JOIN practice_pillars pp ON tp.practice_id = pp.practice_id
WHERE tp.team_id = $1;

-- Coverage % = (pillars_covered / 19) * 100
```

---

## Performance Considerations

### Indexed Queries
- User login: `users.email` (unique index) → O(log n)
- Team lookup: `teams.id` (primary key) → O(1)
- Team membership: `team_members(team_id, user_id)` (composite unique) → O(log n)

### N+1 Query Prevention
Use Prisma `include` to eager-load relationships:
```typescript
const teams = await prisma.team.findMany({
  where: { teamMembers: { some: { userId } } },
  include: {
    _count: { select: { teamMembers: true, teamPractices: true } },
    teamPractices: { include: { practice: { include: { practicePillars: true } } } }
  }
});
```

### Event Table Growth
- Estimate: ~100 events/team/day
- 1 year: ~36,500 events/team
- 10 teams: ~365,000 events
- PostgreSQL handles this easily with proper indexing

---

## Backup & Recovery

### Local Development
```powershell
# Backup
docker exec aapr-postgres pg_dump -U aapr_user aapr > backup.sql

# Restore
docker exec -i aapr-postgres psql -U aapr_user aapr < backup.sql
```

### Production (Manual)
- Weekly full backup via `pg_dump`
- Store backups in secure location
- Test restore procedure quarterly

---

## Next Steps (Epic 2)

- Seed practice data from JSON
- Add pillar data (19 pillars across 5 categories)
- Implement coverage calculation stored procedure (optional optimization)
- Add full-text search indexes on practices (optional)

**Last Updated:** January 19, 2026
