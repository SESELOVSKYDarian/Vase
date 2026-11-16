import { describe, expect, it } from "vitest";
import { formatBytes, getStorageLimits, percentOf, storagePercent } from "@/lib/business/storage";

describe("topes de espacio de una web", () => {
  it("da más lugar al plan Premium", () => {
    const start = getStorageLimits({ plan: "START", premiumEnabled: false });
    const premium = getStorageLimits({ plan: "PREMIUM", premiumEnabled: false });
    expect(premium.maxImages).toBeGreaterThan(start.maxImages);
    expect(premium.maxBytes).toBeGreaterThan(start.maxBytes);
    expect(getStorageLimits({ plan: "START", premiumEnabled: true })).toEqual(premium);
  });

  it("toma el porcentaje más alto entre imágenes y espacio", () => {
    const limits = { maxImages: 100, maxBytes: 1000 };
    expect(storagePercent({ imageCount: 90, totalBytes: 100 }, limits)).toBe(90);
    expect(storagePercent({ imageCount: 10, totalBytes: 860 }, limits)).toBe(86);
  });

  it("nunca pasa de 100 ni se rompe sin tope", () => {
    expect(percentOf(500, 100)).toBe(100);
    expect(percentOf(5, 0)).toBe(0);
  });

  it("muestra el tamaño en la unidad que conviene", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatBytes(300 * 1024 * 1024)).toBe("300 MB");
  });
});
