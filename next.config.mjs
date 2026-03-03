/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Docker / Standalone output ────────────────────────────────────────────
  // Produces .next/standalone/ — a self-contained Node server with only the
  // required node_modules subset. Keeps the Docker runner image ~150 MB.
  // Do NOT set this when deploying to Vercel (Vercel ignores it safely).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // ── PWA / Service-Worker ───────────────────────────────────────────────────
  // We ship a hand-rolled sw.js in /public so Next.js just needs to expose it.
  // Asset-cache strategies live inside public/sw.js (see Workbox-free impl).
  async headers() {
    return [
      {
        // Allow the browser to cache the SW at /sw.js for 0 seconds so updates
        // are picked up immediately.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Offline fallback shell gets a short-lived cache.
        source: "/offline",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" }],
      },
    ];
  },

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.loblaws.ca" },
      { protocol: "https", hostname: "i5.walmartimages.ca" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ── Compiler ──────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Turbopack for fast local dev (stable in Next 15)
    turbo: {},
  },
};

export default nextConfig;
