# Independent deployment for the background workers + scheduler.
#
# Build from the REPO ROOT:
#   docker build -f swyftstack-workers/Dockerfile -t swyftstack-workers .
#
# Run the main worker (default):
#   docker run --env-file .env swyftstack-workers
#
# Run the scheduler:
#   docker run --env-file .env swyftstack-workers npm run scheduler

FROM node:20-bookworm-slim AS deps
WORKDIR /repo

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY swyftstack-shared/package.json ./swyftstack-shared/
COPY swyftstack-platform/package.json ./swyftstack-platform/
COPY swyftstack-userapp/package.json ./swyftstack-userapp/
COPY swyftstack-workers/package.json ./swyftstack-workers/

RUN npm ci

COPY swyftstack-shared ./swyftstack-shared
COPY swyftstack-workers ./swyftstack-workers

WORKDIR /repo/swyftstack-shared
RUN npx prisma generate --schema prisma/schema.prisma

# Workers run via tsx (no Next.js); no compile step required for `start`.
# Type-check at build time so deploys catch shape mismatches early.
WORKDIR /repo/swyftstack-workers
RUN npm run typecheck

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /repo /app

WORKDIR /app/swyftstack-workers
CMD ["npm", "run", "start"]
