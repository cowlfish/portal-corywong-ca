import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const groupId = url.searchParams.get("groupId");
  const listingId = url.searchParams.get("listingId");

  const where: Prisma.ListingCommentWhereInput = {};

  if (clientId) where.authorId = clientId;
  if (listingId) where.listingId = listingId;
  if (groupId) where.visibleToGroups = { has: groupId };

  const comments = await prisma.listingComment.findMany({
    where,
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      listing: {
        select: {
          id: true,
          mlsNumber: true,
          streetNumber: true,
          streetName: true,
          city: true,
          listPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonSuccess({ comments });
}
