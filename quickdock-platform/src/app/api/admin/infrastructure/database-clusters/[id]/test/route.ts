import { databaseClusterService } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(await databaseClusterService.testConnection(params.id));
}
