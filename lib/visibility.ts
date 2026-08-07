import type { Override } from "@/lib/storage";

export type Detection = boolean | null;

export function resolveHidden(
  override: Override | null,
  reusableOnly: Detection,
): boolean {
  if (override === "hide") return true;
  if (override === "show") return false;
  return reusableOnly === true;
}
