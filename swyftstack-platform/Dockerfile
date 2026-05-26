# Independent deployment for the platform admin Next.js app (port 3000).
#
# Same pattern as the userapp Dockerfile: install the workspace at the root,
# generate Prisma, then build/run only the platform admin.
#
# Build from the REPO ROOT:
#   docker build -f swyftstack-platform/Dockerfile -t swyftstack-platform .
#   docker run --env-file .env -p 3000:3000 swyftstack-platform

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
COPY swyftstack-platform ./swyftstack-platform

WORKDIR /repo/swyftstack-shared
RUN npx prisma generate --schema prisma/schema.prisma

WORKDIR /repo/swyftstack-platform
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /repo /app

EXPOSE 3000
WORKDIR /app/swyftstack-platform
CMD ["npm", "run", "start"]
