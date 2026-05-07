import { prisma } from "./db";

type AuditAction =
  | "TRANSACTION_CREATED"
  | "TRANSACTION_UPDATED"
  | "PARTICIPANT_ADDED"
  | "PARTICIPANT_REMOVED"
  | "STAGE_UPDATED"
  | "CHECKLIST_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_DELETED"
  | "ACCESS_LINK_CREATED"
  | "ACCESS_LINK_REVOKED"
  | "ACCESS_LINK_USED"
  | "FORM_SUBMITTED"
  | "FORM_UPDATED";

interface AuditEntry {
  transactionId?: string;
  documentId?: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logAudit(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      transactionId: entry.transactionId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: (entry.details as object) ?? undefined,
      ipAddress: entry.ipAddress ?? undefined,
    },
  });
}

export async function logDocumentAudit(
  documentId: string,
  userId: string | null,
  action: string,
  ipAddress?: string | null,
  details?: Record<string, unknown>
) {
  return prisma.documentAuditLog.create({
    data: {
      documentId,
      userId,
      action,
      ipAddress: ipAddress ?? undefined,
      details: (details as object) ?? undefined,
    },
  });
}
