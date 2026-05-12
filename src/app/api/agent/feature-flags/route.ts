import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
  });

  return jsonSuccess({ flags });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const { key, enabled } = await req.json();
  if (!key || typeof enabled !== "boolean") {
    return jsonError("key and enabled (boolean) are required", 400);
  }

  const flag = await prisma.featureFlag.update({
    where: { key },
    data: { enabled },
  });

  return jsonSuccess({ flag });
}
