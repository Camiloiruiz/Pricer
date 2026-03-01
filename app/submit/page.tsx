/**
 * app/submit/page.tsx – Price Submission Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile-optimised form with:
 *   • Camera capture (PWA) or file picker for receipt photo
 *   • Client-side OCR via Tesseract.js (price extraction)
 *   • GPS capture via Geolocation API
 *   • POST to /api/submissions with full payload
 */
import type { Metadata } from "next";
import SubmitForm from "@/components/submit/SubmitForm";
import BottomNav from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "Submit a Price",
  description: "Help other Ontario shoppers by submitting grocery prices from your local store.",
};

export default function SubmitPage() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600"
            aria-label="Back"
          >
            ←
          </a>
          <span className="font-semibold text-gray-900">Submit a Price</span>
        </div>
      </header>

      <section className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <SubmitForm />
      </section>

      <BottomNav active="submit" />
    </main>
  );
}
