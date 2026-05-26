import {
  prisma,
  readStorageObject,
  uploadStorageObject,
  uuidFromPublicId,
} from "swyftstack-shared";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function canAccess(bucketId: string, userId: string): Promise<boolean> {
  const bucket = await prisma.storageBucket.findUnique({
    where: { id: bucketId },
    include: { project: { include: { members: { where: { userId } } } } },
  });
  return Boolean(bucket?.project.members.length);
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const bucketId = uuidFromPublicId(url.searchParams.get("bucketId") ?? "", "bucket");
  const key = url.searchParams.get("key") ?? "";
  if (!(await canAccess(bucketId, user.id))) return new Response("Not found", { status: 404 });
  const { data, object } = await readStorageObject(bucketId, key, user.id);
  return new Response(data, {
    headers: {
      "content-type": object.contentType ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${object.key.split("/").pop() ?? "download"}"`,
    },
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const bucketId = uuidFromPublicId(url.searchParams.get("bucketId") ?? "", "bucket");
  if (!(await canAccess(bucketId, user.id))) return new Response("Not found", { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return new Response("Missing file", { status: 400 });
  await uploadStorageObject({
    bucketId,
    key: String(form.get("key") ?? file.name),
    data: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || "application/octet-stream",
    actorUserId: user.id,
  });
  return Response.json({ ok: true });
}
