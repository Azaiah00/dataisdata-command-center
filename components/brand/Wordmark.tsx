import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The trademarked "DataIsData" wordmark.
 *
 * Geometric sans (Jost, a Futura-style face with the single-storey "a") with
 * the signature capital "I": a slightly heavier stem capped by a flat bar at the
 * top and the bottom. The "I" is drawn as an inline SVG so the bars sit exactly
 * on the cap height and the baseline at every size, in the colour of the text.
 *
 * Proportions are measured from the trademark artwork (cap height = 700 units):
 * stem 95 wide, bars 210 wide × 57 thick.
 *
 * As in the trademark, "Is" is set apart from "Data" by tone: on light
 * backgrounds it takes the portal's teal accent, on dark backgrounds (`onDark`)
 * "Data" softens to a silver-white and "Is" is pure white.
 *
 * Every style the mark depends on is inline, so it renders correctly even if a
 * stylesheet is stale or missing (an unsized SVG would otherwise fill the page).
 *
 * The real letter "I" stays in the DOM (visually hidden) so screen readers,
 * search and copy/paste all read "DataIsData".
 */
const ROOT: CSSProperties = {
  fontFamily: 'var(--font-wordmark), "Jost", "Futura", "Century Gothic", ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  letterSpacing: "0.058em",
  fontKerning: "normal",
  whiteSpace: "nowrap",
};
const I_WRAP: CSSProperties = { display: "inline-block", margin: "0 0.03em 0 0.045em" };
const I_SVG: CSSProperties = {
  display: "inline-block",
  width: "0.21em",
  height: "0.7em", // Jost cap height: bars land on the cap line and the baseline
  verticalAlign: "baseline",
  fill: "currentColor",
  overflow: "visible",
};
const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function Wordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cn("wordmark", onDark && "wordmark-on-dark", className)}
      style={onDark ? { ...ROOT, color: "rgb(255 255 255 / 0.74)" } : ROOT}
    >
      Data
      <span className="wm-is" style={{ color: onDark ? "#fff" : "var(--teal, #2f7f8c)" }}>
        <span className="wm-i" style={I_WRAP}>
          <svg viewBox="0 0 210 700" width="0.21em" height="0.7em" style={I_SVG} aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="210" height="57" rx="6" />
            <rect x="57.5" y="0" width="95" height="700" />
            <rect x="0" y="643" width="210" height="57" rx="6" />
          </svg>
          <span style={SR_ONLY}>I</span>
        </span>
        s
      </span>
      Data
    </span>
  );
}
