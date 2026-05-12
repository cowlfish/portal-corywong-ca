-- CreateEnum
CREATE TYPE "cma_status" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "cma_sold_comp_source" AS ENUM ('MANUAL', 'FEED');

-- CreateTable
CREATE TABLE "cma_reports" (
    "id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject_address" TEXT,
    "subject_property_type" TEXT,
    "subject_bedrooms" INTEGER,
    "subject_bathrooms" INTEGER,
    "subject_sqft" DECIMAL(10,2),
    "subject_list_price" DECIMAL(12,2),
    "notes" TEXT,
    "status" "cma_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cma_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cma_comps" (
    "id" TEXT NOT NULL,
    "cma_report_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "notes" TEXT,
    "adjustments" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cma_comps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cma_sold_comps" (
    "id" TEXT NOT NULL,
    "cma_report_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "property_type" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "sqft" DECIMAL(10,2),
    "lot_size_sqft" DECIMAL(12,2),
    "sold_price" DECIMAL(12,2) NOT NULL,
    "sold_date" TIMESTAMP(3) NOT NULL,
    "list_price" DECIMAL(12,2),
    "days_on_market" INTEGER,
    "notes" TEXT,
    "adjustments" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "source" "cma_sold_comp_source" NOT NULL DEFAULT 'MANUAL',
    "listing_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cma_sold_comps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cma_reports_created_by_user_id_idx" ON "cma_reports"("created_by_user_id");

-- CreateIndex
CREATE INDEX "cma_reports_status_idx" ON "cma_reports"("status");

-- CreateIndex
CREATE INDEX "cma_comps_cma_report_id_idx" ON "cma_comps"("cma_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "cma_comps_cma_report_id_listing_id_key" ON "cma_comps"("cma_report_id", "listing_id");

-- CreateIndex
CREATE INDEX "cma_sold_comps_cma_report_id_idx" ON "cma_sold_comps"("cma_report_id");

-- AddForeignKey
ALTER TABLE "cma_comps" ADD CONSTRAINT "cma_comps_cma_report_id_fkey" FOREIGN KEY ("cma_report_id") REFERENCES "cma_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cma_comps" ADD CONSTRAINT "cma_comps_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cma_sold_comps" ADD CONSTRAINT "cma_sold_comps_cma_report_id_fkey" FOREIGN KEY ("cma_report_id") REFERENCES "cma_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
