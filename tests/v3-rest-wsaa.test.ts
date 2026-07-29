import { describe, expect, it } from "vitest";
import forge from "node-forge";
import {
  buildLoginTicketRequest,
  createWsaaClient,
  parseLoginCmsResponse,
} from "../apps/vase-rest/app/lib/fiscal/wsaa-client";
import { signLoginTicketCms } from "../apps/vase-rest/app/lib/fiscal/cms-signer";
import { validateFiscalCredential } from "../apps/vase-rest/app/lib/fiscal/fiscal-credential";

describe("ARCA WSAA", () => {
  it("builds a bounded login ticket request for wsfe and parses token/sign", () => {
    const xml = buildLoginTicketRequest({
      uniqueId: 1700000000,
      generatedAt: new Date("2026-07-28T11:55:00.000Z"),
      expiresAt: new Date("2026-07-28T12:05:00.000Z"),
      service: "wsfe",
    });
    expect(xml).toContain("<service>wsfe</service>");
    expect(xml).toContain("<generationTime>2026-07-28T11:55:00.000Z</generationTime>");
    const credentials = parseLoginCmsResponse(`<?xml version="1.0"?>
      <loginTicketResponse>
        <header><expirationTime>2026-07-28T23:00:00.000Z</expirationTime></header>
        <credentials><token>TOKEN_REAL</token><sign>SIGN_REAL</sign></credentials>
      </loginTicketResponse>`);
    expect(credentials).toEqual({
      token: "TOKEN_REAL",
      sign: "SIGN_REAL",
      expiresAt: new Date("2026-07-28T23:00:00.000Z"),
    });
  });

  it("sends the signed CMS to the official LoginCms SOAP operation", async () => {
    const client = createWsaaClient({
      endpoint: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
      signer: async (tra) => {
        expect(tra).toContain("<service>wsfe</service>");
        return "CMS_BASE64";
      },
      fetcher: async (_url, init) => {
        expect(String(init?.body)).toContain("<in0>CMS_BASE64</in0>");
        return new Response(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><loginCmsResponse><loginCmsReturn>&lt;loginTicketResponse&gt;&lt;header&gt;&lt;expirationTime&gt;2026-07-28T23:00:00.000Z&lt;/expirationTime&gt;&lt;/header&gt;&lt;credentials&gt;&lt;token&gt;TOKEN&lt;/token&gt;&lt;sign&gt;SIGN&lt;/sign&gt;&lt;/credentials&gt;&lt;/loginTicketResponse&gt;</loginCmsReturn></loginCmsResponse></soapenv:Body></soapenv:Envelope>`);
      },
    });
    await expect(client.login("wsfe")).resolves.toMatchObject({
      token: "TOKEN",
      sign: "SIGN",
    });
  });

  it("creates an attached PKCS#7 CMS with the configured certificate and private key", () => {
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const certificate = forge.pki.createCertificate();
    certificate.publicKey = keys.publicKey;
    certificate.serialNumber = "01";
    certificate.validity.notBefore = new Date(Date.now() - 60_000);
    certificate.validity.notAfter = new Date(Date.now() + 60_000);
    certificate.setSubject([{ name: "commonName", value: "Vase Rest test" }]);
    certificate.setIssuer(certificate.subject.attributes);
    certificate.sign(keys.privateKey, forge.md.sha256.create());
    const cms = signLoginTicketCms({
      tra: "<loginTicketRequest/>",
      certificatePem: forge.pki.certificateToPem(certificate),
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
      now: new Date(),
    });
    const der = forge.util.decode64(cms);
    const message = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der));
    expect(message.type).toBe(forge.pki.oids.signedData);
    expect(der).toContain("<loginTicketRequest/>");
  });

  it("validates certificate expiry, private-key match and represented CUIT", () => {
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const certificate = forge.pki.createCertificate();
    certificate.publicKey = keys.publicKey;
    certificate.serialNumber = "02";
    certificate.validity.notBefore = new Date(Date.now() - 60_000);
    certificate.validity.notAfter = new Date(Date.now() + 86_400_000);
    certificate.setSubject([
      { name: "commonName", value: "Vase Rest" },
      { name: "serialNumber", value: "CUIT 30712345671" },
    ]);
    certificate.setIssuer(certificate.subject.attributes);
    certificate.sign(keys.privateKey, forge.md.sha256.create());
    const credential = {
      cuit: "30712345671",
      certificatePem: forge.pki.certificateToPem(certificate),
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    };
    expect(validateFiscalCredential(credential)).toMatchObject({
      cuit: "30712345671",
    });
    expect(() => validateFiscalCredential({
      ...credential,
      cuit: "30700000008",
    })).toThrow("REST_ARCA_CERTIFICATE_CUIT_MISMATCH");
  });
});
