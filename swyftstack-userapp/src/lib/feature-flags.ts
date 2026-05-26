// Feature gates that depend on per-organization flags.
//
// `enableAppDeployment` controls whether app deployment + vCPU-hour metering
// is exposed to a customer in the console. Off by default; platform admins
// turn it on per-org from the Organizations admin page.

import { prisma } from "swyftstack-shared";

/**
 * Does the given user belong to (own or be a member of) any organization
 * with `enableAppDeployment = true`? Used to decide whether to render
 * app-deployment UI, vCPU stats, and the runtime/build usage rows.
 */
export async function userHasAppDeployment(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const org = await prisma.organization.findFirst({
    where: {
      enableAppDeployment: true,
      status: { not: "deleted" },
      OR: [
        { ownerUserId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return !!org;
}

/** Does this specific org have app deployment turned on? */
export async function orgHasAppDeployment(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { enableAppDeployment: true },
  });
  return !!org?.enableAppDeployment;
}
