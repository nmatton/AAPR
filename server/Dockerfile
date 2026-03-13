# syntax=docker/dockerfile:1.7

FROM node:22.12.0-alpine AS deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install -g npm@11.8.0
RUN npm ci

FROM node:22.12.0-alpine AS builder
WORKDIR /app/server
COPY --from=deps /app/server/node_modules ./node_modules
COPY server/. .
COPY docs/raw_practices/practices_reference.json /app/docs/raw_practices/practices_reference.json
COPY docs/tag_personality_affinity/personality_score_bounds.csv /app/docs/tag_personality_affinity/personality_score_bounds.csv
COPY docs/tag_personality_affinity/tags_personality_relation.csv /app/docs/tag_personality_affinity/tags_personality_relation.csv
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.12.0-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/server/logs

COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/server/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/docs/raw_practices/practices_reference.json /app/docs/raw_practices/practices_reference.json
COPY --from=builder /app/docs/tag_personality_affinity/personality_score_bounds.csv /app/docs/tag_personality_affinity/personality_score_bounds.csv
COPY --from=builder /app/docs/tag_personality_affinity/tags_personality_relation.csv /app/docs/tag_personality_affinity/tags_personality_relation.csv

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/scripts/bootstrap-db.js && node dist/index.js"]
