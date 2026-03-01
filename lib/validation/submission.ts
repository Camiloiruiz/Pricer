/**
 * lib/validation/submission.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Runtime validation for user submission POST body.
 * Uses only native TypeScript (no Zod/Yup dependency).
 */

export interface SubmissionBody {
  product_id?:     string;          // UUID – omit for new product discovery
  store_id:        string;          // UUID (required)
  submitted_name:  string;          // raw product name from OCR or user
  price_cents:     number;          // integer ≥ 0
  submitter_lat?:  number;          // WGS-84
  submitter_lng?:  number;          // WGS-84
  image_url?:      string;          // pre-signed Supabase Storage URL
  ocr_raw?:        string;          // raw Tesseract output (for audit)
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: SubmissionBody;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_RE  = /^https?:\/\/.+/;

export function validateSubmission(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const body = raw as Record<string, unknown>;

  // store_id
  if (!body.store_id || typeof body.store_id !== "string" || !UUID_RE.test(body.store_id)) {
    errors.push({ field: "store_id", message: "Must be a valid UUID." });
  }

  // product_id (optional but must be valid UUID if present)
  if (body.product_id !== undefined) {
    if (typeof body.product_id !== "string" || !UUID_RE.test(body.product_id)) {
      errors.push({ field: "product_id", message: "Must be a valid UUID when provided." });
    }
  }

  // submitted_name
  if (typeof body.submitted_name !== "string" || body.submitted_name.trim().length < 2) {
    errors.push({ field: "submitted_name", message: "Must be a non-empty string (min 2 chars)." });
  } else if (body.submitted_name.length > 255) {
    errors.push({ field: "submitted_name", message: "Must be ≤ 255 characters." });
  }

  // price_cents
  if (!Number.isInteger(body.price_cents) || (body.price_cents as number) < 0) {
    errors.push({ field: "price_cents", message: "Must be a non-negative integer (cents)." });
  } else if ((body.price_cents as number) > 10_000_00) {   // $10,000 cap
    errors.push({ field: "price_cents", message: "Price exceeds maximum allowed ($10,000)." });
  }

  // submitter_lat / lng (both optional, but if one is present, the other must be too)
  const hasLat = body.submitter_lat !== undefined;
  const hasLng = body.submitter_lng !== undefined;
  if (hasLat !== hasLng) {
    errors.push({ field: "submitter_lat/lng", message: "Both lat and lng must be provided together." });
  }
  if (hasLat && (typeof body.submitter_lat !== "number" || body.submitter_lat < -90 || body.submitter_lat > 90)) {
    errors.push({ field: "submitter_lat", message: "Must be a number between -90 and 90." });
  }
  if (hasLng && (typeof body.submitter_lng !== "number" || body.submitter_lng < -180 || body.submitter_lng > 180)) {
    errors.push({ field: "submitter_lng", message: "Must be a number between -180 and 180." });
  }

  // image_url (optional)
  if (body.image_url !== undefined) {
    if (typeof body.image_url !== "string" || !URL_RE.test(body.image_url)) {
      errors.push({ field: "image_url", message: "Must be a valid HTTP/HTTPS URL." });
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: body as unknown as SubmissionBody,
  };
}
