// Audit + project activity log helpers. Architecture rule: "Every action must
// be logged." Audit logs are append-only (never updated/deleted in code).
import { prisma } from "./db.js";

export type ActorType = "user" | "admin" | "system" | "node_agent";

export interface AuditInput {
  actorUserId?: string | null;
  actorType: ActorType;
  action: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

export async function projectActivity(
  projectId: string,
  action: string,
  actorUserId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await prisma.projectActivityLog.create({
    data: { projectId, action, actorUserId: actorUserId ?? null, metadata: metadata as object },
  });
}
