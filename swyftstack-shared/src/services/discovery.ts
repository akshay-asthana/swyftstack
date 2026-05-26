// Node hardware auto-discovery (§2). Establishes a connection, probes the host,
// stores detected hardware on the node + node_hardware_snapshots, and replaces
// node_network_interfaces / node_disk_mounts. Detection failure leaves the node
// out of `active` with a clear discoveryError.
import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import {
  parseDiscovery,
  discoveryIsComplete,
  DISCOVERY_COMMAND,
  type DiscoveredHardware,
} from "../node-discovery.js";
import { isLocalControlPlaneNode } from "./node.js";
import { runNodeProbe } from "./ssh.js";

function execCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 6000 }, (err, stdout) => {
      resolve(err ? "" : stdout.toString().trim());
    });
  });
}

/** Read the stable Linux machine-id (absent on macOS — returns null). */
async function readMachineId(): Promise<string | null> {
  for (const path of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
    try {
      const id = (await fs.readFile(path, "utf8")).trim();
      if (id) return id;
    } catch {
      /* not present on this OS */
    }
  }
  return null;
}

/** Discover the local control-plane host using Node APIs (cross-platform). */
async function discoverLocal(): Promise<DiscoveredHardware> {
  const cpus = os.cpus();
  let diskBytes: bigint | null = null;
  let usedBytes = BigInt(0);
  try {
    const sf = await fs.statfs("/");
    const total = BigInt(sf.bsize) * BigInt(sf.blocks);
    const free = BigInt(sf.bsize) * BigInt(sf.bavail);
    diskBytes = total;
    usedBytes = total - free;
  } catch {
    /* statfs unavailable — leave disk unknown */
  }
  const dockerVersion = await execCapture("docker", ["--version"]);
  const machineId = await readMachineId();

  const ifaces = os.networkInterfaces();
  const interfaces = Object.entries(ifaces)
    .filter(([name]) => name !== "lo" && name !== "lo0")
    .map(([name, addrs]) => {
      const v4 = addrs?.find((a) => a.family === "IPv4");
      const v6 = addrs?.find((a) => a.family === "IPv6");
      return {
        name,
        macAddress: v4?.mac ?? v6?.mac ?? null,
        ipv4: v4?.address ?? null,
        ipv6: v6?.address ?? null,
        isPrimary: Boolean(v4 && !v4.internal),
      };
    });

  return {
    hostname: os.hostname(),
    machineId,
    cpuModel: cpus[0]?.model?.trim() ?? null,
    cpuCores: cpus.length || null,
    cpuThreads: cpus.length || null,
    ramBytes: BigInt(os.totalmem()),
    diskBytes,
    osName: os.type(),
    osVersion: os.release(),
    kernelVersion: os.release(),
    architecture: os.arch(),
    dockerInstalled: Boolean(dockerVersion),
    dockerVersion: dockerVersion || null,
    publicIp: null,
    privateIp: interfaces.find((i) => i.isPrimary)?.ipv4 ?? null,
    uptimeSeconds: BigInt(Math.round(os.uptime())),
    interfaces,
    disks: diskBytes
      ? [{ mountPoint: "/", device: "local", fsType: "local", totalBytes: diskBytes, usedBytes }]
      : [],
  };
}

/** Discover a remote node over SSH using the portable probe. */
async function discoverRemote(nodeId: string): Promise<DiscoveredHardware> {
  const result = await runNodeProbe(nodeId, "discover_hardware", DISCOVERY_COMMAND, {
    updateStatus: false,
  });
  if (!result.ok) {
    throw new Error(result.error || "SSH connection failed during hardware discovery.");
  }
  return parseDiscovery(result.output);
}

async function persistHardware(nodeId: string, hw: DiscoveredHardware) {
  const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });

  await prisma.$transaction(async (tx) => {
    await tx.node.update({
      where: { id: nodeId },
      data: {
        // Capacity is auto-detected; admin overrides are reapplied separately.
        cpuCores: hw.cpuCores ?? Number(node.cpuCores),
        cpuThreads: hw.cpuThreads ?? hw.cpuCores ?? undefined,
        ramBytes: hw.ramBytes ?? node.ramBytes,
        diskBytes: hw.diskBytes ?? node.diskBytes,
        cpuModel: hw.cpuModel ?? undefined,
        osName: hw.osName ?? undefined,
        osVersion: hw.osVersion ?? undefined,
        kernelVersion: hw.kernelVersion ?? undefined,
        architecture: hw.architecture ?? undefined,
        dockerInstalled: hw.dockerInstalled,
        dockerVersion: hw.dockerVersion ?? undefined,
        uptimeSeconds: hw.uptimeSeconds ?? undefined,
        publicIp: hw.publicIp ?? node.publicIp,
        privateIp: hw.privateIp ?? node.privateIp,
        hostname: hw.hostname ?? node.hostname ?? undefined,
        // machine-id is a stable identity signal — record it once detected.
        machineId: hw.machineId ?? node.machineId ?? undefined,
        hardwareDetectedAt: new Date(),
        lastDiscoveredAt: new Date(),
        discoveryStatus: "succeeded",
        discoveryError: null,
      },
    });

    await tx.nodeHardwareSnapshot.create({
      data: {
        nodeId,
        cpuModel: hw.cpuModel,
        cpuCores: hw.cpuCores,
        cpuThreads: hw.cpuThreads,
        ramBytes: hw.ramBytes,
        diskBytes: hw.diskBytes,
        osName: hw.osName,
        osVersion: hw.osVersion,
        kernelVersion: hw.kernelVersion,
        architecture: hw.architecture,
        dockerInstalled: hw.dockerInstalled,
        dockerVersion: hw.dockerVersion,
        publicIp: hw.publicIp,
        privateIp: hw.privateIp,
        uptimeSeconds: hw.uptimeSeconds,
        raw: hw as unknown as object,
      },
    });

    // Interfaces + disks are replaced wholesale on each discovery run.
    await tx.nodeNetworkInterface.deleteMany({ where: { nodeId } });
    if (hw.interfaces.length) {
      await tx.nodeNetworkInterface.createMany({
        data: hw.interfaces.map((i) => ({
          nodeId,
          name: i.name,
          macAddress: i.macAddress,
          ipv4: i.ipv4,
          ipv6: i.ipv6,
          isPrimary: i.isPrimary,
        })),
      });
    }
    await tx.nodeDiskMount.deleteMany({ where: { nodeId } });
    if (hw.disks.length) {
      await tx.nodeDiskMount.createMany({
        data: hw.disks.map((d) => ({
          nodeId,
          mountPoint: d.mountPoint,
          device: d.device,
          fsType: d.fsType,
          totalBytes: d.totalBytes,
          usedBytes: d.usedBytes,
        })),
      });
    }
  });
}

export const discoveryService = {
  /**
   * Run hardware discovery for a node. Returns the detected hardware on
   * success; on failure marks discoveryStatus=failed and rethrows so the
   * onboarding UI can surface a clear error (the node is NOT activated).
   */
  async discoverNode(nodeId: string): Promise<DiscoveredHardware> {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    await prisma.node.update({
      where: { id: nodeId },
      data: { discoveryStatus: "running", discoveryError: null },
    });
    try {
      const hw = isLocalControlPlaneNode(node)
        ? await discoverLocal()
        : await discoverRemote(nodeId);
      if (!discoveryIsComplete(hw)) {
        throw new Error(
          "Connected, but could not detect CPU/RAM. The host may be missing standard tools.",
        );
      }
      await persistHardware(nodeId, hw);
      await audit({
        actorType: "admin",
        action: "node.hardware_discovered",
        targetType: "node",
        targetId: nodeId,
        metadata: { cpuCores: hw.cpuCores, ramBytes: String(hw.ramBytes ?? "") },
      });
      return hw;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.node.update({
        where: { id: nodeId },
        data: { discoveryStatus: "failed", discoveryError: message },
      });
      await audit({
        actorType: "admin",
        action: "node.discovery_failed",
        targetType: "node",
        targetId: nodeId,
        metadata: { error: message },
      });
      throw err;
    }
  },
};
