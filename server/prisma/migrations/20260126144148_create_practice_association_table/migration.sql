-- CreateTable
CREATE TABLE "practice_associations" (
    "id" SERIAL NOT NULL,
    "source_practice_id" INTEGER NOT NULL,
    "target_practice_id" INTEGER NOT NULL,
    "association_type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_associations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_practice_associations_source" ON "practice_associations"("source_practice_id");

-- CreateIndex
CREATE INDEX "idx_practice_associations_target" ON "practice_associations"("target_practice_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_practice_associations_source_target_type" ON "practice_associations"("source_practice_id", "target_practice_id", "association_type");

-- AddForeignKey
ALTER TABLE "practice_associations" ADD CONSTRAINT "practice_associations_source_practice_id_fkey" FOREIGN KEY ("source_practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_associations" ADD CONSTRAINT "practice_associations_target_practice_id_fkey" FOREIGN KEY ("target_practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Migrate associated_practices JSON to practice_associations table
INSERT INTO "practice_associations" ("source_practice_id", "target_practice_id", "association_type", "updated_at", "created_at")
SELECT
    p.id AS source_practice_id,
    target_p.id AS target_practice_id,
    elem->>'association_type' AS association_type,
    CURRENT_TIMESTAMP AS updated_at,
    CURRENT_TIMESTAMP AS created_at
FROM "practices" p
CROSS JOIN LATERAL json_array_elements(p.associated_practices::json) AS elem
JOIN "practices" target_p ON target_p.title = (elem->>'target_practice')
WHERE p.associated_practices IS NOT NULL
ON CONFLICT ("source_practice_id", "target_practice_id", "association_type") DO NOTHING;

-- Log Event: Schema change event for traceability
INSERT INTO "events" ("event_type", "action", "payload", "created_at", "schema_version")
VALUES (
  'system.migration',
  'schema.practice_association_created',
  json_build_object(
    'migration', '20260126144148_create_practice_association_table',
    'timestamp', CURRENT_TIMESTAMP
  ),
  CURRENT_TIMESTAMP,
  'v1'
);
