-- AlterTable: Add is_admin_monitor flag to users
-- Allows a single global monitoring admin account to be excluded from team membership effects
ALTER TABLE "users" ADD COLUMN "is_admin_monitor" BOOLEAN NOT NULL DEFAULT false;
