import { describe, expect, it } from "vitest";
import { resolveHidden, type Detection } from "@/lib/visibility";
import type { Override } from "@/lib/storage";

describe("resolveHidden", () => {
  const detections: Detection[] = [true, false, null];

  describe("override 'hide' always hides", () => {
    for (const detection of detections) {
      it(`hides regardless of detection=${String(detection)}`, () => {
        expect(resolveHidden("hide", detection)).toBe(true);
      });
    }
  });

  describe("override 'show' always reveals", () => {
    for (const detection of detections) {
      it(`reveals regardless of detection=${String(detection)}`, () => {
        expect(resolveHidden("show", detection)).toBe(false);
      });
    }
  });

  describe("no override defers to detection", () => {
    const cases: Array<[Override | null, Detection, boolean]> = [
      [null, true, true],
      [null, false, false],
      [null, null, false],
    ];

    for (const [override, detection, expected] of cases) {
      it(`override=${String(override)} detection=${String(detection)} -> ${expected}`, () => {
        expect(resolveHidden(override, detection)).toBe(expected);
      });
    }
  });
});
