DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    -- 1. Ensure migration (Idempotent)
    -- We select from practices and insert into practice_associations
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

    -- 2. Get Count
    SELECT count(*) INTO migrated_count FROM "practice_associations";

    -- 3. Log Event
    INSERT INTO "events" ("event_type", "action", "payload", "created_at", "schema_version")
    VALUES (
      'system.migration',
      'migration.practice_associations_completed',
      json_build_object(
        'migratedCount', migrated_count,
        'timestamp', CURRENT_TIMESTAMP
      ),
      CURRENT_TIMESTAMP,
      'v1'
    );
END $$;