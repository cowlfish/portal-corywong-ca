import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { UserRole, ApprovalStatus } from "@/generated/prisma/client";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const [totalClients, pendingApprovals, totalGroups, totalTours, totalSavedSearches, totalFavorites] =
    await Promise.all([
      prisma.user.count({ where: { role: UserRole.CLIENT } }),
      prisma.user.count({ where: { role: UserRole.CLIENT, approvalStatus: ApprovalStatus.PENDING } }),
      prisma.clientGroup.count({ where: { agentId: user.userId } }),
      prisma.tour.count({ where: { userId: user.userId } }),
      prisma.savedSearch.count(),
      prisma.favorite.count(),
    ]);

  return jsonSuccess({
    totalClients,
    pendingApprovals,
    totalGroups,
    totalTours,
    totalSavedSearches,
    totalFavorites,
  });
}
