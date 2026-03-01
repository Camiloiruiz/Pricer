/**
 * components/ui/ConfidenceBadge.tsx
 * Colour-coded pill displaying a confidence score S ∈ [0, 1].
 *
 *   S ≥ 0.85 → green  ("High")
 *   S ≥ 0.70 → yellow ("Medium")
 *   S <  0.70 → red   ("Low")
 */
"use client";

interface Props {
  score: number | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ConfidenceBadge({ score, showLabel = true, size = "md" }: Props) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-medium">
        <span>?</span>
        {showLabel && <span>Unknown</span>}
      </span>
    );
  }

  const pct = Math.round(score * 100);

  const config =
    score >= 0.85
      ? { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "High" }
      : score >= 0.70
      ? { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "Med" }
      : { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Low" };

  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${config.bg} ${config.text} ${padding}`}
      title={`Confidence score: ${pct}%`}
      aria-label={`Confidence ${config.label} — ${pct}%`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} aria-hidden />
      <span>{pct}%</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
