import { readFileSync } from "node:fs";
import { request } from "node:https";

export function createMtlsFetch(input: {
  keyPath: string;
  certPath: string;
}): typeof fetch {
  const key = readFileSync(input.keyPath);
  const cert = readFileSync(input.certPath);
  return (async (resource: string | URL | Request, init?: RequestInit) => {
    const url = resource instanceof Request ? new URL(resource.url)
      : resource instanceof URL ? resource : new URL(resource);
    if (url.protocol !== "https:") throw new Error("EDGE_CLOUD_TLS_REQUIRED");
    const requestBody = typeof init?.body === "string" || Buffer.isBuffer(init?.body)
      ? init.body : undefined;
    return new Promise<Response>((resolve, reject) => {
      const outgoing = request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: init?.method ?? "GET",
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        key,
        cert,
        rejectUnauthorized: true,
      }, (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        incoming.on("end", () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
            else if (value !== undefined) headers.set(name, value);
          }
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode ?? 500,
            headers,
          }));
        });
      });
      outgoing.on("error", reject);
      if (requestBody) outgoing.write(requestBody);
      outgoing.end();
    });
  }) as typeof fetch;
}
