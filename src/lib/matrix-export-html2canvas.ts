import type { Options } from "html2canvas";

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
 * Shared html2canvas options for matrix PNG/PDF export.
 *
 * Tailwind v4 emits modern color functions (oklch, color-mix) that html2canvas's
 * default canvas renderer cannot parse. ForeignObject rendering delegates paint
 * to the browser and avoids that code path.
 */
export const matrixExportHtml2CanvasOptions: Partial<Options> = {
  scale: 2,
  useCORS: true,
  foreignObjectRendering: true,
  logging: false,
};

export function getMatrixExportHtml2CanvasOptions(): Partial<Options> {
  return {
    ...matrixExportHtml2CanvasOptions,
    backgroundColor: readCssExportBackground(),
  };
}
