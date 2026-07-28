import { timingSafeEqual } from "node:crypto";
import { db } from "../db";

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function authenticateEdgeRequest(request: Request) {
  const proxyProof = request.headers.get("x-vase-mtls-verified") ?? "";
  const expectedProof = process.env.REST_EDGE_MTLS_PROXY_TOKEN ?? "";
  if (!expectedProof || !equal(proxyProof, expectedProof)) {
    throw new Error("REST_EDGE_MTLS_REQUIRED");
  }
  const installationId = request.headers.get("x-vase-edge-installation-id") ?? "";
  const fingerprint = request.headers.get("x-vase-client-cert-fingerprint") ?? "";
  const edge = await db.edgeInstallation.findFirst({
    where: {
      id: installationId,
      certificateFingerprint: fingerprint,
      status: "ACTIVE",
    },
  });
  if (!edge) throw new Error("REST_EDGE_REVOKED");
  return edge;
}
