import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id, stopId } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!tour) return jsonError("Tour not found", 404);

  const existing = await prisma.tourStop.findFirst({
    where: { id: stopId, tourId: id },
  });
  if (!existing) return jsonError("Stop not found", 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.scheduledTime !== undefined) data.scheduledTime = body.scheduledTime ? new Date(body.scheduledTime) : null;
  if (body.duration !== undefined) data.duration = body.duration;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.address !== undefined) data.address = body.address;
  if (body.city !== undefined) data.city = body.city;

  const stop = await prisma.tourStop.update({
    where: { id: stopId },
    data,
  });

  return jsonSuccess({ stop });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id, stopId } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!tour) return jsonError("Tour not found", 404);

  await prisma.tourStop.delete({ where: { id: stopId } });
  return jsonSuccess({ ok: true });
}
