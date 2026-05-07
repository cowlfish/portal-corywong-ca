import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAgent, ForbiddenError } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  try {
    await requireTransactionAgent(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const [auditLogs, documentAuditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { transactionId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.documentAuditLog.findMany({
      where: { document: { transactionId: id } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        document: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where: { transactionId: id } }),
  ]);

  const merged = [
    ...auditLogs.map((l) => ({ ...l, source: "transaction" as const })),
    ...documentAuditLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      documentName: l.document.name,
      source: "document" as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
   .slice(0, limit);

  return jsonSuccess({ auditLogs: merged, total });
}
