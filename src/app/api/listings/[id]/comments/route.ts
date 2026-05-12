import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }] },
    select: { id: true },
  });
  if (!listing) return jsonError("Listing not found", 404);

  const isAgent = user.role === "AGENT" || user.role === "ADMIN";

  const comments = await prisma.listingComment.findMany({
    where: { listingId: listing.id },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (isAgent) {
    return jsonSuccess({ comments });
  }

  const userGroups = await prisma.clientGroupMember.findMany({
    where: { userId: user.userId },
    select: { groupId: true },
  });
  const userGroupIds = userGroups.map((g) => g.groupId);

  const visible = comments.filter((c) => {
    if (c.authorId === user.userId) return true;

    switch (c.visibility) {
      case "PRIVATE":
        return false;
      case "AGENT":
        return false;
      case "GROUP":
        return userGroupIds.some((gid) => c.visibleToGroups.includes(gid)) ||
          c.visibleToGroups.length === 0 && userGroupIds.length > 0;
      case "PUBLIC":
        return user.approvalStatus === "APPROVED";
      case "SPECIFIC_CLIENTS":
        return c.visibleToUsers.includes(user.userId);
      case "CLIENT_GROUP":
        return c.visibleToGroups.some((gid) => userGroupIds.includes(gid));
      default:
        return false;
    }
  });

  return jsonSuccess({ comments: visible });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (user.approvalStatus !== "APPROVED" && user.role === "CLIENT") {
    return jsonError("Account not approved", 403);
  }

  const { id } = await params;
  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }] },
    select: { id: true },
  });
  if (!listing) return jsonError("Listing not found", 404);

  const { body, visibility, visibleToUsers, visibleToGroups } =
    await request.json();
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return jsonError("Comment body is required", 400);
  }

  const isAgent = user.role === "AGENT" || user.role === "ADMIN";

  const clientVisibilities = ["PRIVATE", "GROUP", "AGENT"];
  const agentVisibilities = ["PUBLIC", "SPECIFIC_CLIENTS", "CLIENT_GROUP"];

  const vis = visibility || (isAgent ? "PUBLIC" : "PRIVATE");

  if (isAgent && !agentVisibilities.includes(vis)) {
    return jsonError(
      `Agent visibility must be one of: ${agentVisibilities.join(", ")}`,
      400
    );
  }
  if (!isAgent && !clientVisibilities.includes(vis)) {
    return jsonError(
      `Client visibility must be one of: ${clientVisibilities.join(", ")}`,
      400
    );
  }

  if (!isAgent && vis === "GROUP") {
    const memberCount = await prisma.clientGroupMember.count({
      where: { userId: user.userId },
    });
    if (memberCount === 0) {
      return jsonError("You must be in a group to use GROUP visibility", 400);
    }
  }

  if (isAgent && vis === "SPECIFIC_CLIENTS") {
    if (!Array.isArray(visibleToUsers) || visibleToUsers.length === 0) {
      return jsonError("visibleToUsers is required for SPECIFIC_CLIENTS", 400);
    }
  }

  if (isAgent && vis === "CLIENT_GROUP") {
    if (!Array.isArray(visibleToGroups) || visibleToGroups.length === 0) {
      return jsonError("visibleToGroups is required for CLIENT_GROUP", 400);
    }
  }

  let resolvedGroups: string[] = visibleToGroups || [];
  if (!isAgent && vis === "GROUP") {
    const memberships = await prisma.clientGroupMember.findMany({
      where: { userId: user.userId },
      select: { groupId: true },
    });
    resolvedGroups = memberships.map((m) => m.groupId);
  }

  const comment = await prisma.listingComment.create({
    data: {
      listingId: listing.id,
      authorId: user.userId,
      body: body.trim(),
      visibility: vis,
      visibleToUsers: visibleToUsers || [],
      visibleToGroups: resolvedGroups,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  return jsonSuccess({ comment }, 201);
}
