-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practices" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "goal" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_practices" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "practice_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pillars" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,

    CONSTRAINT "pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_pillars" (
    "id" SERIAL NOT NULL,
    "practice_id" INTEGER NOT NULL,
    "pillar_id" INTEGER NOT NULL,

    CONSTRAINT "practice_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_teams_name" ON "teams"("name");

-- CreateIndex
CREATE INDEX "idx_team_members_team" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "idx_team_members_user" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_practices_category" ON "practices"("category");

-- CreateIndex
CREATE INDEX "idx_team_practices_team" ON "team_practices"("team_id");

-- CreateIndex
CREATE INDEX "idx_team_practices_practice" ON "team_practices"("practice_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_practices_team_id_practice_id_key" ON "team_practices"("team_id", "practice_id");

-- CreateIndex
CREATE UNIQUE INDEX "pillars_name_key" ON "pillars"("name");

-- CreateIndex
CREATE INDEX "idx_practice_pillars_practice" ON "practice_pillars"("practice_id");

-- CreateIndex
CREATE INDEX "idx_practice_pillars_pillar" ON "practice_pillars"("pillar_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_pillars_practice_id_pillar_id_key" ON "practice_pillars"("practice_id", "pillar_id");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_practices" ADD CONSTRAINT "team_practices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_practices" ADD CONSTRAINT "team_practices_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_pillars" ADD CONSTRAINT "practice_pillars_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_pillars" ADD CONSTRAINT "practice_pillars_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "pillars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
