import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAgent, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id, docId } = await params;

  try {
    await requireTransactionAgent(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const document = await prisma.transactionDocument.findFirst({
    where: { id: docId, transactionId: id },
  });

  if (!document) {
    return jsonError("Document not found", 404);
  }

  const body = await request.json();
  const expiresInHours = body.expiresInHours ?? 24;
  const maxDownloads = body.maxDownloads ?? null;

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const link = await prisma.documentAccessLink.create({
    data: {
      documentId: docId,
      token,
      expiresAt,
      createdById: user.userId,
      maxDownloads,
    },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "ACCESS_LINK_CREATED",
    entityType: "DocumentAccessLink",
    entityId: link.id,
    details: { documentId: docId, expiresInHours, maxDownloads },
    ipAddress: ip,
  });

  return jsonSuccess({ link: { id: link.id, token: link.token, expiresAt: link.expiresAt, maxDownloads: link.maxDownloads } }, 201);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id, docId } = await params;

  try {
    await requireTransactionAgent(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const body = await request.json();
  const { linkId } = body;

  if (!linkId) {
    return jsonError("linkId is required", 400);
  }

  const link = await prisma.documentAccessLink.findFirst({
    where: { id: linkId, documentId: docId },
  });

  if (!link) {
    return jsonError("Access link not found", 404);
  }

  await prisma.documentAccessLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "ACCESS_LINK_REVOKED",
    entityType: "DocumentAccessLink",
    entityId: linkId,
    details: { documentId: docId },
    ipAddress: ip,
  });

  return jsonSuccess({ revoked: true });
}
