/**
 * app/layout.tsx – Root layout (Server Component)
 * ─────────────────────────────────────────────────────────────────────────────
 * - Registers service worker via inline script
 * - Configures viewport for mobile-first PWA
 * - Sets Open Graph / Twitter meta
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       { default: "Sertch", template: "%s | Sertch" },
  description: "Real-time Ontario grocery price comparison — Loblaws, Walmart, No Frills and more.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sertch.ca"
  ),
  openGraph: {
    siteName: "Sertch",
    locale:   "en_CA",
    type:     "website",
  },
  twitter: { card: "summary" },
  appleWebApp: {
    capable:          true,
    statusBarStyle:   "default",
    title:            "Sertch",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width:           "device-width",
  initialScale:    1,
  viewportFit:     "cover",
  themeColor:      [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)",  color: "#15803d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        {/* Preconnect to Supabase CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        {/* Skip-to-content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 btn-primary"
        >
          Skip to content
        </a>

        <div id="main-content" className="min-h-screen flex flex-col">
          {children}
        </div>

        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      // Check for updates every 60 s
                      setInterval(function() { reg.update(); }, 60000);
                    })
                    .catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
