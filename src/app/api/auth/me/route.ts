import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      mfaEnabled: true,
      emailVerified: true,
      approvalStatus: true,
      recoAcknowledged: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  if (!user) return jsonError("User not found", 404);
  return jsonSuccess({ user });
}
