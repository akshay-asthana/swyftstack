Prisma-
set -a
source .env
set +a

npm run db:push
npm run db:seed



Run dev apps-
npm run dev:admin & npm run dev:user & npm run dev:worker & wait
