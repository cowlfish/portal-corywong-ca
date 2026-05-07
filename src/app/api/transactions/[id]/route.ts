import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, requireTransactionAgent, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

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

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { displayOrder: "asc" },
        include: {
          checklistItems: { orderBy: { sortOrder: "asc" } },
          forms: { orderBy: { sortOrder: "asc" } },
        },
      },
      documents: {
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
      },
      clients: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!transaction) {
    return jsonError("Transaction not found", 404);
  }

  return jsonSuccess({ transaction });
}

export async function PATCH(
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

  const body = await request.json();
  const allowedFields = ["status", "address", "closingDate", "conditionDate", "salePrice", "notes"];
  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "TRANSACTION_UPDATED",
    entityType: "Transaction",
    entityId: id,
    details: { updatedFields: Object.keys(data) },
    ipAddress: ip,
  });

  return jsonSuccess({ transaction });
}
