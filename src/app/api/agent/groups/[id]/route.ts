import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function PATCH(
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

  const { name } = await req.json();
  if (!name) return jsonError("Name is required", 400);

  const updated = await prisma.clientGroup.update({
    where: { id },
    data: { name },
  });

  return jsonSuccess({ group: updated });
}

export async function DELETE(
  _req: NextRequest,
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

  await prisma.clientGroup.delete({ where: { id } });

  return jsonSuccess({ ok: true });
}
