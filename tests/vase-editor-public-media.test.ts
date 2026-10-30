import { describe, expect, it, vi } from "vitest";

import {
  PUBLIC_PRODUCT_DATA_SQL,
  createLoadingCache,
  externalizePageProps,
  getValueByPath,
  normalizeImageWidth,
  parseDataUri,
  sendMedia,
} from "../apps/vase-editor/server/src/services/publicMedia.js";

const SECTION_ID = "33333333-3333-4333-8333-333333333333";

describe("public media helpers", () => {
  it("parses base64 data URIs and rejects anything else", () => {
    const parsed = parseDataUri(`data:image/png;base64,${Buffer.from("abc").toString("base64")}`);
    expect(parsed?.mime).toBe("image/png");
    expect(parsed?.buffer.toString()).toBe("abc");

    expect(parseDataUri("https://example.com/a.png")).toBeNull();
    expect(parseDataUri("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(parseDataUri("data:image/png;base64,")).toBeNull();
    expect(parseDataUri(null)).toBeNull();
  });

  it("reads nested values by path without touching prototypes", () => {
    const props = { cards: [{ image: "x" }], hero: { src: "y" } };
    expect(getValueByPath(props, "cards.0.image")).toBe("x");
    expect(getValueByPath(props, "hero.src")).toBe("y");
    expect(getValueByPath(props, "__proto__.polluted")).toBeUndefined();
    expect(getValueByPath(props, "constructor.name")).toBeUndefined();
    expect(getValueByPath(props, "cards.5.image")).toBeUndefined();
  });

  it("replaces only big data URIs in page props with media routes", () => {
    const big = `data:image/png;base64,${"A".repeat(3000)}`;
    const props = {
      title: "Hola",
      logo: "data:image/png;base64,AAAA",
      video: `data:video/mp4;base64,${"B".repeat(3000)}`,
      cards: [{ image: big }, { image: "https://cdn.example.com/a.jpg" }],
    };

    const result = externalizePageProps(props, { slug: "home", sectionId: SECTION_ID, version: 7 }) as typeof props;

    expect(result.title).toBe("Hola");
    expect(result.logo).toBe(props.logo);
    expect(result.cards[1].image).toBe("https://cdn.example.com/a.jpg");
    expect(result.video).toBe(`/public/pages/home/media/${SECTION_ID}?path=video&v=7`);
    expect(result.cards[0].image).toBe(`/public/pages/home/media/${SECTION_ID}?path=cards.0.image&v=7`);
    expect(JSON.stringify(result).length).toBeLessThan(900);
    expect(props.video.length).toBeGreaterThan(3000);
  });

  it("snaps requested image widths to a few fixed sizes", () => {
    expect(normalizeImageWidth(undefined)).toBe(900);
    expect(normalizeImageWidth("abc")).toBe(900);
    expect(normalizeImageWidth("10")).toBe(160);
    expect(normalizeImageWidth("200")).toBe(320);
    expect(normalizeImageWidth("420")).toBe(480);
    expect(normalizeImageWidth("900")).toBe(900);
    expect(normalizeImageWidth("99999")).toBe(1600);
    // Cualquier numero cae en uno de pocos tamanos: no se pueden forzar conversiones ilimitadas.
    const sizes = new Set(Array.from({ length: 2000 }, (_, i) => normalizeImageWidth(String(i))));
    expect(sizes.size).toBeLessThanOrEqual(7);
  });

  it("builds one value per key, serves stale values on failure and does not cache errors", async () => {
    vi.useFakeTimers();
    try {
      const cache = createLoadingCache({ ttlMs: 1000, maxEntries: 2 });
      const loader = vi.fn().mockResolvedValue("v1");

      const [a, b] = await Promise.all([cache.get("k", loader), cache.get("k", loader)]);
      expect([a, b]).toEqual(["v1", "v1"]);
      expect(loader).toHaveBeenCalledTimes(1);

      await cache.get("k", loader);
      expect(loader).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1500);
      await expect(cache.get("k", vi.fn().mockRejectedValue(new Error("db down")))).resolves.toBe("v1");

      await expect(cache.get("other", vi.fn().mockRejectedValue(new Error("boom")))).rejects.toThrow("boom");
      await expect(cache.get("other", vi.fn().mockResolvedValue("ok"))).resolves.toBe("ok");

      await cache.get("c", () => Promise.resolve("c"));
      await cache.get("d", () => Promise.resolve("d"));
      const reload = vi.fn().mockResolvedValue("k2");
      await cache.get("k", reload);
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("evicts the oldest entries when the memory budget is exceeded", async () => {
    const cache = createLoadingCache({ ttlMs: 60_000, maxEntries: 100, maxTotalBytes: 10, maxEntryBytes: 8 });
    const loaders = { a: vi.fn().mockResolvedValue("aaaaaa"), b: vi.fn().mockResolvedValue("bbbbbb") };

    await cache.get("a", loaders.a);
    await cache.get("b", loaders.b);
    await cache.get("b", loaders.b);
    expect(loaders.b).toHaveBeenCalledTimes(1);
    await cache.get("a", loaders.a);
    expect(loaders.a).toHaveBeenCalledTimes(2);

    const tooBig = vi.fn().mockResolvedValue("123456789");
    await cache.get("big", tooBig);
    await cache.get("big", tooBig);
    expect(tooBig).toHaveBeenCalledTimes(2);
  });

  it("serves an expired value instantly and refreshes it in the background (stale-while-revalidate)", async () => {
    vi.useFakeTimers();
    try {
      const cache = createLoadingCache({ ttlMs: 1000, staleMs: 5000 });
      let release: (value: string) => void = () => {};
      const slow = vi.fn(() => new Promise<string>((resolve) => { release = resolve; }));

      await cache.get("k", () => Promise.resolve("v1"));
      vi.advanceTimersByTime(2000);

      // vencida pero dentro de la ventana: responde "v1" sin esperar la carga lenta
      await expect(cache.get("k", slow)).resolves.toBe("v1");
      expect(slow).toHaveBeenCalledTimes(1);
      // una segunda visita mientras renueva no dispara otra carga
      await expect(cache.get("k", slow)).resolves.toBe("v1");
      expect(slow).toHaveBeenCalledTimes(1);

      release("v2");
      await vi.advanceTimersByTimeAsync(0);
      await expect(cache.get("k", slow)).resolves.toBe("v2");

      // pasada la ventana de gracia se espera la carga nueva
      vi.advanceTimersByTime(10_000);
      await expect(cache.get("k", () => Promise.resolve("v3"))).resolves.toBe("v3");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps recently used keys fresh on a timer and drops idle ones", async () => {
    vi.useFakeTimers();
    try {
      const cache = createLoadingCache({ ttlMs: 60_000, keepWarmMs: 1000, warmIdleMs: 5000, warmMaxKeys: 2 });
      const loaders = { a: vi.fn().mockResolvedValue("a"), b: vi.fn().mockResolvedValue("b"), c: vi.fn().mockResolvedValue("c") };

      await cache.get("a", loaders.a);
      await cache.get("b", loaders.b);
      await cache.get("c", loaders.c); // supera warmMaxKeys: "a" deja de renovarse
      vi.advanceTimersByTime(1100);
      await vi.advanceTimersByTimeAsync(0);
      expect(loaders.a).toHaveBeenCalledTimes(1);
      expect(loaders.b).toHaveBeenCalledTimes(2);
      expect(loaders.c).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(6000); // pasan mas de warmIdleMs sin usarse
      await vi.advanceTimersByTimeAsync(0);
      const callsAfterIdle = loaders.b.mock.calls.length;
      vi.advanceTimersByTime(3000);
      await vi.advanceTimersByTimeAsync(0);
      expect(loaders.b.mock.calls.length).toBe(callsAfterIdle);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the product data SQL free of user input and pointing at the image route", () => {
    expect(PUBLIC_PRODUCT_DATA_SQL).toContain("/public/products/");
    expect(PUBLIC_PRODUCT_DATA_SQL).toContain("as data");
    expect(PUBLIC_PRODUCT_DATA_SQL).not.toMatch(/\$\d/);
  });

  it("answers conditional and range requests", () => {
    const buffer = Buffer.from("0123456789");
    const run = (headers: Record<string, string>) => {
      const res = {
        statusCode: 200,
        headers: {} as Record<string, unknown>,
        body: undefined as Buffer | undefined,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        setHeader(name: string, value: unknown) {
          this.headers[name] = value;
          return this;
        },
        end(chunk?: Buffer) {
          this.body = chunk;
        },
      };
      sendMedia({ headers } as never, res as never, { mime: "video/mp4", buffer, etag: "abc" });
      return res;
    };

    expect(run({}).body?.toString()).toBe("0123456789");
    expect(run({ "if-none-match": '"abc"' }).statusCode).toBe(304);

    const partial = run({ range: "bytes=2-4" });
    expect(partial.statusCode).toBe(206);
    expect(partial.headers["Content-Range"]).toBe("bytes 2-4/10");
    expect(partial.body?.toString()).toBe("234");
    expect(run({ range: "bytes=-3" }).body?.toString()).toBe("789");
    expect(run({ range: "bytes=50-60" }).statusCode).toBe(416);
  });
});
