import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getTemplateForType } from "@/data/transaction-templates";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  if (user.role === "AGENT" || user.role === "ADMIN") {
    const transactions = await prisma.transaction.findMany({
      where: { createdByAgentId: user.userId },
      include: {
        clients: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        stages: {
          orderBy: { displayOrder: "asc" },
          include: { checklistItems: true },
        },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = transactions.map((tx) => {
      const totalItems = tx.stages.reduce((sum, s) => sum + s.checklistItems.length, 0);
      const completedItems = tx.stages.reduce(
        (sum, s) => sum + s.checklistItems.filter((i) => i.completed).length,
        0
      );
      const { stages, ...rest } = tx;
      return {
        ...rest,
        stages: stages.map(({ checklistItems, ...stage }) => stage),
        stageProgress: { total: totalItems, completed: completedItems },
      };
    });

    return jsonSuccess({ transactions: result });
  }

  const transactionLinks = await prisma.transactionClient.findMany({
    where: { userId: user.userId },
    include: {
      transaction: {
        include: {
          clients: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          stages: {
            orderBy: { displayOrder: "asc" },
            include: { checklistItems: true },
          },
          _count: { select: { documents: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const transactions = transactionLinks.map((link) => {
    const tx = link.transaction;
    const totalItems = tx.stages.reduce((sum, s) => sum + s.checklistItems.length, 0);
    const completedItems = tx.stages.reduce(
      (sum, s) => sum + s.checklistItems.filter((i) => i.completed).length,
      0
    );
    const { stages, ...rest } = tx;
    return {
      ...rest,
      clientRole: link.role,
      stages: stages.map(({ checklistItems, ...stage }) => stage),
      stageProgress: { total: totalItems, completed: completedItems },
    };
  });

  return jsonSuccess({ transactions });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  if (user.role !== "AGENT" && user.role !== "ADMIN") {
    return jsonError("Only agents can create transactions", 403);
  }

  const body = await request.json();
  const { type, address, mlsNumber, listPrice, notes } = body;

  if (!type || !address) {
    return jsonError("type and address are required", 400);
  }

  const template = getTemplateForType(type);
  if (!template) {
    return jsonError(`Invalid transaction type: ${type}`, 400);
  }

  const ip = (await headers()).get("x-forwarded-for");

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        transactionType: type,
        address,
        mlsNumber: mlsNumber || null,
        listPrice: listPrice || null,
        notes: notes || null,
        createdByAgentId: user.userId,
      },
    });

    for (let stageIdx = 0; stageIdx < template.stages.length; stageIdx++) {
      const stageTemplate = template.stages[stageIdx];
      const stage = await tx.transactionStage.create({
        data: {
          transactionId: created.id,
          name: stageTemplate.name,
          description: stageTemplate.description,
          displayOrder: stageIdx,
        },
      });

      if (stageTemplate.checklist.length > 0) {
        await tx.checklistItem.createMany({
          data: stageTemplate.checklist.map((item, idx) => ({
            stageId: stage.id,
            label: item.label,
            required: item.required,
            sortOrder: idx,
          })),
        });
      }

      for (let formIdx = 0; formIdx < stageTemplate.forms.length; formIdx++) {
        const formTemplate = stageTemplate.forms[formIdx];
        await tx.transactionForm.create({
          data: {
            transactionId: created.id,
            stageId: stage.id,
            title: formTemplate.title,
            description: formTemplate.description || null,
            schema: formTemplate.fields as any,
            sortOrder: formIdx,
          },
        });
      }
    }

    return tx.transaction.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        stages: {
          orderBy: { displayOrder: "asc" },
          include: {
            checklistItems: { orderBy: { sortOrder: "asc" } },
            forms: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
  });

  await logAudit({
    userId: user.userId,
    transactionId: transaction.id,
    action: "TRANSACTION_CREATED",
    entityType: "Transaction",
    entityId: transaction.id,
    details: { type, address },
    ipAddress: ip,
  });

  return jsonSuccess({ transaction }, 201);
}
