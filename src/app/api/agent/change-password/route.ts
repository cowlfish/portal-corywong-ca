import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  hashPassword,
  createToken,
  setSessionCookie,
} from "@/lib/auth";
import { requireAuth, jsonError, jsonSuccess } from "@/lib/api-helpers";

const MIN_PASSWORD_LENGTH = 12;

export async function POST(req: NextRequest) {
  const { user: sessionUser, error } = await requireAuth();
  if (error) return error;
  if (sessionUser.role !== "AGENT" && sessionUser.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return jsonError("Current password and new password are required", 400);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return jsonError(
      `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { id: true, email: true, role: true, passwordHash: true, approvalStatus: true },
  });

  if (!user) {
    return jsonError("User not found", 404);
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return jsonError("Current password is incorrect", 401);
  }

  if (currentPassword === newPassword) {
    return jsonError("New password must differ from current password", 400);
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  const token = createToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    mustChangePassword: false,
  });

  const response = jsonSuccess({ message: "Password changed successfully" });
  response.cookies.set(setSessionCookie(token));
  return response;
}
