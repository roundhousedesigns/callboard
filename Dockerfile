FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile

FROM base AS client-builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile
COPY client/ ./client/
COPY prisma/ ./prisma/
RUN yarn workspace client build

FROM base AS server-builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile
COPY server/ ./server/
COPY prisma/ ./prisma/
RUN npx prisma generate
RUN yarn workspace server build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY prisma/ ./prisma/
COPY server/scripts/ ./server/scripts/
USER nodejs
EXPOSE 3000
ENV PORT=3000
CMD ["sh", "server/scripts/start.sh"]
