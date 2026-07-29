import forge from "node-forge";

export function signLoginTicketCms(input: {
  tra: string;
  certificatePem: string;
  privateKeyPem: string;
  passphrase?: string;
  now?: Date;
}) {
  let certificate: forge.pki.Certificate;
  let privateKey: forge.pki.PrivateKey;
  try {
    certificate = forge.pki.certificateFromPem(input.certificatePem);
    if (input.privateKeyPem.includes("ENCRYPTED")) {
      if (!input.passphrase) throw new Error();
      privateKey = forge.pki.decryptRsaPrivateKey(input.privateKeyPem, input.passphrase);
      if (!privateKey) throw new Error();
    } else {
      privateKey = forge.pki.privateKeyFromPem(input.privateKeyPem);
    }
  } catch {
    throw new Error("REST_ARCA_CERTIFICATE_INVALID");
  }
  const now = input.now ?? new Date();
  if (
    certificate.validity.notBefore > now ||
    certificate.validity.notAfter <= now
  ) throw new Error("REST_ARCA_CERTIFICATE_EXPIRED");
  const publicKey = certificate.publicKey as forge.pki.rsa.PublicKey;
  const rsaPrivateKey = privateKey as forge.pki.rsa.PrivateKey;
  if (!rsaPrivateKey.n.equals(publicKey.n) || !rsaPrivateKey.e.equals(publicKey.e)) {
    throw new Error("REST_ARCA_PRIVATE_KEY_MISMATCH");
  }
  const signed = forge.pkcs7.createSignedData();
  signed.content = forge.util.createBuffer(input.tra, "utf8");
  signed.addCertificate(certificate);
  signed.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: now as unknown as string,
      },
    ],
  });
  signed.sign({ detached: false });
  return forge.util.encode64(
    forge.asn1.toDer(signed.toAsn1()).getBytes(),
  );
}
