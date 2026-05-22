import { sshNodeService } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const body = (await req.json().catch(() => ({}))) as { command?: unknown };
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (!command || command.length > 1000) {
    return json({ error: "command must be 1-1000 characters" }, { status: 400 });
  }

  return json(await sshNodeService.runCommand(params.id, command));
}
