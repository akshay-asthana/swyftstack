import { prisma } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  return json(
    await prisma.job.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  );
}
