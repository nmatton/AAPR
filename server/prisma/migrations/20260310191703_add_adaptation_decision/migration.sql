-- AlterEnum
ALTER TYPE "IssueStatus" ADD VALUE 'ADAPTATION_IN_PROGRESS';

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "decision_text" TEXT;
