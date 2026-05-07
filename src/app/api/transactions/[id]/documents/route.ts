import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, ForbiddenError } from "@/lib/rbac";
import { encryptAndStore } from "@/lib/encryption";
import { logAudit, logDocumentAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  try {
    await requireTransactionAccess(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const documents = await prisma.transactionDocument.findMany({
    where: { transactionId: id },
    select: {
      id: true,
      transactionId: true,
      stageId: true,
      name: true,
      category: true,
      fileSize: true,
      mimeType: true,
      uploadedById: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess({ documents });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  try {
    await requireTransactionAccess(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const stageId = formData.get("stageId") as string | null;
  const category = (formData.get("category") as string) || "general";

  if (!file) {
    return jsonError("file is required", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storagePath, iv } = await encryptAndStore(buffer, id, file.name);

  const document = await prisma.transactionDocument.create({
    data: {
      transactionId: id,
      stageId: stageId || null,
      name: file.name,
      category,
      storagePath,
      encryptionIv: iv,
      fileSize: buffer.length,
      mimeType: file.type || null,
      uploadedById: user.userId,
    },
  });

  const ip = (await headers()).get("x-forwarded-for");

  await Promise.all([
    logAudit({
      userId: user.userId,
      transactionId: id,
      action: "DOCUMENT_UPLOADED",
      entityType: "TransactionDocument",
      entityId: document.id,
      details: { name: file.name, category, fileSize: buffer.length },
      ipAddress: ip,
    }),
    logDocumentAudit(document.id, user.userId, "DOCUMENT_UPLOADED", ip, {
      name: file.name,
      category,
      fileSize: buffer.length,
    }),
  ]);

  return jsonSuccess({
    document: {
      id: document.id,
      transactionId: document.transactionId,
      stageId: document.stageId,
      name: document.name,
      category: document.category,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedById: document.uploadedById,
      createdAt: document.createdAt,
    },
  }, 201);
}
