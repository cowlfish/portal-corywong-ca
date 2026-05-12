import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { ApprovalStatus, UserRole } from "@/generated/prisma/client";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const pending = await prisma.user.findMany({
    where: { approvalStatus: ApprovalStatus.PENDING, role: UserRole.CLIENT },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      approvalStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess({ pending });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { userId, action } = await req.json();
  if (!userId || !action) return jsonError("userId and action are required", 400);
  if (action !== "approve" && action !== "reject") {
    return jsonError("action must be 'approve' or 'reject'", 400);
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return jsonError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: action === "approve" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      ...(action === "approve" ? { isActive: true } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      approvalStatus: true,
      isActive: true,
    },
  });

  return jsonSuccess({ user: updated });
}
