/**
 * components/submit/SubmitForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive price submission form with:
 *   • Camera capture → Tesseract.js OCR (client-side, $0 server cost)
 *   • Auto-fill price from OCR result
 *   • Real-time GPS acquisition
 *   • Confidence score preview after submission
 */
"use client";

import { useState, useRef, useEffect } from "react";

// Tesseract is loaded dynamically to keep the initial bundle small
type TesseractWorker = {
  recognize(img: string | File | HTMLImageElement): Promise<{ data: { text: string } }>;
  terminate(): Promise<void>;
};

interface FormState {
  storeName:     string;
  storeId:       string;
  productName:   string;
  productId:     string;
  priceCents:    string;   // string so input is editable
  imageDataUrl:  string | null;
  lat:           number | null;
  lng:           number | null;
}

interface SubmitResult {
  score:         number;
  gpsScore:      number;
  priceScore:    number;
  semanticScore: number;
  grade:         string;
  flagged:       boolean;
}

export default function SubmitForm() {
  const [form,        setForm]        = useState<FormState>({
    storeName: "", storeId: "", productName: "", productId: "",
    priceCents: "", imageDataUrl: null, lat: null, lng: null,
  });
  const [stores,      setStores]      = useState<{ id: string; name: string; chain: string }[]>([]);
  const [ocr,         setOcr]         = useState<"idle" | "loading" | "done" | "error">("idle");
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState<SubmitResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [geoStatus,   setGeoStatus]   = useState<"idle" | "granted" | "denied">("idle");
  const workerRef  = useRef<TesseractWorker | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  // ── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGeoStatus("granted");
        // Fetch nearby stores
        fetch(`/api/stores?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=10000`)
          .then((r) => r.json())
          .then((j) => setStores(j.stores ?? []));
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // ── OCR pipeline ─────────────────────────────────────────────────────────
  async function runOcr(file: File) {
    setOcr("loading");
    try {
      const { createWorker } = await import("tesseract.js");
      if (!workerRef.current) {
        workerRef.current = await createWorker("eng") as unknown as TesseractWorker;
      }
      const { data } = await workerRef.current.recognize(file);
      const raw = data.text;

      // Extract first price-like token: $X.XX or X.XX
      const match = raw.match(/\$?\s*(\d{1,3})\.(\d{2})/);
      if (match) {
        const dollars = parseInt(match[1], 10);
        const cents   = parseInt(match[2], 10);
        setForm((f) => ({ ...f, priceCents: String(dollars * 100 + cents) }));
      }
      setOcr("done");
    } catch {
      setOcr("error");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({ ...f, imageDataUrl: ev.target?.result as string }));
      runOcr(file);
    };
    reader.readAsDataURL(file);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.storeId) { setError("Please select a store."); return; }
    if (!form.priceCents || isNaN(parseInt(form.priceCents, 10))) {
      setError("Please enter a valid price."); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id:       form.storeId,
          product_id:     form.productId || undefined,
          submitted_name: form.productName,
          price_cents:    parseInt(form.priceCents, 10),
          submitter_lat:  form.lat ?? undefined,
          submitter_lng:  form.lng ?? undefined,
          image_url:      undefined,  // in production, upload first then send URL
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Submission failed.");
      } else {
        setResult(json.score);
        setForm((f) => ({ ...f, productName: "", priceCents: "", imageDataUrl: null }));
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-28">
      {/* Camera capture */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📷 Receipt / Price Tag Photo
          <span className="text-gray-400 font-normal ml-1">(optional — price auto-filled via OCR)</span>
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center
                     justify-center gap-2 text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          {form.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageDataUrl} alt="Receipt preview" className="h-full object-contain rounded-xl" />
          ) : (
            <>
              <span className="text-3xl">{ocr === "loading" ? "⏳" : "📸"}</span>
              <span className="text-sm">{ocr === "loading" ? "Reading price…" : "Tap to open camera"}</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="sr-only"
          aria-label="Upload receipt photo"
        />
        {ocr === "done" && (
          <p className="text-xs text-green-600 mt-1">✓ Price extracted from image</p>
        )}
      </div>

      {/* Store selector */}
      <div>
        <label htmlFor="store" className="block text-sm font-semibold text-gray-700 mb-1">
          Store <span className="text-red-500">*</span>
        </label>
        {geoStatus === "idle" ? (
          <p className="input-base text-gray-400">Locating nearby stores…</p>
        ) : stores.length > 0 ? (
          <select
            id="store"
            value={form.storeId}
            onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
            className="input-base"
            required
          >
            <option value="">Select a store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="Store name (no stores found nearby)"
            value={form.storeName}
            onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
            className="input-base"
          />
        )}
      </div>

      {/* Product name */}
      <div>
        <label htmlFor="product" className="block text-sm font-semibold text-gray-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="product"
          type="text"
          value={form.productName}
          onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          placeholder="e.g. Beatrice 2% Milk 4L"
          className="input-base"
          required
          minLength={2}
          maxLength={255}
        />
      </div>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-1">
          Price (cents) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">¢</span>
          <input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000000}
            value={form.priceCents}
            onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))}
            placeholder="349  =  $3.49"
            className="input-base pl-8"
            required
          />
        </div>
        {form.priceCents && !isNaN(parseInt(form.priceCents, 10)) && (
          <p className="text-xs text-gray-400 mt-1">
            = ${(parseInt(form.priceCents, 10) / 100).toFixed(2)} CAD
          </p>
        )}
      </div>

      {/* GPS indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={geoStatus === "granted" ? "text-green-600" : "text-gray-400"}>
          {geoStatus === "granted" ? "📍 GPS acquired" : geoStatus === "denied" ? "📍 GPS denied (score reduced)" : "📍 Requesting GPS…"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl px-4 py-4 border ${result.flagged ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
          <p className="font-semibold text-gray-900 mb-1">
            {result.flagged ? "⚠ Flagged for review" : "✓ Submission accepted!"}
          </p>
          <div className="text-sm text-gray-600 grid grid-cols-2 gap-1">
            <span>Overall Score:</span><span className="font-mono font-semibold">{(result.score * 100).toFixed(0)}% ({result.grade})</span>
            <span>GPS:</span>         <span className="font-mono">{(result.gpsScore * 100).toFixed(0)}%</span>
            <span>Price Guard:</span> <span className="font-mono">{(result.priceScore * 100).toFixed(0)}%</span>
            <span>Name Match:</span>  <span className="font-mono">{(result.semanticScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full justify-center text-base disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Price"}
      </button>
    </form>
  );
}
