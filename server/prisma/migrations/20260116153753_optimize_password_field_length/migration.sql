/*
  Warnings:

  - You are about to alter the column `password` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Char(60)`.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE CHAR(60);
