import { prisma } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  return json(
    await prisma.auditLog.findMany({
      where: q ? { action: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  );
}
