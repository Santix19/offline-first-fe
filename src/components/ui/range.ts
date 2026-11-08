export type RangeStatus = "ok" | "advertencia" | "critico";

export interface RangeLimits {
  optimo_min: number;
  optimo_max: number;
  critico_min: number;
  critico_max: number | null;
}

export function rangeStatus(value: number, range: RangeLimits): RangeStatus {
  if (value >= range.optimo_min && value <= range.optimo_max) return "ok";
  if (value < range.critico_min) return "critico";
  if (range.critico_max !== null && value > range.critico_max) return "critico";
  return "advertencia";
}
