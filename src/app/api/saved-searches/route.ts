import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const searches = await prisma.savedSearch.findMany({
    where: { userId: auth.user.userId },
    orderBy: { updatedAt: "desc" },
  });

  return jsonSuccess({ searches });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { name, criteria, alertEnabled, alertFrequency } = body;

  if (!name || !criteria) {
    return jsonError("Name and criteria are required", 400);
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: auth.user.userId,
      name,
      criteria,
      alertEnabled: alertEnabled ?? false,
      alertFrequency: alertFrequency ?? "DAILY",
    },
  });

  return jsonSuccess({ search }, 201);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Search ID is required", 400);

  const search = await prisma.savedSearch.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!search) return jsonError("Search not found", 404);

  await prisma.savedSearch.delete({ where: { id } });
  return jsonSuccess({ ok: true });
}
