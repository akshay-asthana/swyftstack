import { localNodeService } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  await localNodeService.drain(params.id);
  return json({ ok: true, nodeId: params.id, status: "draining" });
}
