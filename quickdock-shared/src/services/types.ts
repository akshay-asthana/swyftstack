// Service-layer contracts. The MVP ships local-dev implementations, but every
// signature is written as if a remote node-agent will fulfil it later.

export interface NodeMetricsSample {
  cpuUsagePercent: number;
  ramUsedBytes: number;
  diskUsedBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

export interface NodeService {
  collectMetrics(nodeId: string): Promise<NodeMetricsSample>;
  recordHeartbeat(nodeId: string, agentVersion?: string): Promise<void>;
  reconcileHealth(): Promise<void>; // mark degraded/offline on missed heartbeats
  drain(nodeId: string): Promise<void>;
  disable(nodeId: string): Promise<void>;
}

export interface AppService {
  createAppContainer(appId: string): Promise<{ containerName: string }>;
  stopAppContainer(appId: string): Promise<void>;
  restartAppContainer(appId: string): Promise<void>;
  deleteAppContainer(appId: string): Promise<void>;
  collectAppMetrics(appId: string): Promise<{ cpuSeconds: number }>;
  deployStaticSite(appId: string, deploymentId: string): Promise<{ path: string }>;
}

export interface DatabaseService {
  createProjectDatabase(databaseId: string): Promise<void>;
  rotateDatabasePassword(databaseId: string): Promise<{ newPasswordEncrypted: string }>;
  getDatabaseSize(databaseId: string): Promise<number>;
  suspendDatabase(databaseId: string): Promise<void>;
  deleteDatabase(databaseId: string): Promise<void>;
  runDatabaseBackup(databaseId: string): Promise<string>; // returns backupId
  restoreDatabaseBackup(backupId: string): Promise<void>;
  /** §10 isolation test: returns true when cross-tenant access is correctly denied. */
  verifyIsolation(databaseAId: string, databaseBId: string): Promise<boolean>;
}

export interface StorageProvider {
  readonly kind: "local_dev" | "b2" | "r2" | "hetzner";
  createBucketOrPrefix(bucketId: string): Promise<void>;
  createCredentials(bucketId: string): Promise<{ accessKey: string; secretKey: string }>;
  rotateCredentials(bucketId: string): Promise<{ accessKey: string; secretKey: string }>;
  getUsage(bucketId: string): Promise<{ storageBytes: number; egressBytes: number }>;
  suspendBucket(bucketId: string): Promise<void>;
  deleteBucket(bucketId: string): Promise<void>;
  uploadBackup(localPath: string, remotePath: string): Promise<{ size: number; checksum: string }>;
  verifyObject(remotePath: string, expectedChecksum: string): Promise<boolean>;
}

export interface BackupService {
  runDatabaseBackup(databaseId: string): Promise<string>;
  runControlPlaneBackup(): Promise<string>;
  expireOldBackups(): Promise<number>;
}

export interface MigrationService {
  moveApp(appId: string, targetNodeId: string, createdBy?: string): Promise<string>;
  moveDatabase(databaseId: string, targetNodeId: string, createdBy?: string): Promise<string>;
  moveStaticSite(appId: string, targetNodeId: string, createdBy?: string): Promise<string>;
  moveProject(projectId: string, targetNodeId: string, createdBy?: string): Promise<string>;
  runMigration(migrationId: string): Promise<void>;
}
