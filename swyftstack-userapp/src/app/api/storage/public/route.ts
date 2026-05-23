import { prisma, readStorageObject } from "swyftstack-shared";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucketId = url.searchParams.get("bucketId") ?? "";
  const key = url.searchParams.get("key") ?? "";
  const object = await prisma.storageObject.findUnique({
    where: { bucketId_key: { bucketId, key } },
    include: { bucket: true },
  });
  if (!object || !object.isPublic || !object.bucket.isPublic) {
    return new Response("Not found", { status: 404 });
  }
  const result = await readStorageObject(bucketId, key, null);
  return new Response(result.data, {
    headers: { "content-type": object.contentType ?? "application/octet-stream" },
  });
}
