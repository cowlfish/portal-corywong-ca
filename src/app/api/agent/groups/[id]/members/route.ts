import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { id } = await params;
  const group = await prisma.clientGroup.findUnique({ where: { id } });
  if (!group) return jsonError("Group not found", 404);
  if (group.agentId !== user.userId) return jsonError("Forbidden", 403);

  const { userId } = await req.json();
  if (!userId) return jsonError("userId is required", 400);

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return jsonError("User not found", 404);

  const member = await prisma.clientGroupMember.create({
    data: { groupId: id, userId },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return jsonSuccess({ member }, 201);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { id } = await params;
  const group = await prisma.clientGroup.findUnique({ where: { id } });
  if (!group) return jsonError("Group not found", 404);
  if (group.agentId !== user.userId) return jsonError("Forbidden", 403);

  const { userId } = await req.json();
  if (!userId) return jsonError("userId is required", 400);
  if (userId === user.userId) return jsonError("Cannot remove the agent from the group", 400);

  await prisma.clientGroupMember.deleteMany({
    where: { groupId: id, userId },
  });

  return jsonSuccess({ ok: true });
}
