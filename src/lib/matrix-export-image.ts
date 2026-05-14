import type { Options } from "html-to-image/lib/types";

/** Fallback when `:root { --export-bg }` is unavailable (SSR / tests). */
export const MATRIX_EXPORT_DEFAULT_BACKGROUND = "#edf8fc";

function readCssExportBackground(): string {
  if (typeof document === "undefined") return MATRIX_EXPORT_DEFAULT_BACKGROUND;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--export-bg")
    .trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(raw)) {
    return raw;
  }
  return MATRIX_EXPORT_DEFAULT_BACKGROUND;
}

/**
 * Options for `html-to-image` when capturing the matrix board.
 *
 * Uses SVG + canvas embedding so Tailwind v4 (oklch, color-mix, etc.) renders
 * correctly. html2canvas foreignObject mode often produced blank exports here.
 */
export function getMatrixExportImageOptions(): Options {
  return {
    pixelRatio: 2,
    backgroundColor: readCssExportBackground(),
    cacheBust: true,
    skipFonts: false,
  };
}
