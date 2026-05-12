import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
    include: {
      stops: { orderBy: { sortOrder: "asc" } },
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!tour) return jsonError("Tour not found", 404);
  return jsonSuccess({ tour });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!existing) return jsonError("Tour not found", 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.clientName !== undefined) data.clientName = body.clientName || null;
  if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail || null;
  if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone || null;
  if (body.tourDate !== undefined) data.tourDate = body.tourDate ? new Date(body.tourDate) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.status !== undefined) {
    const valid = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (!valid.includes(body.status)) return jsonError("Invalid status", 400);
    data.status = body.status;
  }

  const tour = await prisma.tour.update({
    where: { id },
    data,
    include: { stops: { orderBy: { sortOrder: "asc" } } },
  });

  return jsonSuccess({ tour });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!existing) return jsonError("Tour not found", 404);

  await prisma.tour.delete({ where: { id } });
  return jsonSuccess({ ok: true });
}
