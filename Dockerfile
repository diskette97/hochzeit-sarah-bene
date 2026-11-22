# Eigenständiges Image: Next.js-App + PostgreSQL in einem Container (für die Pipeline netcup-deploy).
# Daten liegen in den Volumes /var/lib/postgresql/data und /backups, nicht im Image.
FROM node:22-bookworm-slim AS build
ARG SITE_URL=https://hochzeit.152-53-114-139.sslip.io
ENV NEXT_PUBLIC_SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql postgresql-client gosu ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app /app
RUN chmod +x deploy/container-start.sh && chown -R node:node /app/.next
EXPOSE 3000
ENTRYPOINT ["/app/deploy/container-start.sh"]
