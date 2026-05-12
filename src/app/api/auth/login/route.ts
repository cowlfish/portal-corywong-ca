import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return jsonError("Email and password are required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    return jsonError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return jsonError("Invalid email or password", 401);
  }

  if (user.approvalStatus === "REJECTED") {
    return jsonError("Your account has been rejected. Please contact the agent.", 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = createToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    mustChangePassword: user.mustChangePassword,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      approvalStatus: user.approvalStatus,
      mustChangePassword: user.mustChangePassword,
    },
  });

  response.cookies.set(setSessionCookie(token));
  return response;
}
