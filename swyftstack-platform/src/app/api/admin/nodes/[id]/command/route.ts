import { sshNodeService } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function streamEvent(controller: ReadableStreamDefaultController, event: unknown) {
  controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const body = (await req.json().catch(() => ({}))) as { command?: unknown; stream?: unknown };
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (!command || command.length > 1000) {
    return json({ error: "command must be 1-1000 characters" }, { status: 400 });
  }

  if (body.stream === true) {
    const abort = new AbortController();
    req.signal.addEventListener("abort", () => abort.abort(), { once: true });
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (event: unknown) => {
          if (closed) return;
          try {
            streamEvent(controller, event);
          } catch {
            closed = true;
            abort.abort();
          }
        };
        try {
          const result = await sshNodeService.runCommandStream(params.id, command, {
            signal: abort.signal,
            onStdout: (chunk) => send({ type: "stdout", chunk }),
            onStderr: (chunk) => send({ type: "stderr", chunk }),
          });
          send({ type: "exit", result });
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        } finally {
          closed = true;
          try {
            controller.close();
          } catch {
            /* client already disconnected */
          }
        }
      },
      cancel() {
        abort.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return json(await sshNodeService.runCommand(params.id, command));
}
