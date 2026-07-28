import forge from "node-forge";
import { signLoginTicketCms } from "./cms-signer";

function validCuit(value: string) {
  if (!/^\d{11}$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce(
    (total, weight, index) => total + Number(value[index]) * weight,
    0,
  );
  const remainder = 11 - (sum % 11);
  const digit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return digit === Number(value[10]);
}

export function validateFiscalCredential(input: {
  cuit: string;
  certificatePem: string;
  privateKeyPem: string;
  passphrase?: string;
  now?: Date;
}) {
  if (!validCuit(input.cuit)) throw new Error("REST_ARCA_CUIT_INVALID");
  let certificate: forge.pki.Certificate;
  try {
    certificate = forge.pki.certificateFromPem(input.certificatePem);
  } catch {
    throw new Error("REST_ARCA_CERTIFICATE_INVALID");
  }
  const serialNumber = certificate.subject.attributes.find((attribute) =>
    attribute.name === "serialNumber" || attribute.shortName === "serialNumber")?.value;
  const representedCuit = String(serialNumber ?? "").match(/CUIT\s*(\d{11})/i)?.[1];
  if (representedCuit !== input.cuit) {
    throw new Error("REST_ARCA_CERTIFICATE_CUIT_MISMATCH");
  }
  signLoginTicketCms({
    tra: "<credential-validation/>",
    certificatePem: input.certificatePem,
    privateKeyPem: input.privateKeyPem,
    passphrase: input.passphrase,
    now: input.now,
  });
  return {
    cuit: input.cuit,
    certificateNotBefore: certificate.validity.notBefore,
    certificateNotAfter: certificate.validity.notAfter,
  };
}

