import { describe, expect, it } from "vitest";
import { matrixExportHtml2CanvasOptions } from "./matrix-export-html2canvas";

describe("matrixExportHtml2CanvasOptions", () => {
  it("uses foreignObject rendering so Tailwind v4 oklch/color-mix styles export", () => {
    expect(matrixExportHtml2CanvasOptions.foreignObjectRendering).toBe(true);
    expect(matrixExportHtml2CanvasOptions.logging).toBe(false);
  });
});
