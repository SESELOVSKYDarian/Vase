import { z } from "zod";

export const moneySchema = z.string().regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/);

export function moneyToCents(value: string) {
  const parsed = moneySchema.parse(value);
  const [whole, fraction = ""] = parsed.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export function centsToMoney(value: bigint) {
  const sign = value < BigInt(0) ? "-" : "";
  const absolute = value < BigInt(0) ? -value : value;
  return `${sign}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}
