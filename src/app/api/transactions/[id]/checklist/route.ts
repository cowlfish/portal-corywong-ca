import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, ForbiddenError } from "@/lib/rbac";
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

  const stages = await prisma.transactionStage.findMany({
    where: { transactionId: id },
    orderBy: { displayOrder: "asc" },
    include: {
      checklistItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  const grouped = stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    displayOrder: stage.displayOrder,
    items: stage.checklistItems,
  }));

  return jsonSuccess({ checklist: grouped });
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
    await requireTransactionAccess(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const body = await request.json();
  const { itemId, completed } = body;

  if (!itemId || typeof completed !== "boolean") {
    return jsonError("itemId and completed (boolean) are required", 400);
  }

  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { stage: true },
  });

  if (!item || item.stage.transactionId !== id) {
    return jsonError("Checklist item not found in this transaction", 404);
  }

  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: completed
      ? { completed: true, completedById: user.userId, completedAt: new Date() }
      : { completed: false, completedById: null, completedAt: null },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "CHECKLIST_UPDATED",
    entityType: "ChecklistItem",
    entityId: itemId,
    details: { label: item.label, completed },
    ipAddress: ip,
  });

  return jsonSuccess({ item: updated });
}
