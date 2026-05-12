import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { nanoid } from "nanoid";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const raw = await prisma.invite.findMany({
    where: { createdBy: user.userId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const invites = raw.map((inv) => ({
    ...inv,
    status: inv.useCount >= inv.maxUses ? "USED" : inv.expiresAt < now ? "EXPIRED" : "ACTIVE",
  }));

  return jsonSuccess({ invites });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));
  const { email } = body as { email?: string };
  const token = nanoid();

  const invite = await prisma.invite.create({
    data: {
      token,
      email: email || null,
      createdBy: user.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/register-invite/${invite.token}`;

  return jsonSuccess({ invite, inviteUrl }, 201);
}
