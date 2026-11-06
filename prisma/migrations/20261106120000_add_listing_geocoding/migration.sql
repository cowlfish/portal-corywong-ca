-- AlterTable
ALTER TABLE "mls_listings" ADD COLUMN     "address_display" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "geocode_address" TEXT,
ADD COLUMN     "geocoded_at" TIMESTAMP(3),
ADD COLUMN     "location_credit" TEXT,
ADD COLUMN     "location_precision" TEXT,
ADD COLUMN     "location_source" TEXT;

-- CreateIndex
CREATE INDEX "mls_listings_geocoded_at_idx" ON "mls_listings"("geocoded_at");

