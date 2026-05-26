import { describe, expect, it } from "vitest";
import { normalizeSshPrivateKey } from "../ssh-key.js";

describe("normalizeSshPrivateKey", () => {
  const key = [
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA=",
    "-----END OPENSSH PRIVATE KEY-----",
  ].join("\n");

  it("accepts multiline OpenSSH private keys", () => {
    expect(normalizeSshPrivateKey(key)).toBe(`${key}\n`);
  });

  it("converts literal newline escapes from pasted env-style values", () => {
    const escaped = key.replace(/\n/g, "\\n");
    expect(normalizeSshPrivateKey(escaped)).toBe(`${key}\n`);
  });

  it("rejects public keys", () => {
    expect(() => normalizeSshPrivateKey("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA node"))
      .toThrow("private key");
  });
});
