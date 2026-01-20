-- Add indexes to improve practice search and filter performance
CREATE INDEX IF NOT EXISTS "idx_practices_goal" ON "practices" ("goal");
CREATE INDEX IF NOT EXISTS "idx_practice_pillars_practice_pillar" ON "practice_pillars" ("practice_id", "pillar_id");
