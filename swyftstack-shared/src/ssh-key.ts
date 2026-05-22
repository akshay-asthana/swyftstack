const PRIVATE_KEY_HEADERS = [
  "-----BEGIN OPENSSH PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN EC PRIVATE KEY-----",
  "-----BEGIN DSA PRIVATE KEY-----",
  "-----BEGIN PRIVATE KEY-----",
];

const PUBLIC_KEY_PREFIXES = [
  "ssh-ed25519",
  "ssh-rsa",
  "ecdsa-sha2-",
  "sk-ssh-ed25519",
  "sk-ecdsa-sha2-",
];

export function normalizeSshPrivateKey(input: string): string {
  let key = input.trim();
  if (!key) throw new Error("SSH private key is required.");

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!key.includes("\n") && key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  key = key.split("\n").map((line) => line.trimEnd()).join("\n").trim();

  if (PUBLIC_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error("Paste the SSH private key, not the .pub public key.");
  }

  const header = PRIVATE_KEY_HEADERS.find((h) => key.startsWith(h));
  if (!header) {
    throw new Error("SSH private key must start with a supported private-key header.");
  }

  const footer = header.replace("BEGIN", "END");
  if (!key.endsWith(footer)) {
    throw new Error("SSH private key is missing its matching END footer.");
  }

  if (key.split("\n").length < 3) {
    throw new Error("SSH private key must include line breaks. Paste the full multiline private key.");
  }

  return `${key}\n`;
}
