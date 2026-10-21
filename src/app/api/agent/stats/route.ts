import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { UserRole, ApprovalStatus } from "@/generated/prisma/client";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const [totalClients, pendingApprovals, totalGroups, totalTours, totalSavedSearches, totalFavorites, newShowingRequests] =
    await Promise.all([
      prisma.user.count({ where: { role: UserRole.CLIENT } }),
      prisma.user.count({ where: { role: UserRole.CLIENT, approvalStatus: ApprovalStatus.PENDING } }),
      prisma.clientGroup.count({ where: { agentId: user.userId } }),
      // All tours, not just Cory's own: clients plan tours too
      prisma.tour.count(),
      prisma.savedSearch.count(),
      prisma.favorite.count(),
      prisma.showingRequest.count({ where: { status: "NEW" } }),
    ]);

  return jsonSuccess({
    totalClients,
    pendingApprovals,
    totalGroups,
    totalTours,
    totalSavedSearches,
    totalFavorites,
    newShowingRequests,
  });
}
