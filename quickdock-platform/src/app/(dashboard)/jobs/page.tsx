import { revalidatePath } from "next/cache";
import { prisma, retryJob, cancelJob } from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function retry(formData: FormData) {
  "use server";
  await retryJob(String(formData.get("id")));
  revalidatePath("/jobs");
}
async function cancel(formData: FormData) {
  "use server";
  await cancelJob(String(formData.get("id")));
  revalidatePath("/jobs");
}

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <h1 className="h1">Jobs</h1>
      <p className="sub">Postgres-backed queue. Long deploys/backups run in the worker, never in requests.</p>
      <Table
        columns={["Type", "Status", "Attempts", "Run after", "Error", "Actions"]}
        rows={jobs.map((j) => [
          j.type,
          <Badge key="s" status={j.status} />,
          `${j.attempts}/${j.maxAttempts}`,
          j.runAfter.toISOString().slice(11, 19),
          <span key="e" className="small">{j.errorMessage?.slice(0, 60) ?? "—"}</span>,
          <div className="row" key="a">
            {(j.status === "failed" || j.status === "cancelled") && (
              <form action={retry}><input type="hidden" name="id" value={j.id} /><button className="btn secondary">Retry</button></form>
            )}
            {(j.status === "queued" || j.status === "retrying" || j.status === "failed") && (
              <form action={cancel}><input type="hidden" name="id" value={j.id} /><button className="btn danger">Cancel</button></form>
            )}
          </div>,
        ])}
      />
    </>
  );
}
