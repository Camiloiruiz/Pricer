# ══════════════════════════════════════════════════════════════════════════════
# Sertch PWA — Multi-stage Dockerfile (Next.js 15, Node 22 Alpine)
#
# Stages:
#   1. base    – shared Alpine + system deps
#   2. deps    – install ALL node_modules (needed for build)
#   3. builder – next build → .next/standalone (tree-shaken server bundle)
#   4. runner  – minimal image; copies only standalone output + static assets
#
# Final image size target: ~200 MB (vs ~2 GB without standalone mode)
#
# Build:
#   docker build -t sertch-web .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.local sertch-web
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

# libc6-compat required for some native addons on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ── Stage 2: deps ─────────────────────────────────────────────────────────────
# Install ALL dependencies (dev included) so the builder can run.
# Cached separately from source code so a code-only change doesn't re-run npm ci.
FROM base AS deps

# Copy only the manifest files first — maximises layer cache hits
COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# ── Stage 3: builder ──────────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

# Bring in node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source (everything not in .dockerignore)
COPY . .

# ---- Environment variables available at BUILD TIME only ---------------------
# These must not contain secrets — they get baked into the JS bundle.
# Runtime secrets (SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ADMIN_SECRET)
# are injected via --env-file / docker-compose env_file at container start.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Activate Next.js standalone output (see next.config.mjs)
ENV NEXT_OUTPUT=standalone

# Disable Next.js telemetry inside CI / Docker builds
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 4: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone server reads these at startup
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ── Security: non-root user ───────────────────────────────────────────────────
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# ── Copy artefacts from builder ───────────────────────────────────────────────
# 1. Public assets (sw.js, icons, screenshots)
COPY --from=builder /app/public ./public

# 2. Standalone server bundle (node_modules subset + server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. Static Next.js chunks (_next/static)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# ── Health check ──────────────────────────────────────────────────────────────
# Hits the manifest endpoint — a lightweight, cacheable response that confirms
# the app is up and Next.js is serving correctly.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/manifest.webmanifest || exit 1

# ── Start ─────────────────────────────────────────────────────────────────────
# The standalone build produces server.js at the workdir root.
CMD ["node", "server.js"]
