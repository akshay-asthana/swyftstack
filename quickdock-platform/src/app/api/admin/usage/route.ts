import { prisma } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const orgId = new URL(req.url).searchParams.get("organizationId") ?? undefined;
  return json(
    await prisma.usageRollup.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  );
}
