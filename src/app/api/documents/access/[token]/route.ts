import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { decryptFile } from "@/lib/encryption";
import { logDocumentAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.documentAccessLink.findUnique({
    where: { token },
    include: { document: true },
  });

  if (!link) {
    return jsonError("Invalid access link", 404);
  }

  if (link.revokedAt) {
    return jsonError("This access link has been revoked", 403);
  }

  if (new Date() > link.expiresAt) {
    return jsonError("This access link has expired", 403);
  }

  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
    return jsonError("Download limit reached for this access link", 403);
  }

  const document = link.document;
  const decrypted = await decryptFile(document.storagePath, document.encryptionIv);

  await prisma.documentAccessLink.update({
    where: { id: link.id },
    data: { downloadCount: { increment: 1 } },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logDocumentAudit(document.id, null, "ACCESS_LINK_USED", ip, {
    linkId: link.id,
    downloadCount: link.downloadCount + 1,
  });

  return new NextResponse(new Uint8Array(decrypted), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}"`,
      "Content-Length": decrypted.length.toString(),
    },
  });
}
