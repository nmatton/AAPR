-- CreateTable: global tags for directed recommendations
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'System',
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: join table linking issues to specific tags
CREATE TABLE "issue_tags" (
    "issue_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "issue_tags_pkey" PRIMARY KEY ("issue_id","tag_id")
);

-- AlterTable: standalone flag for issues not linked to any practice
ALTER TABLE "issues" ADD COLUMN "is_standalone" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "idx_issue_tags_issue" ON "issue_tags"("issue_id");

-- CreateIndex
CREATE INDEX "idx_issue_tags_tag" ON "issue_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "issue_tags" ADD CONSTRAINT "issue_tags_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_tags" ADD CONSTRAINT "issue_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
