-- CreateEnum
CREATE TYPE "tour_status" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "filters" JSONB,
    "active_count" INTEGER NOT NULL,
    "avg_list_price" DECIMAL(12,2) NOT NULL,
    "median_list_price" DECIMAL(12,2) NOT NULL,
    "avg_price_per_sqft" DECIMAL(10,2),
    "avg_days_on_market" DECIMAL(8,1),
    "median_days_on_market" INTEGER,
    "price_distribution" JSONB,
    "dom_distribution" JSONB,
    "property_type_counts" JSONB,
    "area_counts" JSONB,
    "share_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client_name" TEXT,
    "client_email" TEXT,
    "client_phone" TEXT,
    "tour_date" TIMESTAMP(3),
    "notes" TEXT,
    "share_token" TEXT,
    "status" "tour_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_stops" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "scheduled_time" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "list_price" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "property_type" TEXT,
    "photo_url" TEXT,
    "mls_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_snapshots_share_token_key" ON "market_snapshots"("share_token");

-- CreateIndex
CREATE INDEX "market_snapshots_snapshot_date_idx" ON "market_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "market_snapshots_share_token_idx" ON "market_snapshots"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "tours_share_token_key" ON "tours"("share_token");

-- CreateIndex
CREATE INDEX "tours_user_id_idx" ON "tours"("user_id");

-- CreateIndex
CREATE INDEX "tours_status_idx" ON "tours"("status");

-- CreateIndex
CREATE INDEX "tours_share_token_idx" ON "tours"("share_token");

-- CreateIndex
CREATE INDEX "tour_stops_tour_id_sort_order_idx" ON "tour_stops"("tour_id", "sort_order");

-- CreateIndex
CREATE INDEX "tour_stops_listing_id_idx" ON "tour_stops"("listing_id");

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_stops" ADD CONSTRAINT "tour_stops_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_stops" ADD CONSTRAINT "tour_stops_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
