// Backup state machine. Enforces architecture rule:
// "Never delete the old backup before the new one is verified."
// Pure logic — no DB.

export type BackupStatus =
  | "pending"
  | "running"
  | "uploading"
  | "verified"
  | "failed"
  | "expired";

const TRANSITIONS: Record<BackupStatus, BackupStatus[]> = {
  pending: ["running", "failed"],
  running: ["uploading", "failed"],
  uploading: ["verified", "failed"],
  verified: ["expired"],
  failed: ["pending"], // retry
  expired: [],
};

export function canTransition(from: BackupStatus, to: BackupStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: BackupStatus, to: BackupStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal backup transition: ${from} -> ${to}`);
  }
}

/**
 * Decide which old backups may be deleted. A previous backup is only eligible
 * once at least one NEWER backup has reached "verified".
 */
export function backupsSafeToDelete<T extends { id: string; status: BackupStatus; createdAt: Date }>(
  backups: T[],
  retentionCount: number,
): T[] {
  const verified = backups
    .filter((b) => b.status === "verified")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (verified.length === 0) return []; // nothing verified yet -> keep everything
  // Keep the newest `retentionCount` verified backups; the rest are deletable.
  return verified.slice(retentionCount);
}
