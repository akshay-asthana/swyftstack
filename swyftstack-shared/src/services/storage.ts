// Object storage entrypoint. Providers are DB-managed (object_storage_providers)
// — there is no global STORAGE_* env config anymore. Resolve a StorageProvider
// bound to a specific bucket's provider, or to the selected provider for a
// project when first creating a bucket.
import { prisma } from "../db.js";
import {
  objectStorageProviderService,
  storageProviderFor,
} from "./object-storage-provider.js";
import type { StorageProvider } from "./types.js";

export { objectStorageProviderService, storageProviderFor };

/** StorageProvider bound to the provider that already backs this bucket. */
export async function storageProviderForBucket(bucketId: string): Promise<StorageProvider> {
  const bucket = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
  if (!bucket.objectStorageProviderId) {
    throw new Error(
      `Storage bucket ${bucketId} has no object_storage_provider assigned. ` +
        `Assign one via the admin Infrastructure page.`,
    );
  }
  return storageProviderFor(bucket.objectStorageProviderId);
}

/** First active object storage provider — used for backup uploads fallback. */
export async function defaultStorageProvider(): Promise<StorageProvider> {
  const list = await objectStorageProviderService.listActiveProviders();
  if (list.length === 0) throw new Error("No active object storage provider configured");
  return storageProviderFor(list[0].id);
}
