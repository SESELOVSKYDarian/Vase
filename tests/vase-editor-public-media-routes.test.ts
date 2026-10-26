import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Express, Response } from "express";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../apps/vase-editor/server/src/db.js", () => ({ pool: { query: queryMock } }));
vi.mock("../apps/vase-editor/server/src/middleware/tenant.js", () => ({
  resolveTenant: (req: { tenant?: { id: string } }, _res: unknown, next: () => void) => {
    req.tenant = { id: "11111111-1111-4111-8111-111111111111" };
    next();
  },
}));

// El editor tiene sus propias dependencias (apps/vase-editor/server). Si no estan instaladas se omiten.
const serverDir = path.resolve(__dirname, "../apps/vase-editor/server");
const editorDepsInstalled = existsSync(path.join(serverDir, "node_modules", "express"));

const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const SECTION_ID = "33333333-3333-4333-8333-333333333333";

async function makePng(width = 800, height = 800) {
  // Ruido: se parece a una foto (un PNG de un patron repetido ya es mas chico que su WebP).
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function startApp() {
  const express = createRequire(path.join(serverDir, "package.json"))("express") as typeof import("express");
  const { publicRouter } = await import("../apps/vase-editor/server/src/routes/public.js");
  const app: Express = express();
  app.use("/public", publicRouter);
  app.use((err: Error, _req: unknown, res: Response, _next: unknown) => {
    res.status(500).json({ error: err.message });
  });
  return new Promise<{ server: ReturnType<Express["listen"]>; baseUrl: string }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` });
    });
  });
}

describe.skipIf(!editorDepsInstalled)("public media routes", () => {
  let server: ReturnType<Express["listen"]>;
  let baseUrl = "";
  let pngBytes: Buffer;
  let pngDataUri = "";

  beforeAll(async () => {
    pngBytes = await makePng();
    pngDataUri = `data:image/png;base64,${pngBytes.toString("base64")}`;
    ({ server, baseUrl } = await startApp());
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  it("serves product images as small cacheable WebP files", async () => {
    queryMock.mockResolvedValue({ rows: [{ image: { url: pngDataUri }, version: "100" }] });

    const response = await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/0?v=100`);
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(body.length).toBeLessThan(pngBytes.length);
    expect((await sharp(body).metadata()).width).toBe(800);

    const thumb = await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/0?w=200`);
    expect((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).width).toBe(200);

    const etag = response.headers.get("etag") as string;
    const again = await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/0`, { headers: { "if-none-match": etag } });
    expect(again.status).toBe(304);
  });

  it("does not need a tenant and rejects bad ids, indexes and missing images", async () => {
    expect((await fetch(`${baseUrl}/public/products/not-a-uuid/images/0`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/abc`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/500`)).status).toBe(404);
    expect(queryMock).not.toHaveBeenCalled();

    queryMock.mockResolvedValue({ rows: [] });
    expect((await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/0`)).status).toBe(404);

    queryMock.mockResolvedValue({ rows: [{ image: { url: "data:text/html;base64,PGI+" }, version: "1" }] });
    expect((await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/1`)).status).toBe(404);
  });

  it("redirects images that are already normal URLs", async () => {
    queryMock.mockResolvedValue({ rows: [{ image: "https://cdn.example.com/a.jpg", version: "1" }] });
    const response = await fetch(`${baseUrl}/public/products/${PRODUCT_ID}/images/0`, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://cdn.example.com/a.jpg");
  });

  it("serves page videos with range support", async () => {
    const video = Buffer.from("0123456789abcdef");
    queryMock.mockResolvedValue({
      rows: [{ props: { videoUrlDesktop: `data:video/mp4;base64,${video.toString("base64")}` }, version: "5" }],
    });

    const url = `${baseUrl}/public/pages/home/media/${SECTION_ID}?path=videoUrlDesktop&v=5`;
    const full = await fetch(url);
    expect(full.headers.get("content-type")).toBe("video/mp4");
    expect(Buffer.from(await full.arrayBuffer()).toString()).toBe("0123456789abcdef");

    const partial = await fetch(url, { headers: { range: "bytes=4-7" } });
    expect(partial.status).toBe(206);
    expect(Buffer.from(await partial.arrayBuffer()).toString()).toBe("4567");

    queryMock.mockResolvedValue({ rows: [{ props: { videoUrlDesktop: "no" }, version: "5" }] });
    expect((await fetch(`${baseUrl}/public/pages/home/media/${SECTION_ID}?path=__proto__`)).status).toBe(404);
  });

  it("replaces base64 media in the home page with short URLs and keeps it uncached", async () => {
    const section = {
      id: SECTION_ID,
      type: "PiquimHero",
      enabled: true,
      sort_order: 0,
      updated_at: new Date("2026-10-20T10:00:00Z"),
      props: { title: "Hola", videoUrlDesktop: `data:video/mp4;base64,${"A".repeat(5000)}` },
    };
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "page-1" }] }).mockResolvedValueOnce({ rows: [section] });

    const response = await fetch(`${baseUrl}/public/pages/home`);
    const body = await response.json();

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.sections[0].props.title).toBe("Hola");
    expect(body.sections[0].props.videoUrlDesktop).toBe(
      `/public/pages/home/media/${SECTION_ID}?path=videoUrlDesktop&v=${Math.floor(section.updated_at.getTime() / 1000)}`
    );
  });
});

describe.skipIf(!editorDepsInstalled)("public product listing cache", () => {
  let server: ReturnType<Express["listen"]>;
  let baseUrl = "";

  beforeAll(async () => {
    ({ server, baseUrl } = await startApp());
  });

  afterAll(() => {
    server.close();
  });

  it("returns just the product names for the header search", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [{ name: "Harina 000" }, { name: " Azucar " }, { name: "" }] });

    const first = await (await fetch(`${baseUrl}/public/products/names`)).json();
    const second = await (await fetch(`${baseUrl}/public/products/names`)).json();

    expect(first).toEqual({ names: ["Harina 000", "Azucar"] });
    expect(second).toEqual(first);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).not.toContain("p.data");
  });
});
