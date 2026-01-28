-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_DISCUSSION', 'RESOLVED');

-- CreateTable
CREATE TABLE "issues" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "team_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_practices" (
    "issue_id" INTEGER NOT NULL,
    "practice_id" INTEGER NOT NULL,

    CONSTRAINT "issue_practices_pkey" PRIMARY KEY ("issue_id","practice_id")
);

-- CreateIndex
CREATE INDEX "idx_issues_team" ON "issues"("team_id");

-- CreateIndex
CREATE INDEX "idx_issues_status" ON "issues"("status");

-- CreateIndex
CREATE INDEX "idx_issue_practices_issue" ON "issue_practices"("issue_id");

-- CreateIndex
CREATE INDEX "idx_issue_practices_practice" ON "issue_practices"("practice_id");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_practices" ADD CONSTRAINT "issue_practices_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_practices" ADD CONSTRAINT "issue_practices_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
