# syntax=docker/dockerfile:1.7

FROM node:24-alpine3.23 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine3.23 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.27.0-alpine AS runtime
ENV VITE_API_URL=http://localhost:3000
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
