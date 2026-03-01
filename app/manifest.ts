/**
 * app/manifest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js 15 dynamic PWA Web App Manifest (MetadataRoute.Manifest).
 * Served at /manifest.webmanifest by the framework.
 * Enables "Add to Home Screen" on iOS Safari and Android Chrome.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Sertch – Ontario Grocery Prices",
    short_name:       "Sertch",
    description:      "Real-time Canadian grocery price aggregator for Ontario shoppers.",
    start_url:        "/",
    id:               "/",
    scope:            "/",
    display:          "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation:      "portrait-primary",

    // ── Theme ───────────────────────────────────────────────────────────────
    background_color: "#f0fdf4",   // brand-50
    theme_color:      "#16a34a",   // brand-600

    // ── Icons ────────────────────────────────────────────────────────────────
    // Place actual PNG files in /public/icons/
    icons: [
      {
        src:     "/icons/icon-72.png",
        sizes:   "72x72",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-96.png",
        sizes:   "96x96",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-128.png",
        sizes:   "128x128",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-maskable-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "maskable",
      },
      {
        src:     "/icons/icon-maskable-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],

    // ── Screenshots (optional – enhance install dialog on Android) ────────
    screenshots: [
      {
        src:          "/screenshots/home-mobile.png",
        sizes:        "390x844",
        type:         "image/png",
        // @ts-expect-error – not yet in MetadataRoute types
        form_factor:  "narrow",
        label:        "Home – Stores near you",
      },
      {
        src:          "/screenshots/product-mobile.png",
        sizes:        "390x844",
        type:         "image/png",
        // @ts-expect-error
        form_factor:  "narrow",
        label:        "Price comparison view",
      },
    ],

    // ── Categories ──────────────────────────────────────────────────────────
    categories: ["shopping", "food", "utilities"],

    // ── Shortcuts ───────────────────────────────────────────────────────────
    shortcuts: [
      {
        name:      "Search Prices",
        url:       "/?focus=search",
        icons:     [{ src: "/icons/shortcut-search.png", sizes: "96x96" }],
      },
      {
        name:      "Submit a Price",
        url:       "/submit",
        icons:     [{ src: "/icons/shortcut-submit.png", sizes: "96x96" }],
      },
    ],

    // ── Share target (Web Share Target API) ─────────────────────────────────
    // @ts-expect-error – not yet typed in Next.js MetadataRoute
    share_target: {
      action:   "/submit",
      method:   "GET",
      params:   { text: "q" },
    },
  };
}
