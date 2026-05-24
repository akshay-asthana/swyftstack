// CMS image upload endpoint. Writes to the platform bucket at
// /<prefix>/marketing_data/{year}/{month}/{uuid}-{filename}. Returns a long-
// lived signed URL that the TipTap editor inlines as an <img src>.
//
// Admin-only — anonymous callers can't probe the upload pipeline.
import { platformBucketService, PlatformBucketNotConfiguredError } from "swyftstack-shared";
import { currentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return new Response("Missing file", { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return new Response("File too large (max 25 MB)", { status: 413 });
  }
  if (!/^image\//i.test(file.type)) {
    return new Response("Only image uploads are supported here", { status: 415 });
  }
  try {
    const { key, url } = await platformBucketService.uploadMarketingAsset({
      filename: file.name || "image",
      data: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      actorUserId: admin.id,
    });
    return Response.json({ key, url });
  } catch (e) {
    if (e instanceof PlatformBucketNotConfiguredError) {
      return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
