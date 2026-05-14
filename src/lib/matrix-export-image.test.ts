import { describe, expect, it } from "vitest";
import { getMatrixExportImageOptions } from "./matrix-export-image";

describe("getMatrixExportImageOptions", () => {
  it("requests crisp captures and cache-busted resources", () => {
    const opts = getMatrixExportImageOptions();
    expect(opts.pixelRatio).toBe(2);
    expect(opts.cacheBust).toBe(true);
    expect(opts.skipFonts).toBe(false);
  });
});
