-- CreateEnum
CREATE TYPE "mls_listing_status" AS ENUM ('ACTIVE', 'SOLD', 'TERMINATED', 'EXPIRED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "mls_sync_status" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CLIENT', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "alert_frequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('NEW_LISTING', 'PRICE_CHANGE', 'STATUS_CHANGE', 'OPEN_HOUSE');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('BUYER', 'SELLER', 'LEASE', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('ACTIVE', 'CONDITIONAL', 'FIRM', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "transaction_client_role" AS ENUM ('PRIMARY', 'SECONDARY', 'OBSERVER');

-- CreateTable
CREATE TABLE "mls_listings" (
    "id" TEXT NOT NULL,
    "listing_key" TEXT NOT NULL,
    "mls_number" TEXT NOT NULL,
    "board_id" TEXT,
    "status" "mls_listing_status" NOT NULL DEFAULT 'ACTIVE',
    "status_change_at" TIMESTAMP(3),
    "list_price" DECIMAL(12,2) NOT NULL,
    "sold_price" DECIMAL(12,2),
    "original_price" DECIMAL(12,2),
    "property_type" TEXT,
    "property_sub_type" TEXT,
    "transaction_type" TEXT,
    "street_number" TEXT,
    "street_name" TEXT,
    "street_suffix" TEXT,
    "street_direction" TEXT,
    "unit_number" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "country" TEXT DEFAULT 'CA',
    "municipality" TEXT,
    "community" TEXT,
    "neighbourhood" TEXT,
    "area" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "bedrooms" INTEGER,
    "bedrooms_plus" INTEGER,
    "bathrooms" INTEGER,
    "bathrooms_half" INTEGER,
    "sqft" DECIMAL(10,2),
    "sqft_range_min" DECIMAL(10,2),
    "sqft_range_max" DECIMAL(10,2),
    "lot_size_sqft" DECIMAL(12,2),
    "lot_frontage" DECIMAL(8,2),
    "lot_depth" DECIMAL(8,2),
    "year_built" INTEGER,
    "stories" DECIMAL(4,1),
    "parking_spaces" INTEGER,
    "garage_type" TEXT,
    "garage_spaces" INTEGER,
    "maintenance_fee" DECIMAL(10,2),
    "condo_exposure" TEXT,
    "condo_style" TEXT,
    "balcony" TEXT,
    "locker" TEXT,
    "list_date" TIMESTAMP(3),
    "sold_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "days_on_market" INTEGER,
    "virtual_tour_url" TEXT,
    "public_remarks" TEXT,
    "extras_remarks" TEXT,
    "features_remarks" TEXT,
    "tax_amount" DECIMAL(10,2),
    "tax_year" INTEGER,
    "assessed_value" DECIMAL(12,2),
    "list_agent_name" TEXT,
    "list_agent_id" TEXT,
    "list_office_name" TEXT,
    "list_office_id" TEXT,
    "co_list_agent_name" TEXT,
    "co_list_agent_id" TEXT,
    "feed_source_id" TEXT,
    "feed_updated_at" TIMESTAMP(3) NOT NULL,
    "major_change_timestamp" TIMESTAMP(3),
    "photos_change_timestamp" TIMESTAMP(3),
    "documents_change_timestamp" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mls_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mls_listing_photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "media_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mls_listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mls_property_rooms" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "room_key" TEXT NOT NULL,
    "room_type" TEXT,
    "room_level" TEXT,
    "room_dimensions" TEXT,
    "room_area" DECIMAL(10,2),
    "room_description" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mls_property_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mls_open_houses" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "type" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mls_open_houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mls_price_history" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "change_date" TIMESTAMP(3) NOT NULL,
    "old_price" DECIMAL(12,2) NOT NULL,
    "new_price" DECIMAL(12,2) NOT NULL,
    "change_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mls_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mls_sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "mls_sync_status" NOT NULL DEFAULT 'RUNNING',
    "sync_type" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "error_details" JSONB,
    "cursor" TEXT,
    "cursor_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mls_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'CLIENT',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "alert_enabled" BOOLEAN NOT NULL DEFAULT false,
    "alert_frequency" "alert_frequency" NOT NULL DEFAULT 'DAILY',
    "last_alerted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "alert_type" "alert_type" NOT NULL,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transaction_type" "transaction_type" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT NOT NULL,
    "mls_number" TEXT,
    "list_price" DECIMAL(12,2),
    "sale_price" DECIMAL(12,2),
    "closing_date" TIMESTAMP(3),
    "condition_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_clients" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "transaction_client_role" NOT NULL DEFAULT 'PRIMARY',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_documents" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_links" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "max_downloads" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_audit_logs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_stages" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_by_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_forms" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "transaction_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mls_listings_listing_key_key" ON "mls_listings"("listing_key");

-- CreateIndex
CREATE UNIQUE INDEX "mls_listings_mls_number_key" ON "mls_listings"("mls_number");

-- CreateIndex
CREATE INDEX "mls_listings_status_idx" ON "mls_listings"("status");

-- CreateIndex
CREATE INDEX "mls_listings_city_status_idx" ON "mls_listings"("city", "status");

-- CreateIndex
CREATE INDEX "mls_listings_community_status_idx" ON "mls_listings"("community", "status");

-- CreateIndex
CREATE INDEX "mls_listings_property_type_status_idx" ON "mls_listings"("property_type", "status");

-- CreateIndex
CREATE INDEX "mls_listings_list_price_idx" ON "mls_listings"("list_price");

-- CreateIndex
CREATE INDEX "mls_listings_bedrooms_bathrooms_idx" ON "mls_listings"("bedrooms", "bathrooms");

-- CreateIndex
CREATE INDEX "mls_listings_feed_updated_at_idx" ON "mls_listings"("feed_updated_at");

-- CreateIndex
CREATE INDEX "mls_listings_latitude_longitude_idx" ON "mls_listings"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "mls_listings_listing_key_idx" ON "mls_listings"("listing_key");

-- CreateIndex
CREATE INDEX "mls_listing_photos_listing_id_display_order_idx" ON "mls_listing_photos"("listing_id", "display_order");

-- CreateIndex
CREATE INDEX "mls_property_rooms_listing_id_idx" ON "mls_property_rooms"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "mls_property_rooms_listing_id_room_key_key" ON "mls_property_rooms"("listing_id", "room_key");

-- CreateIndex
CREATE INDEX "mls_open_houses_listing_id_idx" ON "mls_open_houses"("listing_id");

-- CreateIndex
CREATE INDEX "mls_open_houses_start_date_idx" ON "mls_open_houses"("start_date");

-- CreateIndex
CREATE INDEX "mls_price_history_listing_id_change_date_idx" ON "mls_price_history"("listing_id", "change_date");

-- CreateIndex
CREATE INDEX "mls_sync_runs_started_at_idx" ON "mls_sync_runs"("started_at");

-- CreateIndex
CREATE INDEX "mls_sync_runs_status_idx" ON "mls_sync_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "saved_searches_alert_enabled_idx" ON "saved_searches"("alert_enabled");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_listing_id_idx" ON "favorites"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_listing_id_key" ON "favorites"("user_id", "listing_id");

-- CreateIndex
CREATE INDEX "property_alerts_user_id_read_at_idx" ON "property_alerts"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "property_alerts_saved_search_id_idx" ON "property_alerts"("saved_search_id");

-- CreateIndex
CREATE INDEX "property_alerts_sent_at_idx" ON "property_alerts"("sent_at");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_transaction_type_idx" ON "transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "transactions_created_by_agent_id_idx" ON "transactions"("created_by_agent_id");

-- CreateIndex
CREATE INDEX "transaction_clients_user_id_idx" ON "transaction_clients"("user_id");

-- CreateIndex
CREATE INDEX "transaction_clients_transaction_id_idx" ON "transaction_clients"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_clients_transaction_id_user_id_key" ON "transaction_clients"("transaction_id", "user_id");

-- CreateIndex
CREATE INDEX "transaction_documents_transaction_id_idx" ON "transaction_documents"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_documents_stage_id_idx" ON "transaction_documents"("stage_id");

-- CreateIndex
CREATE INDEX "transaction_documents_category_idx" ON "transaction_documents"("category");

-- CreateIndex
CREATE UNIQUE INDEX "document_access_links_token_key" ON "document_access_links"("token");

-- CreateIndex
CREATE INDEX "document_access_links_token_idx" ON "document_access_links"("token");

-- CreateIndex
CREATE INDEX "document_access_links_document_id_idx" ON "document_access_links"("document_id");

-- CreateIndex
CREATE INDEX "document_audit_logs_document_id_created_at_idx" ON "document_audit_logs"("document_id", "created_at");

-- CreateIndex
CREATE INDEX "document_audit_logs_user_id_idx" ON "document_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "transaction_stages_transaction_id_display_order_idx" ON "transaction_stages"("transaction_id", "display_order");

-- CreateIndex
CREATE INDEX "checklist_items_stage_id_sort_order_idx" ON "checklist_items"("stage_id", "sort_order");

-- CreateIndex
CREATE INDEX "transaction_forms_transaction_id_idx" ON "transaction_forms"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_forms_stage_id_idx" ON "transaction_forms"("stage_id");

-- CreateIndex
CREATE INDEX "form_submissions_form_id_idx" ON "form_submissions"("form_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_transaction_id_idx" ON "audit_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "mls_listing_photos" ADD CONSTRAINT "mls_listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mls_property_rooms" ADD CONSTRAINT "mls_property_rooms_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mls_open_houses" ADD CONSTRAINT "mls_open_houses_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mls_price_history" ADD CONSTRAINT "mls_price_history_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_alerts" ADD CONSTRAINT "property_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_alerts" ADD CONSTRAINT "property_alerts_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_alerts" ADD CONSTRAINT "property_alerts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "mls_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_clients" ADD CONSTRAINT "transaction_clients_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_clients" ADD CONSTRAINT "transaction_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_documents" ADD CONSTRAINT "transaction_documents_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_documents" ADD CONSTRAINT "transaction_documents_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "transaction_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_links" ADD CONSTRAINT "document_access_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "transaction_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "transaction_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_stages" ADD CONSTRAINT "transaction_stages_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "transaction_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_forms" ADD CONSTRAINT "transaction_forms_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_forms" ADD CONSTRAINT "transaction_forms_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "transaction_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "transaction_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
