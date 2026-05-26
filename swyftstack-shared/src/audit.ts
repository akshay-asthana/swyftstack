// Audit + project activity log helpers. Architecture rule: "Every action must
// be logged." Audit logs are append-only (never updated/deleted in code).
import { prisma } from "./db.js";
import { formatPublicId, isUuid, type PublicIdType } from "./public-ids.js";

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

const METADATA_PUBLIC_ID_TYPES: Record<string, PublicIdType> = {
  appId: "app",
  bucketId: "bucket",
  databaseId: "database",
  deploymentId: "deployment",
  nodeId: "node",
  buildNodeId: "node",
  runtimeNodeId: "node",
  organizationId: "organization",
  orgId: "organization",
  projectId: "project",
  userId: "user",
};

function publicMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => {
    const type = METADATA_PUBLIC_ID_TYPES[key];
    if (type && typeof value === "string" && isUuid(value)) {
      return [key, formatPublicId(type, value)];
    }
    return [key, value];
  }));
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
      metadata: publicMetadata(input.metadata ?? {}) as object,
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
    data: { projectId, action, actorUserId: actorUserId ?? null, metadata: publicMetadata(metadata) as object },
  });
}
