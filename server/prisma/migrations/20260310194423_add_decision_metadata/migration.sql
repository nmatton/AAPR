-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "decision_recorded_at" TIMESTAMP(3),
ADD COLUMN     "decision_recorded_by" INTEGER;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_decision_recorded_by_fkey" FOREIGN KEY ("decision_recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
