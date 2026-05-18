import { prisma } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(
    await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, status: true, isPlatformAdmin: true, createdAt: true },
    }),
  );
}
