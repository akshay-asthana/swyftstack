import { env } from "swyftstack-shared";

// Placeholder node-agent installer. A real agent would register itself with
// the control plane using NODE_TOKEN over mTLS/HTTPS.
export async function GET() {
  const script = `#!/bin/sh
set -e
echo "Swyftstack node-agent installer (placeholder)"
: "\${NODE_TOKEN:?NODE_TOKEN env var is required}"
CONTROL_PLANE="${env.PLATFORM_BASE_URL}"
echo "Would install Docker + node-agent and register with $CONTROL_PLANE"
# curl -fsSL https://get.docker.com | sh
# docker run -d --name qd-agent -e NODE_TOKEN="$NODE_TOKEN" -e CONTROL_PLANE="$CONTROL_PLANE" swyftstack/node-agent:latest
echo "Done (no-op in MVP)."
`;
  return new Response(script, { headers: { "content-type": "text/x-shellscript" } });
}
