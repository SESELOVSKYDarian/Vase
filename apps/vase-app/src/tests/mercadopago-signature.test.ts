import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildSignatureManifest,
  isValidMercadoPagoSignature,
  parseSignatureHeader,
} from "@/lib/billing/mercadopago-signature";

const SECRET = "test-webhook-secret";

function sign(manifest: string, secret = SECRET) {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("firma de avisos de Mercado Pago", () => {
  it("lee ts y v1 del encabezado", () => {
    expect(parseSignatureHeader("ts=1704908010,v1=abc")).toEqual({ ts: "1704908010", v1: "abc" });
    expect(parseSignatureHeader(" v1=abc , ts=1 ")).toEqual({ ts: "1", v1: "abc" });
    expect(parseSignatureHeader("ts=1")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("arma el texto firmado como lo pide Mercado Pago", () => {
    expect(buildSignatureManifest({ dataId: "123456", requestId: "req-1", ts: "99" })).toBe("id:123456;request-id:req-1;ts:99;");
    expect(buildSignatureManifest({ dataId: "ABC123", requestId: "req-1", ts: "99" })).toBe("id:abc123;request-id:req-1;ts:99;");
    expect(buildSignatureManifest({ dataId: null, requestId: null, ts: "99" })).toBe("ts:99;");
  });

  it("acepta un aviso firmado con la clave correcta", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:99;");
    expect(
      isValidMercadoPagoSignature({ secret: SECRET, signatureHeader: `ts=99,v1=${v1}`, requestId: "req-1", dataId: "123456" }),
    ).toBe(true);
  });

  it("rechaza firmas con otra clave, otro pago o sin firma", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:99;");
    const base = { secret: SECRET, signatureHeader: `ts=99,v1=${v1}`, requestId: "req-1", dataId: "123456" };
    expect(isValidMercadoPagoSignature({ ...base, dataId: "999999" })).toBe(false);
    expect(isValidMercadoPagoSignature({ ...base, requestId: "req-2" })).toBe(false);
    expect(isValidMercadoPagoSignature({ ...base, secret: "otra" })).toBe(false);
    expect(isValidMercadoPagoSignature({ ...base, signatureHeader: null })).toBe(false);
    expect(isValidMercadoPagoSignature({ ...base, signatureHeader: "ts=99,v1=zz" })).toBe(false);
    expect(isValidMercadoPagoSignature({ ...base, secret: "" })).toBe(false);
  });
});
