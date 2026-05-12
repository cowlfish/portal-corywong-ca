import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const groups = await prisma.clientGroup.findMany({
    where: { agentId: user.userId },
    include: {
      members: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess({ groups });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { name, memberIds } = await req.json();
  if (!name) return jsonError("Name is required", 400);

  const uniqueIds = new Set<string>(memberIds || []);
  uniqueIds.add(user.userId);

  const group = await prisma.clientGroup.create({
    data: {
      name,
      agentId: user.userId,
      members: {
        create: Array.from(uniqueIds).map((userId) => ({ userId })),
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  return jsonSuccess({ group }, 201);
}
