Prisma-
npm run db:repair
npm run db:push
npm run db:seed

# db:repair applies the additive app migrations directly and is safe to rerun.
# The npm Prisma scripts load the repo-root .env directly. Do not source .env
# unless DATABASE_URL and DIRECT_URL are quoted; unquoted & query params break zsh.



Run dev apps-
npm run dev:admin
npm run dev:user
npm run dev:worker
