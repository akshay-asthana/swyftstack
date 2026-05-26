# Independent deployment for the customer-facing Next.js app (port 3001).
#
# The userapp depends on the workspace package `swyftstack-shared` (Prisma
# client + shared helpers), so this Dockerfile installs the whole workspace
# from the repo root, generates the Prisma client, then builds and runs
# only the userapp.
#
# Build from the REPO ROOT:
#   docker build -f swyftstack-userapp/Dockerfile -t swyftstack-userapp .
#   docker run --env-file .env -p 3001:3001 swyftstack-userapp

FROM node:20-bookworm-slim AS deps
WORKDIR /repo

# Install OpenSSL for Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Workspace manifests first, so npm install caches well.
COPY package.json package-lock.json ./
COPY swyftstack-shared/package.json ./swyftstack-shared/
COPY swyftstack-platform/package.json ./swyftstack-platform/
COPY swyftstack-userapp/package.json ./swyftstack-userapp/
COPY swyftstack-workers/package.json ./swyftstack-workers/

RUN npm ci

# Bring in the rest of the sources.
COPY swyftstack-shared ./swyftstack-shared
COPY swyftstack-userapp ./swyftstack-userapp

# Generate Prisma client into swyftstack-shared/src/generated/prisma.
WORKDIR /repo/swyftstack-shared
RUN npx prisma generate --schema prisma/schema.prisma

# Build the Next.js app.
WORKDIR /repo/swyftstack-userapp
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the whole built repo. Next.js standalone mode would let us trim
# this further; for now we ship the full workspace to keep symlink resolution
# of the shared package straightforward.
COPY --from=deps /repo /app

EXPOSE 3001
WORKDIR /app/swyftstack-userapp
CMD ["npm", "run", "start"]
