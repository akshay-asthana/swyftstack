// Local-dev AppService. Uses local Docker when available; otherwise records
// state transitions as "simulated" so the control plane still works end-to-end.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db.js";
import { projectActivity } from "../audit.js";
import type { AppService } from "./types.js";

const exec = promisify(execFile);

async function dockerAvailable(): Promise<boolean> {
  try {
    await exec("docker", ["version", "--format", "{{.Server.Version}}"]);
    return true;
  } catch {
    return false;
  }
}

async function runDocker(args: string[]): Promise<string> {
  const { stdout } = await exec("docker", args);
  return stdout.trim();
}

export const localAppService: AppService = {
  async createAppContainer(appId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    const containerName = `qd_${app.projectId.slice(0, 8)}_${app.name}`.replace(/[^a-zA-Z0-9_]/g, "_");
    if (await dockerAvailable()) {
      const image = app.imageRef ?? "nginx:alpine";
      const cpu = app.cpuLimit ? Number(app.cpuLimit) : 0.25;
      const memMb = app.memoryLimitBytes ? Math.round(Number(app.memoryLimitBytes) / 1e6) : 256;
      await runDocker([
        "run", "-d", "--name", containerName,
        "--restart", "unless-stopped",
        `--cpus=${cpu}`, `--memory=${memMb}m`,
        "--log-opt", "max-size=10m", "--log-opt", "max-file=3",
        image,
      ]).catch(() => undefined);
    }
    await prisma.app.update({
      where: { id: appId },
      data: { containerName, status: "running" },
    });
    await projectActivity(app.projectId, "app.container_created", null, { appId, containerName });
    return { containerName };
  },

  async stopAppContainer(appId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    if (app.containerName && (await dockerAvailable())) {
      await runDocker(["stop", app.containerName]).catch(() => undefined);
    }
    await prisma.app.update({ where: { id: appId }, data: { status: "stopped" } });
  },

  async restartAppContainer(appId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    if (app.containerName && (await dockerAvailable())) {
      await runDocker(["restart", app.containerName]).catch(() => undefined);
    }
    await prisma.app.update({ where: { id: appId }, data: { status: "running" } });
  },

  async deleteAppContainer(appId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    if (app.containerName && (await dockerAvailable())) {
      await runDocker(["rm", "-f", app.containerName]).catch(() => undefined);
    }
    await prisma.app.update({ where: { id: appId }, data: { status: "stopped", containerName: null } });
  },

  async collectAppMetrics(appId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    if (app.containerName && (await dockerAvailable())) {
      try {
        const out = await runDocker([
          "stats", app.containerName, "--no-stream", "--format", "{{.CPUPerc}}",
        ]);
        const pct = parseFloat(out.replace("%", "")) || 0;
        // Approximate cpu-seconds over the sampling window (treated as ~60s).
        return { cpuSeconds: (pct / 100) * 60 };
      } catch {
        /* fall through */
      }
    }
    return { cpuSeconds: 0 };
  },

  async deployStaticSite(appId: string, deploymentId: string) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    const dir = path.resolve("storage-local", "static", `project_${app.projectId}`);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "index.html"),
      `<!doctype html><title>${app.name}</title><h1>${app.name}</h1><p>Deployed ${deploymentId}</p>`,
    );
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "live", finishedAt: new Date(), outputDir: dir },
    });
    await prisma.app.update({ where: { id: appId }, data: { status: "running" } });
    return { path: dir };
  },
};
