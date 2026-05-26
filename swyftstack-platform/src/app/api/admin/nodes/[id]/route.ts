import {
  prisma,
  nodeDeletionService,
  NodeProtectedError,
  NodeHasWorkloadsError,
} from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

// Safe node deletion (§2). `?force=1` uses the dev-only force path that
// bypasses the protected flag and the workload check.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const node = await prisma.node.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!node) return json({ error: "not found" }, { status: 404 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    if (force) {
      await nodeDeletionService.forceDeleteNodeInDev(params.id, {
        confirm: true,
        actorUserId: a.adminId,
      });
    } else {
      await nodeDeletionService.deleteNode(params.id, a.adminId);
    }
  } catch (e) {
    if (e instanceof NodeProtectedError) {
      return json({ error: e.message }, { status: 409 });
    }
    if (e instanceof NodeHasWorkloadsError) {
      return json({ error: e.message, blocking: e.blocking }, { status: 409 });
    }
    throw e;
  }
  return json({ ok: true });
}
