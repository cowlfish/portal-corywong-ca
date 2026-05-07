import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, requireTransactionAgent, ForbiddenError } from "@/lib/rbac";
import { decryptFile, deleteEncryptedFile } from "@/lib/encryption";
import { logAudit, logDocumentAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id, docId } = await params;

  try {
    await requireTransactionAccess(user, id);
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

  const decrypted = await decryptFile(document.storagePath, document.encryptionIv);

  const ip = (await headers()).get("x-forwarded-for");
  await logDocumentAudit(document.id, user.userId, "DOCUMENT_DOWNLOADED", ip);

  return new NextResponse(new Uint8Array(decrypted), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}"`,
      "Content-Length": decrypted.length.toString(),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
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

  await deleteEncryptedFile(document.storagePath);
  await prisma.transactionDocument.delete({ where: { id: docId } });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "DOCUMENT_DELETED",
    entityType: "TransactionDocument",
    entityId: docId,
    details: { name: document.name },
    ipAddress: ip,
  });

  return jsonSuccess({ deleted: true });
}
