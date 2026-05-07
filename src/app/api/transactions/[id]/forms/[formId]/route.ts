import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, ForbiddenError } from "@/lib/rbac";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id, formId } = await params;

  try {
    await requireTransactionAccess(user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(e.message, 403);
    throw e;
  }

  const form = await prisma.transactionForm.findFirst({
    where: { id: formId, transactionId: id },
    include: {
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!form) {
    return jsonError("Form not found", 404);
  }

  return jsonSuccess({
    form: {
      id: form.id,
      transactionId: form.transactionId,
      stageId: form.stageId,
      title: form.title,
      description: form.description,
      schema: form.schema,
      sortOrder: form.sortOrder,
      latestSubmission: form.submissions[0] ?? null,
    },
  });
}
