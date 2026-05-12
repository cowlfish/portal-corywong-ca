-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Add Phase 2 fields to users
ALTER TABLE "users" ADD COLUMN "approval_status" "approval_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "invite_id" TEXT,
ADD COLUMN "reco_acknowledged" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing users as APPROVED so they aren't locked out
UPDATE "users" SET "approval_status" = 'APPROVED' WHERE "approval_status" = 'PENDING';

-- CreateTable: invites
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable: client_groups
CREATE TABLE "client_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: client_group_members
CREATE TABLE "client_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feature_flags
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_approval_status_idx" ON "users"("approval_status");

CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");
CREATE INDEX "invites_token_idx" ON "invites"("token");
CREATE INDEX "invites_created_by_idx" ON "invites"("created_by");

CREATE INDEX "client_groups_agent_id_idx" ON "client_groups"("agent_id");

CREATE UNIQUE INDEX "client_group_members_group_id_user_id_key" ON "client_group_members"("group_id", "user_id");
CREATE INDEX "client_group_members_user_id_idx" ON "client_group_members"("user_id");
CREATE INDEX "client_group_members_group_id_idx" ON "client_group_members"("group_id");

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_group_members" ADD CONSTRAINT "client_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_group_members" ADD CONSTRAINT "client_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default feature flags
INSERT INTO "feature_flags" ("id", "key", "enabled", "label", "updated_at") VALUES
  ('ff_messaging', 'messaging', false, 'Direct Messaging', NOW()),
  ('ff_transactions', 'transaction_management', false, 'Transaction Management', NOW());
