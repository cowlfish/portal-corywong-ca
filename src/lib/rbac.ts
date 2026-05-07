import { prisma } from "./db";
import { JwtPayload } from "./auth";

export async function canAccessTransaction(
  user: JwtPayload,
  transactionId: string
): Promise<boolean> {
  if (user.role === "AGENT" || user.role === "ADMIN") {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, createdByAgentId: user.userId },
    });
    if (tx) return true;
  }

  const link = await prisma.transactionClient.findUnique({
    where: {
      transactionId_userId: { transactionId, userId: user.userId },
    },
  });

  return !!link;
}

export async function isTransactionAgent(
  user: JwtPayload,
  transactionId: string
): Promise<boolean> {
  if (user.role !== "AGENT" && user.role !== "ADMIN") return false;
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, createdByAgentId: user.userId },
  });
  return !!tx;
}

export async function requireTransactionAccess(
  user: JwtPayload,
  transactionId: string
): Promise<void> {
  const allowed = await canAccessTransaction(user, transactionId);
  if (!allowed) {
    throw new ForbiddenError("You do not have access to this transaction");
  }
}

export async function requireTransactionAgent(
  user: JwtPayload,
  transactionId: string
): Promise<void> {
  const allowed = await isTransactionAgent(user, transactionId);
  if (!allowed) {
    throw new ForbiddenError("Only the owning agent can perform this action");
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
