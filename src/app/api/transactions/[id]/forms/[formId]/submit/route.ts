import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { requireTransactionAccess, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
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
  });

  if (!form) {
    return jsonError("Form not found", 404);
  }

  const body = await request.json();
  const { data } = body;

  if (!data || typeof data !== "object") {
    return jsonError("data object is required", 400);
  }

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      data,
      submittedById: user.userId,
    },
  });

  const ip = (await headers()).get("x-forwarded-for");
  await logAudit({
    userId: user.userId,
    transactionId: id,
    action: "FORM_SUBMITTED",
    entityType: "FormSubmission",
    entityId: submission.id,
    details: { formTitle: form.title },
    ipAddress: ip,
  });

  return jsonSuccess({ submission }, 201);
}
