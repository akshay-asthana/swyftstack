import { describe, it, expect } from "vitest";
import { parseDiscovery, discoveryIsComplete } from "../node-discovery.js";

const SAMPLE = `
__QD_HOSTNAME__ web-fsn1-01
__QD_ARCH__ x86_64
__QD_KERNEL__ 6.1.0-18-amd64
__QD_OSNAME__ Debian GNU/Linux
__QD_OSVER__ 12 (bookworm)
__QD_CPU_CORES__ 4
__QD_CPU_THREADS__ 8
__QD_CPU_MODEL__ AMD EPYC 7763 64-Core Processor
__QD_MEM_TOTAL__ 8232000000
__QD_UPTIME__ 184523
__QD_DOCKER__ Docker version 24.0.7, build afdd53b
__QD_PRIVATE_IP__ 10.0.0.5
__QD_PUBLIC_IP__ 203.0.113.10
__QD_DISKS_START__
__QD_DISK__ /dev/sda1 ext4 78000000 24000000 /
__QD_DISK__ tmpfs tmpfs 4000000 100000 /run
__QD_DISKS_END__
__QD_IFACES_START__
__QD_IFACE__ eth0 aa:bb:cc:dd:ee:ff
__QD_IFACE__ lo 00:00:00:00:00:00
__QD_IFACE4__ eth0 203.0.113.10/24
__QD_IFACE6__ eth0 fe80::1/64
__QD_IFACES_END__
`;

describe("parseDiscovery", () => {
  const hw = parseDiscovery(SAMPLE);

  it("detects CPU, RAM and OS", () => {
    expect(hw.cpuCores).toBe(4);
    expect(hw.cpuThreads).toBe(8);
    expect(hw.cpuModel).toContain("EPYC");
    expect(hw.ramBytes).toBe(8232000000n);
    expect(hw.osName).toBe("Debian GNU/Linux");
  });

  it("detects Docker and architecture", () => {
    expect(hw.dockerInstalled).toBe(true);
    expect(hw.dockerVersion).toContain("24.0.7");
    expect(hw.architecture).toBe("x86_64");
  });

  it("uses the root mount for disk capacity and drops pseudo filesystems", () => {
    expect(hw.diskBytes).toBe(78000000n * 1024n);
    expect(hw.disks).toHaveLength(1);
    expect(hw.disks[0].mountPoint).toBe("/");
  });

  it("merges interface MAC/ipv4/ipv6 and drops loopback", () => {
    expect(hw.interfaces).toHaveLength(1);
    expect(hw.interfaces[0]).toMatchObject({
      name: "eth0",
      macAddress: "aa:bb:cc:dd:ee:ff",
      ipv4: "203.0.113.10",
      ipv6: "fe80::1",
      isPrimary: true,
    });
  });

  it("treats missing CPU/RAM as an incomplete discovery", () => {
    expect(discoveryIsComplete(hw)).toBe(true);
    expect(discoveryIsComplete(parseDiscovery("__QD_HOSTNAME__ x"))).toBe(false);
  });
});
