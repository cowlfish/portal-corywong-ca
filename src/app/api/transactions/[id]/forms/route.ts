import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, ForbiddenError } from "@/lib/rbac";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  try {
    await requireTransactionAccess(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const forms = await prisma.transactionForm.findMany({
    where: { transactionId: id },
    orderBy: { sortOrder: "asc" },
    include: {
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          submittedById: true,
          submittedAt: true,
        },
      },
    },
  });

  const result = forms.map((form) => ({
    id: form.id,
    transactionId: form.transactionId,
    stageId: form.stageId,
    title: form.title,
    description: form.description,
    sortOrder: form.sortOrder,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    hasSubmission: form.submissions.length > 0,
    latestSubmission: form.submissions[0] ?? null,
  }));

  return jsonSuccess({ forms: result });
}
