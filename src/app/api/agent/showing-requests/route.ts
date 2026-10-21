import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { ShowingRequestStatus } from "@/generated/prisma/client";

const STATUSES = Object.values(ShowingRequestStatus);

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const status = req.nextUrl.searchParams.get("status");
  const requests = await prisma.showingRequest.findMany({
    where: status && STATUSES.includes(status as ShowingRequestStatus) ? { status: status as ShowingRequestStatus } : {},
    include: {
      listing: {
        select: {
          id: true,
          mlsNumber: true,
          unitNumber: true,
          streetNumber: true,
          streetName: true,
          city: true,
          listPrice: true,
          status: true,
        },
      },
      user: { select: { id: true, approvalStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return jsonSuccess({ requests });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { id, status, agentNotes } = await req.json();
  if (!id || typeof id !== "string") return jsonError("id is required", 400);
  if (status !== undefined && !STATUSES.includes(status)) {
    return jsonError(`status must be one of: ${STATUSES.join(", ")}`, 400);
  }

  const updated = await prisma.showingRequest.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(typeof agentNotes === "string" && { agentNotes: agentNotes.slice(0, 4000) }),
    },
  });

  return jsonSuccess({ request: updated });
}
