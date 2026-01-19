/*
  Warnings:

  - You are about to drop the column `category` on the `pillars` table. All the data in the column will be lost.
  - The primary key for the `practice_pillars` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `practice_pillars` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `practices` table. All the data in the column will be lost.
  - You are about to alter the column `goal` on the `practices` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - A unique constraint covering the columns `[name,category_id]` on the table `pillars` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title,category_id]` on the table `practices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `teams` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category_id` to the `pillars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pillars` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `practices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `practices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "pillars_name_key";

-- DropIndex
DROP INDEX "practice_pillars_practice_id_pillar_id_key";

-- DropIndex
DROP INDEX "idx_practices_category";

-- AlterTable
ALTER TABLE "pillars" DROP COLUMN "category",
ADD COLUMN     "category_id" VARCHAR(50) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "practice_pillars" DROP CONSTRAINT "practice_pillars_pkey",
DROP COLUMN "id",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "practice_pillars_pkey" PRIMARY KEY ("practice_id", "pillar_id");

-- AlterTable
ALTER TABLE "practices" DROP COLUMN "category",
ADD COLUMN     "activities" JSONB,
ADD COLUMN     "associated_practices" JSONB,
ADD COLUMN     "benefits" JSONB,
ADD COLUMN     "category_id" VARCHAR(50) NOT NULL,
ADD COLUMN     "completion_criteria" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "guidelines" JSONB,
ADD COLUMN     "imported_at" TIMESTAMP(3),
ADD COLUMN     "imported_by" VARCHAR(100),
ADD COLUMN     "json_checksum" VARCHAR(64),
ADD COLUMN     "method" VARCHAR(50),
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "pitfalls" JSONB,
ADD COLUMN     "practice_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "raw_json" JSONB,
ADD COLUMN     "roles" JSONB,
ADD COLUMN     "source_file" VARCHAR(255),
ADD COLUMN     "source_git_sha" VARCHAR(40),
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "work_products" JSONB,
ALTER COLUMN "goal" SET DATA TYPE VARCHAR(500);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "invited_by" INTEGER NOT NULL,
    "invited_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_team_invites_team" ON "team_invites"("team_id");

-- CreateIndex
CREATE INDEX "idx_team_invites_email" ON "team_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_team_invites_team_email" ON "team_invites"("team_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_pillars_category" ON "pillars"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pillars_name_category" ON "pillars"("name", "category_id");

-- CreateIndex
CREATE INDEX "idx_practices_category" ON "practices"("category_id");

-- CreateIndex
CREATE INDEX "idx_practices_title" ON "practices"("title");

-- CreateIndex
CREATE INDEX "idx_practices_is_global" ON "practices"("is_global");

-- CreateIndex
CREATE INDEX "idx_practices_method" ON "practices"("method");

-- CreateIndex
CREATE UNIQUE INDEX "uq_practices_title_category" ON "practices"("title", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pillars" ADD CONSTRAINT "pillars_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
