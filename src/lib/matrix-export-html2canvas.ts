import type { Options } from "html2canvas";

/**
 * Shared html2canvas options for matrix PNG/PDF export.
 *
 * Tailwind v4 emits modern color functions (oklch, color-mix) that html2canvas's
 * default canvas renderer cannot parse. ForeignObject rendering delegates paint
 * to the browser and avoids that code path.
 */
export const matrixExportHtml2CanvasOptions: Partial<Options> = {
  scale: 2,
  backgroundColor: "#fafaf9",
  useCORS: true,
  foreignObjectRendering: true,
  logging: false,
};
