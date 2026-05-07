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

  const participants = await prisma.transactionClient.findMany({
    where: { transactionId: id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
    orderBy: { addedAt: "asc" },
  });

  return jsonSuccess({ participants });
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
    await requireTransactionAgent(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return jsonError("userId and role are required", 400);
  }

  const validRoles = ["PRIMARY", "SECONDARY", "OBSERVER"];
  if (!validRoles.includes(role)) {
    return jsonError(`role must be one of: ${validRoles.join(", ")}`, 400);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return jsonError("User not found", 404);
  }

  const existing = await prisma.transactionClient.findUnique({
    where: { transactionId_userId: { transactionId: id, userId } },
  });
  if (existing) {
    return jsonError("User is already a participant", 409);
  }

  const participant = await prisma.transactionClient.create({
    data: { transactionId: id, userId, role },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "PARTICIPANT_ADDED",
    entityType: "TransactionClient",
    entityId: participant.id,
    details: { addedUserId: userId, role },
    ipAddress: ip,
  });

  return jsonSuccess({ participant }, 201);
}

export async function DELETE(
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
  const { userId } = body;

  if (!userId) {
    return jsonError("userId is required", 400);
  }

  const link = await prisma.transactionClient.findUnique({
    where: { transactionId_userId: { transactionId: id, userId } },
  });

  if (!link) {
    return jsonError("Participant not found", 404);
  }

  await prisma.transactionClient.delete({ where: { id: link.id } });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "PARTICIPANT_REMOVED",
    entityType: "TransactionClient",
    entityId: link.id,
    details: { removedUserId: userId },
    ipAddress: ip,
  });

  return jsonSuccess({ removed: true });
}
