import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import crypto from "crypto";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const tours = await prisma.tour.findMany({
    where: { userId: auth.user.userId },
    include: {
      stops: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, address: true, city: true, sortOrder: true, listingId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonSuccess({ tours });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { title, clientName, clientEmail, clientPhone, tourDate, notes } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return jsonError("Title is required", 400);
  }

  const tour = await prisma.tour.create({
    data: {
      userId: auth.user.userId,
      title: title.trim(),
      clientName: clientName || null,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      tourDate: tourDate ? new Date(tourDate) : null,
      notes: notes || null,
      shareToken: crypto.randomBytes(24).toString("base64url"),
    },
    include: { stops: true },
  });

  return jsonSuccess({ tour }, 201);
}
