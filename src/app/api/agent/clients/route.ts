import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { ApprovalStatus, UserRole } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.toUpperCase() as ApprovalStatus | undefined;

  const where: { role: UserRole; approvalStatus?: ApprovalStatus } = { role: UserRole.CLIENT };
  if (status && Object.values(ApprovalStatus).includes(status)) {
    where.approvalStatus = status;
  }

  const clients = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      approvalStatus: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess({ clients });
}
