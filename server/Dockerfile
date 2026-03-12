# syntax=docker/dockerfile:1.7

FROM node:22.12.0-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11.8.0
RUN npm ci

FROM node:22.12.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.12.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
