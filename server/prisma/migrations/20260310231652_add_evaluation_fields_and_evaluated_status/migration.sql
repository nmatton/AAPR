-- AlterEnum
ALTER TYPE "IssueStatus" ADD VALUE 'EVALUATED';

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "evaluation_comments" TEXT,
ADD COLUMN     "evaluation_outcome" VARCHAR(10),
ADD COLUMN     "evaluation_recorded_at" TIMESTAMP(3),
ADD COLUMN     "evaluation_recorded_by" INTEGER;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_evaluation_recorded_by_fkey" FOREIGN KEY ("evaluation_recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
