import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { resolve } from "node:path";
import forge from "node-forge";

const dataDir = resolve(process.argv[2] ??
  resolve(process.env.ProgramData ?? "C:\\ProgramData", "Vase", "Rest Edge"));
const keyPath = resolve(dataDir, "server.key");
const certPath = resolve(dataDir, "server.crt");

await mkdir(dataDir, { recursive: true, mode: 0o700 });
if (!existsSync(keyPath) || !existsSync(certPath)) {
  const keys = forge.pki.rsa.generateKeyPair(3072);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));
  certificate.validity.notBefore = new Date();
  certificate.validity.notAfter = new Date();
  certificate.validity.notAfter.setFullYear(
    certificate.validity.notBefore.getFullYear() + 5,
  );
  const commonName = hostname();
  certificate.setSubject([{ name: "commonName", value: commonName }]);
  certificate.setIssuer([{ name: "commonName", value: commonName }]);
  certificate.setExtensions([{
    name: "basicConstraints",
    cA: true,
  }, {
    name: "keyUsage",
    keyCertSign: true,
    digitalSignature: true,
    keyEncipherment: true,
  }, {
    name: "extKeyUsage",
    serverAuth: true,
    clientAuth: true,
  }, {
    name: "subjectAltName",
    altNames: [
      { type: 2, value: commonName },
      { type: 2, value: "localhost" },
      { type: 7, ip: "127.0.0.1" },
    ],
  }]);
  certificate.sign(keys.privateKey, forge.md.sha256.create());
  await writeFile(keyPath, forge.pki.privateKeyToPem(keys.privateKey), {
    mode: 0o600,
    flag: "wx",
  });
  await writeFile(certPath, forge.pki.certificateToPem(certificate), {
    mode: 0o644,
    flag: "wx",
  });
}

if (process.platform === "win32") {
  execFileSync("certutil.exe", ["-addstore", "-f", "Root", certPath], {
    windowsHide: true,
    stdio: "ignore",
  });
}
