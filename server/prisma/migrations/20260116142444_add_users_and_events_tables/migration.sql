-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "actor_id" INTEGER,
    "team_id" INTEGER,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "action" VARCHAR(50),
    "payload" JSONB,
    "schema_version" VARCHAR(10) NOT NULL DEFAULT 'v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_events_team_type" ON "events"("team_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_events_entity" ON "events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_events_type" ON "events"("event_type");
