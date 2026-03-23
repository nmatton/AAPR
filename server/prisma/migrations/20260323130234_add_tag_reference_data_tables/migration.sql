-- CreateTable
CREATE TABLE "tag_personality_relations" (
    "tag_id" INTEGER NOT NULL,
    "trait" CHAR(1) NOT NULL,
    "high_pole" SMALLINT NOT NULL,
    "low_pole" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_personality_relations_pkey" PRIMARY KEY ("tag_id","trait")
);

-- CreateTable
CREATE TABLE "tag_candidates" (
    "problem_tag_id" INTEGER NOT NULL,
    "solution_tag_id" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_candidates_pkey" PRIMARY KEY ("problem_tag_id","solution_tag_id")
);

-- CreateTable
CREATE TABLE "tag_recommendations" (
    "tag_id" INTEGER NOT NULL,
    "recommendation_text" TEXT NOT NULL,
    "implementation_example" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_tag_personality_relations_tag" ON "tag_personality_relations"("tag_id");

-- CreateIndex
CREATE INDEX "idx_tag_candidates_problem" ON "tag_candidates"("problem_tag_id");

-- CreateIndex
CREATE INDEX "idx_tag_candidates_solution" ON "tag_candidates"("solution_tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_recommendations_tag_id_key" ON "tag_recommendations"("tag_id");

-- CreateIndex
CREATE INDEX "idx_tag_recommendations_tag" ON "tag_recommendations"("tag_id");

-- AddForeignKey
ALTER TABLE "tag_personality_relations" ADD CONSTRAINT "tag_personality_relations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_candidates" ADD CONSTRAINT "tag_candidates_problem_tag_id_fkey" FOREIGN KEY ("problem_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_candidates" ADD CONSTRAINT "tag_candidates_solution_tag_id_fkey" FOREIGN KEY ("solution_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_recommendations" ADD CONSTRAINT "tag_recommendations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
