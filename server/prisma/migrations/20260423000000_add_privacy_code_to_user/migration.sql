-- Add nullable privacy code for backward compatibility with existing users.
-- IMPORTANT: privacy_code must NEVER be updated. Research data depends on its permanence.

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "privacy_code" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_privacy_code_key" ON "users"("privacy_code");
