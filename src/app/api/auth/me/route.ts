import { prisma } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";
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

  const response = jsonSuccess({ user });
  // The session token carries approvalStatus for the middleware. When Cory approves a client
  // (or a password change clears mustChangePassword), refresh the token so the client
  // gets in without signing out and back in.
  if (
    auth.user.approvalStatus !== user.approvalStatus ||
    (auth.user.mustChangePassword ?? false) !== user.mustChangePassword
  ) {
    response.cookies.set(
      setSessionCookie(
        createToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          mustChangePassword: user.mustChangePassword,
        })
      )
    );
  }
  return response;
}
