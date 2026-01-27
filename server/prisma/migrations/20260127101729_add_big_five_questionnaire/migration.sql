-- CreateTable
CREATE TABLE "big_five_responses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_number" INTEGER NOT NULL,
    "response" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "big_five_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "big_five_scores" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "extraversion" INTEGER NOT NULL,
    "agreeableness" INTEGER NOT NULL,
    "conscientiousness" INTEGER NOT NULL,
    "neuroticism" INTEGER NOT NULL,
    "openness" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "big_five_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_big_five_responses_user" ON "big_five_responses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_big_five_responses_user_item" ON "big_five_responses"("user_id", "item_number");

-- CreateIndex
CREATE UNIQUE INDEX "big_five_scores_user_id_key" ON "big_five_scores"("user_id");

-- AddForeignKey
ALTER TABLE "big_five_responses" ADD CONSTRAINT "big_five_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "big_five_scores" ADD CONSTRAINT "big_five_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
