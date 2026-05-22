// Pure node hardware-discovery helpers (§2). No DB import — the orchestration
// that persists results lives in services/discovery.ts.
//
// DISCOVERY_COMMAND is a portable POSIX-sh probe that emits one `__QD_*__`
// line per fact; parseDiscovery turns that text back into a typed struct.

export interface DiscoveredInterface {
  name: string;
  macAddress: string | null;
  ipv4: string | null;
  ipv6: string | null;
  isPrimary: boolean;
}

export interface DiscoveredDisk {
  mountPoint: string;
  device: string | null;
  fsType: string | null;
  totalBytes: bigint;
  usedBytes: bigint;
}

export interface DiscoveredHardware {
  hostname: string | null;
  cpuModel: string | null;
  cpuCores: number | null;
  cpuThreads: number | null;
  ramBytes: bigint | null;
  diskBytes: bigint | null;
  osName: string | null;
  osVersion: string | null;
  kernelVersion: string | null;
  architecture: string | null;
  dockerInstalled: boolean;
  dockerVersion: string | null;
  publicIp: string | null;
  privateIp: string | null;
  uptimeSeconds: bigint | null;
  interfaces: DiscoveredInterface[];
  disks: DiscoveredDisk[];
}

// Pseudo filesystems excluded from the node's primary disk accounting.
const PSEUDO_FS = new Set([
  "tmpfs",
  "devtmpfs",
  "squashfs",
  "overlay",
  "proc",
  "sysfs",
  "cgroup",
  "cgroup2",
  "devpts",
  "none",
]);

/**
 * Linux hardware probe. Every command is guarded so a missing tool never
 * aborts the run; the parser treats absent lines as unknown.
 */
export const DISCOVERY_COMMAND = `
set -u
echo "__QD_HOSTNAME__ $(hostname 2>/dev/null || true)"
echo "__QD_ARCH__ $(uname -m 2>/dev/null || true)"
echo "__QD_KERNEL__ $(uname -r 2>/dev/null || true)"
( . /etc/os-release 2>/dev/null && echo "__QD_OSNAME__ \${NAME:-}" && echo "__QD_OSVER__ \${VERSION:-\${VERSION_ID:-}}" ) || echo "__QD_OSNAME__ $(uname -s 2>/dev/null || true)"
echo "__QD_CPU_CORES__ $(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)"
echo "__QD_CPU_THREADS__ $(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo '')"
echo "__QD_CPU_MODEL__ $(awk -F: '/model name/ {gsub(/^ +/,"",$2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
if [ -r /proc/meminfo ]; then awk '/^MemTotal/ {printf "__QD_MEM_TOTAL__ %.0f\\n", $2*1024}' /proc/meminfo; fi
if [ -r /proc/uptime ]; then awk '{print "__QD_UPTIME__ " int($1)}' /proc/uptime; fi
echo "__QD_DOCKER__ $(docker --version 2>/dev/null || true)"
echo "__QD_PRIVATE_IP__ $(hostname -I 2>/dev/null | awk '{print $1}' || true)"
echo "__QD_PUBLIC_IP__ $(curl -s --max-time 4 https://api.ipify.org 2>/dev/null || true)"
echo "__QD_DISKS_START__"
df -PkT 2>/dev/null | awk 'NR>1 {print "__QD_DISK__ "$1" "$2" "$3" "$4" "$7}'
echo "__QD_DISKS_END__"
echo "__QD_IFACES_START__"
for i in $(ls /sys/class/net 2>/dev/null); do
  echo "__QD_IFACE__ $i $(cat /sys/class/net/$i/address 2>/dev/null || echo -)"
done
ip -o -4 addr show 2>/dev/null | awk '{print "__QD_IFACE4__ "$2" "$4}'
ip -o -6 addr show 2>/dev/null | awk '{print "__QD_IFACE6__ "$2" "$4}'
echo "__QD_IFACES_END__"
`.trim();

function lineValue(prefix: string, output: string): string | null {
  const line = output.split("\n").find((l) => l.startsWith(prefix));
  if (!line) return null;
  const v = line.slice(prefix.length).trim();
  return v.length ? v : null;
}

function intOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function bigOrNull(v: string | null): bigint | null {
  const n = intOrNull(v);
  return n === null ? null : BigInt(n);
}

/** Parse a raw DISCOVERY_COMMAND probe into a DiscoveredHardware struct. */
export function parseDiscovery(output: string): DiscoveredHardware {
  const lines = output.split("\n");

  // --- Disks ---
  const disks: DiscoveredDisk[] = [];
  for (const l of lines) {
    if (!l.startsWith("__QD_DISK__ ")) continue;
    const [device, fsType, blocks, used, ...mountParts] = l.slice(12).trim().split(/\s+/);
    const mountPoint = mountParts.join(" ");
    if (!mountPoint) continue;
    disks.push({
      device: device || null,
      fsType: fsType || null,
      totalBytes: BigInt(Math.round(Number(blocks || 0))) * BigInt(1024),
      usedBytes: BigInt(Math.round(Number(used || 0))) * BigInt(1024),
      mountPoint,
    });
  }
  const realDisks = disks.filter((d) => !PSEUDO_FS.has((d.fsType ?? "").toLowerCase()));
  const rootDisk = realDisks.find((d) => d.mountPoint === "/");
  const diskBytes = rootDisk
    ? rootDisk.totalBytes
    : realDisks.reduce((s, d) => (d.totalBytes > s ? d.totalBytes : s), BigInt(0)) || null;

  // --- Interfaces (merge MAC + ipv4 + ipv6 by name) ---
  const ifaces = new Map<string, DiscoveredInterface>();
  const ensure = (name: string): DiscoveredInterface => {
    let i = ifaces.get(name);
    if (!i) {
      i = { name, macAddress: null, ipv4: null, ipv6: null, isPrimary: false };
      ifaces.set(name, i);
    }
    return i;
  };
  for (const l of lines) {
    if (l.startsWith("__QD_IFACE__ ")) {
      const [name, mac] = l.slice(13).trim().split(/\s+/);
      if (name) ensure(name).macAddress = mac && mac !== "-" ? mac : null;
    } else if (l.startsWith("__QD_IFACE4__ ")) {
      const [name, cidr] = l.slice(14).trim().split(/\s+/);
      if (name) ensure(name).ipv4 = cidr ? cidr.split("/")[0] : null;
    } else if (l.startsWith("__QD_IFACE6__ ")) {
      const [name, cidr] = l.slice(14).trim().split(/\s+/);
      if (name) ensure(name).ipv6 = cidr ? cidr.split("/")[0] : null;
    }
  }
  const interfaces = [...ifaces.values()].filter((i) => i.name !== "lo");
  // Primary = first non-loopback interface that has a routable IPv4.
  const primary = interfaces.find((i) => i.ipv4 && !i.ipv4.startsWith("127."));
  if (primary) primary.isPrimary = true;

  const dockerLine = lineValue("__QD_DOCKER__ ", output);

  return {
    hostname: lineValue("__QD_HOSTNAME__ ", output),
    cpuModel: lineValue("__QD_CPU_MODEL__ ", output),
    cpuCores: intOrNull(lineValue("__QD_CPU_CORES__ ", output)),
    cpuThreads: intOrNull(lineValue("__QD_CPU_THREADS__ ", output)),
    ramBytes: bigOrNull(lineValue("__QD_MEM_TOTAL__ ", output)),
    diskBytes,
    osName: lineValue("__QD_OSNAME__ ", output),
    osVersion: lineValue("__QD_OSVER__ ", output),
    kernelVersion: lineValue("__QD_KERNEL__ ", output),
    architecture: lineValue("__QD_ARCH__ ", output),
    dockerInstalled: Boolean(dockerLine),
    dockerVersion: dockerLine,
    publicIp: lineValue("__QD_PUBLIC_IP__ ", output),
    privateIp: lineValue("__QD_PRIVATE_IP__ ", output),
    uptimeSeconds: bigOrNull(lineValue("__QD_UPTIME__ ", output)),
    interfaces,
    disks: realDisks,
  };
}

/** True when discovery found enough to safely mark a node active. */
export function discoveryIsComplete(hw: DiscoveredHardware): boolean {
  return hw.cpuCores !== null && hw.ramBytes !== null && hw.ramBytes > BigInt(0);
}

/** Human-readable summary of what auto-detection found (or failed to find). */
export function discoverySummary(hw: DiscoveredHardware): string[] {
  const lines = [
    `CPU: ${hw.cpuCores ?? "?"} vCPU${hw.cpuModel ? ` — ${hw.cpuModel}` : ""}`,
    `RAM: ${hw.ramBytes ? `${(Number(hw.ramBytes) / 1024 ** 3).toFixed(1)} GB` : "not detected"}`,
    `Disk: ${hw.diskBytes ? `${(Number(hw.diskBytes) / 1024 ** 3).toFixed(0)} GB` : "not detected"}`,
    `OS: ${hw.osName ?? "?"}${hw.osVersion ? ` ${hw.osVersion}` : ""}`,
    `Docker: ${hw.dockerInstalled ? hw.dockerVersion ?? "installed" : "not installed"}`,
  ];
  return lines;
}
