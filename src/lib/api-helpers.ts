import { NextResponse } from "next/server";
import { getSessionUser, JwtPayload } from "./auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function requireAuth(): Promise<
  { user: JwtPayload; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return { error: jsonError("Unauthorized", 401) };
  }
  return { user };
}
