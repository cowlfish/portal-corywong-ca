-- CreateEnum
CREATE TYPE "TourRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'CLOSED');

-- CreateTable
CREATE TABLE "tour_requests" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferred_times" TEXT NOT NULL,
    "message" TEXT,
    "status" "TourRequestStatus" NOT NULL DEFAULT 'NEW',
    "agent_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_requests_status_created_at_idx" ON "tour_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "tour_requests_email_idx" ON "tour_requests"("email");

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

