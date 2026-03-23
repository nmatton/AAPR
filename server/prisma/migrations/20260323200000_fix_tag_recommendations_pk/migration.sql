-- Fix: promote tag_id unique index to PRIMARY KEY
-- The original migration created tag_recommendations without a primary key,
-- using only a UNIQUE INDEX. This migration corrects that by converting
-- the unique index into the table's primary key constraint.

-- Promote existing unique index to primary key (no table rewrite required)
ALTER TABLE "tag_recommendations" ADD CONSTRAINT "tag_recommendations_pkey" PRIMARY KEY USING INDEX "tag_recommendations_tag_id_key";

-- Drop the now-redundant separate index (PK index covers single-column lookups)
DROP INDEX IF EXISTS "idx_tag_recommendations_tag";
