# ============================================================
# STARS - Dockerfile (Tahap 3: deployment ganda internet + intranet)
# Memakai output "standalone" Next.js + Prisma (SQLite di volume /app/data).
# Build   : docker build -f deploy/Dockerfile -t stars:latest .
# Jalankan: lihat deploy/docker-compose.yml
# CATATAN : belum diuji di mesin pengembang (Docker tidak terpasang); uji di server sebelum produksi.
# ============================================================

# --- Tahap 1: instal dependensi (postinstall = prisma generate, butuh folder prisma) ---
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# --- Tahap 2: build ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL dummy hanya agar build tidak gagal; nilai asli diberikan saat runtime
ENV DATABASE_URL=file:/tmp/build.db
RUN npm run build

# --- Tahap 3: image runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/stars.db
ENV UPLOAD_DIR=/app/uploads

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/data /app/uploads && chown -R nextjs:nodejs /app

# aplikasi (standalone) + aset statis
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# mesin Prisma (query engine untuk linux-musl) + CLI untuk `migrate deploy` saat start
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs deploy/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/filter-options >/dev/null || exit 1
ENTRYPOINT ["./entrypoint.sh"]
