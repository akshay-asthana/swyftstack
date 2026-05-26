import { redirect } from "next/navigation";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/console";
  return value;
}

async function saveOrganization(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("organizationName") ?? "").trim().replace(/\s+/g, " ");
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!name) redirect(`/onboarding/organization?error=required&next=${encodeURIComponent(next)}`);

  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (org) {
    await prisma.organization.update({ where: { id: org.id }, data: { name } });
  }
  redirect(next);
}

export default async function OrganizationOnboardingPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const user = await requireUser();
  const next = safeNext(searchParams.next);
  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="login-wrap">
      <form className="login signup" action={saveOrganization}>
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Cloud Platform</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "8px 0 16px" }}>
          What should we call your organization?
        </p>
        <input type="hidden" name="next" value={next} />
        <label>Organization name</label>
        <input
          name="organizationName"
          required
          autoFocus
          autoComplete="organization"
          defaultValue={org?.name === "New organization" ? "" : org?.name ?? ""}
          placeholder="Acme"
        />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }}>Continue</button>
        </div>
        {searchParams.error === "required" && <div className="err">Organization name is required.</div>}
        <p className="small auth-foot">Signed in as {user.email}</p>
      </form>
    </div>
  );
}
