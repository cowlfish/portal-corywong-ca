import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSuccess } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    return jsonSuccess({ valid: false, reason: "Invite not found" });
  }

  if (invite.expiresAt < new Date()) {
    return jsonSuccess({ valid: false, reason: "Invite has expired" });
  }

  if (invite.useCount >= invite.maxUses) {
    return jsonSuccess({ valid: false, reason: "Invite has been used" });
  }

  return jsonSuccess({ valid: true, email: invite.email });
}
