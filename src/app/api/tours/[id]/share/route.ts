import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import crypto from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!tour) return jsonError("Tour not found", 404);

  const shareToken = tour.shareToken || crypto.randomBytes(24).toString("base64url");

  if (!tour.shareToken) {
    await prisma.tour.update({
      where: { id },
      data: { shareToken },
    });
  }

  return jsonSuccess({ shareToken, shareUrl: `/tours/share/${shareToken}` });
}
