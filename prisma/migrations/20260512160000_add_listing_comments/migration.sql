-- CreateEnum
CREATE TYPE "comment_visibility" AS ENUM ('PRIVATE', 'GROUP', 'AGENT', 'PUBLIC', 'SPECIFIC_CLIENTS', 'CLIENT_GROUP');

-- CreateTable
CREATE TABLE "listing_comments" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "comment_visibility" NOT NULL DEFAULT 'PRIVATE',
    "visible_to_users" TEXT[] DEFAULT '{}',
    "visible_to_groups" TEXT[] DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_comments_listing_id_created_at_idx" ON "listing_comments"("listing_id", "created_at");
CREATE INDEX "listing_comments_author_id_idx" ON "listing_comments"("author_id");

-- AddForeignKey
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
