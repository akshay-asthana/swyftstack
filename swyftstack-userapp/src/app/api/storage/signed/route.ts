import {
  readStorageObject,
  uploadStorageObject,
  verifySignedStorageUrl,
  uuidFromPublicId,
} from "swyftstack-shared";

export const dynamic = "force-dynamic";

function params(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") === "upload" ? "upload" : "download";
  return {
    bucketId: url.searchParams.get("bucketId") ?? "",
    key: url.searchParams.get("key") ?? "",
    action,
    expires: url.searchParams.get("expires") ?? "",
    sig: url.searchParams.get("sig") ?? "",
  } as const;
}

export async function GET(req: Request) {
  const p = params(req);
  if (p.action !== "download" || !verifySignedStorageUrl(p)) {
    return new Response("Invalid signed URL", { status: 403 });
  }
  const bucketId = uuidFromPublicId(p.bucketId, "bucket");
  const { data, object } = await readStorageObject(bucketId, p.key, null);
  return new Response(data, {
    headers: {
      "content-type": object.contentType ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${object.key.split("/").pop() ?? "download"}"`,
    },
  });
}

export async function PUT(req: Request) {
  const p = params(req);
  if (p.action !== "upload" || !verifySignedStorageUrl(p)) {
    return new Response("Invalid signed URL", { status: 403 });
  }
  const data = Buffer.from(await req.arrayBuffer());
  await uploadStorageObject({
    bucketId: uuidFromPublicId(p.bucketId, "bucket"),
    key: p.key,
    data,
    contentType: req.headers.get("content-type") ?? "application/octet-stream",
  });
  return Response.json({ ok: true });
}
