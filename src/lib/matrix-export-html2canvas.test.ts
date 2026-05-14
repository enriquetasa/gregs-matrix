import { describe, expect, it } from "vitest";
import {
  getMatrixExportHtml2CanvasOptions,
  matrixExportHtml2CanvasOptions,
  MATRIX_EXPORT_DEFAULT_BACKGROUND,
} from "./matrix-export-html2canvas";

describe("matrixExportHtml2CanvasOptions", () => {
  it("uses foreignObject rendering so Tailwind v4 oklch/color-mix styles export", () => {
    expect(matrixExportHtml2CanvasOptions.foreignObjectRendering).toBe(true);
    expect(matrixExportHtml2CanvasOptions.logging).toBe(false);
  });
});

describe("getMatrixExportHtml2CanvasOptions", () => {
  it("includes a solid hex background for reliable captures", () => {
    const opts = getMatrixExportHtml2CanvasOptions();
    expect(opts.backgroundColor).toMatch(/^#/);
    expect(opts.backgroundColor).toBe(MATRIX_EXPORT_DEFAULT_BACKGROUND);
  });
});
