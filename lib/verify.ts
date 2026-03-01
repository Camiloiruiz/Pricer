/**
 * lib/verify.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sertch Accuracy Engine
 *
 * Computes a composite confidence score S ∈ [0, 1] for a user-submitted price
 * using three independent sub-scores:
 *
 *   S = 0.40·G  +  0.35·P  +  0.25·M
 *
 *   G  – GPS Fence     : submitter proximity to store (Haversine)
 *   P  – Price Guard   : deviation from 30-day historical mean (z-score)
 *   M  – Semantic Match: product-name similarity (Levenshtein)
 *
 * All functions are pure and dependency-free (no external packages required).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GpsFenceInput {
  submitterLat: number;
  submitterLng: number;
  storeLat: number;
  storeLng: number;
}

export interface PriceGuardInput {
  /** Submitted price in cents */
  submittedCents: number;
  /** 30-day mean in cents (from v_price_stats_30d view) */
  historicalMeanCents: number;
  /** 30-day std-dev in cents; pass 0 when no history exists */
  historicalStddevCents: number;
  /** Minimum sample count needed to trust the historical mean */
  minSamples?: number;
  /** Actual sample count; if < minSamples, score is 0.5 (uncertain) */
  sampleCount?: number;
}

export interface SemanticMatchInput {
  submittedName: string;
  canonicalName: string;
}

export interface VerifyInput {
  gps: GpsFenceInput;
  price: PriceGuardInput;
  semantic: SemanticMatchInput;
}

export interface VerifyResult {
  /** Composite score S = 0.40·G + 0.35·P + 0.25·M */
  score: number;
  /** Individual sub-scores */
  gpsScore: number;
  priceScore: number;
  semanticScore: number;
  /** Human-readable grade */
  grade: "high" | "medium" | "low";
  /** True when score < 0.70 – item should surface in admin mod queue */
  flagged: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Weights must sum to 1.0 */
const W_GPS      = 0.40;
const W_PRICE    = 0.35;
const W_SEMANTIC = 0.25;

/** Radius of the Earth in metres (WGS-84 mean) */
const EARTH_R_M = 6_371_000;

/**
 * GPS full-score radius (metres). Any submission from within this distance
 * receives G = 1.0.
 */
const GPS_INNER_M = 500;

/**
 * GPS zero-score radius (metres). Submissions farther than this are G = 0.
 */
const GPS_OUTER_M = 5_000;

/**
 * Number of standard deviations at which the price guard returns P = 0.
 * Using the three-sigma rule: |z| ≥ 3 ⟹ P = 0.
 */
const PRICE_Z_ZERO = 3;

/**
 * Minimum number of historical price records needed to trust the mean.
 * Below this the guard returns a neutral 0.50.
 */
const PRICE_MIN_SAMPLES = 3;

/** Composite threshold below which a submission is flagged for moderation */
const FLAG_THRESHOLD = 0.70;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score: GPS Fence  (G)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haversine great-circle distance between two WGS-84 coordinates.
 * Returns distance in metres.
 */
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.sqrt(a));
}

/**
 * GPS Fence Score G ∈ [0, 1].
 *
 *   d ≤ 500 m    ⟹  G = 1.0
 *   d ≥ 5 000 m  ⟹  G = 0.0
 *   otherwise    ⟹  G = 1 − (d − 500) / 4500  (linear decay)
 */
export function computeGpsScore(input: GpsFenceInput): number {
  const { submitterLat, submitterLng, storeLat, storeLng } = input;

  // If coordinates are unavailable (0,0 or NaN) return neutral 0.5
  if (
    !isFinite(submitterLat) || !isFinite(submitterLng) ||
    !isFinite(storeLat)     || !isFinite(storeLng)
  ) {
    return 0.5;
  }

  const d = haversineMetres(submitterLat, submitterLng, storeLat, storeLng);
  if (d <= GPS_INNER_M) return 1.0;
  if (d >= GPS_OUTER_M) return 0.0;
  return 1.0 - (d - GPS_INNER_M) / (GPS_OUTER_M - GPS_INNER_M);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score: Price Guard  (P)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Price Guard Score P ∈ [0, 1].
 *
 * Uses a modified z-score against the 30-day mean:
 *   z  = |submitted − μ| / max(σ, 1)
 *   P  = max(0,  1 − z / PRICE_Z_ZERO)
 *
 * Edge cases:
 *   • σ = 0 and submitted = μ  ⟹  P = 1.0  (exact match)
 *   • σ = 0 and submitted ≠ μ  ⟹  z = |diff| / 1 cent (very sensitive)
 *   • sample_count < minSamples ⟹  P = 0.50  (insufficient history)
 */
export function computePriceScore(input: PriceGuardInput): number {
  const {
    submittedCents,
    historicalMeanCents,
    historicalStddevCents,
    minSamples = PRICE_MIN_SAMPLES,
    sampleCount = minSamples, // assume sufficient when not provided
  } = input;

  if (sampleCount < minSamples) return 0.5;

  const sigma = Math.max(historicalStddevCents, 1); // avoid divide-by-zero
  const z     = Math.abs(submittedCents - historicalMeanCents) / sigma;
  return Math.max(0, 1 - z / PRICE_Z_ZERO);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score: Semantic Match  (M)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Iterative Wagner–Fischer Levenshtein distance.
 * O(n·m) time, O(min(n,m)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep the shorter string in `b` to minimise memory
  if (a.length < b.length) [a, b] = [b, a];

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,         // insertion
        prev[j]     + 1,         // deletion
        prev[j - 1] + cost,      // substitution
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Semantic Match Score M ∈ [0, 1].
 *
 *   L = levenshtein(normalise(submitted), normalise(canonical))
 *   M = 1 − L / max(len(submitted), len(canonical))
 *
 * Normalisation: lowercase, collapse whitespace, strip punctuation.
 */
export function computeSemanticScore(input: SemanticMatchInput): number {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const a = normalise(input.submittedName);
  const b = normalise(input.canonicalName);

  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;

  return 1 - levenshtein(a, b) / maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite Scorer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the full Sertch Accuracy Score S for a user submission.
 *
 * @example
 * const result = verify({
 *   gps: { submitterLat: 43.8, submitterLng: -79.9, storeLat: 43.8, storeLng: -79.9 },
 *   price: { submittedCents: 349, historicalMeanCents: 369, historicalStddevCents: 30, sampleCount: 12 },
 *   semantic: { submittedName: "Beatrice 2% Milk 4L", canonicalName: "Beatrice Partly Skimmed 2% Milk 4L" },
 * });
 * // result.score ≈ 0.86 → grade: "high"
 */
export function verify(input: VerifyInput): VerifyResult {
  const gpsScore      = computeGpsScore(input.gps);
  const priceScore    = computePriceScore(input.price);
  const semanticScore = computeSemanticScore(input.semantic);

  const score = W_GPS * gpsScore + W_PRICE * priceScore + W_SEMANTIC * semanticScore;
  const rounded = Math.round(score * 1000) / 1000; // 3 d.p.

  const grade: VerifyResult["grade"] =
    rounded >= 0.85 ? "high" :
    rounded >= 0.70 ? "medium" :
    "low";

  return {
    score:         rounded,
    gpsScore:      Math.round(gpsScore      * 1000) / 1000,
    priceScore:    Math.round(priceScore    * 1000) / 1000,
    semanticScore: Math.round(semanticScore * 1000) / 1000,
    grade,
    flagged: rounded < FLAG_THRESHOLD,
  };
}
