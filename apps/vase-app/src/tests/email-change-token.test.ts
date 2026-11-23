import { describe, expect, it } from "vitest";
import { createEmailChangeToken, readEmailChangeToken } from "@/lib/auth/email-change-token";

describe("enlace para cambiar el correo", () => {
  const secret = "secreto-de-prueba";
  const now = 1_800_000_000_000;

  it("lee lo que firmó", () => {
    const token = createEmailChangeToken("u1", "administracion@vase.ar", { now, secret });
    expect(readEmailChangeToken(token, { now, secret })).toMatchObject({ userId: "u1", email: "administracion@vase.ar" });
  });

  it("rechaza un enlace vencido, tocado o con otra clave", () => {
    const token = createEmailChangeToken("u1", "administracion@vase.ar", { now, secret });
    expect(readEmailChangeToken(token, { now: now + 2 * 60 * 60 * 1000, secret })).toBeNull();
    expect(readEmailChangeToken(token, { now, secret: "otra" })).toBeNull();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "u2", e: "x@y.z", x: now + 1000 })).toString("base64url");
    expect(readEmailChangeToken(`${forged}.${sig}`, { now, secret })).toBeNull();
    expect(readEmailChangeToken(`${body}.`, { now, secret })).toBeNull();
  });
});
