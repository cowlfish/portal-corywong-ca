import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, firstName, lastName, phone } = body;

  if (!email || !password || !firstName || !lastName) {
    return jsonError("Email, password, first name, and last name are required", 400);
  }

  if (password.length < 8) {
    return jsonError("Password must be at least 8 characters", 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return jsonError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
    },
  });

  const token = createToken({ userId: user.id, email: user.email, role: user.role });

  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    },
    { status: 201 }
  );

  response.cookies.set(setSessionCookie(token));
  return response;
}
