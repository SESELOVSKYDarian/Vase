import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Vase Editor catalog stability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uploads product images as public URLs instead of data URLs", async () => {
    const storage = {
      getItem: vi.fn((key: string) => key === "teflon_token" ? "session-token" : null),
    };
    vi.stubGlobal("localStorage", storage);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        token: "uploads-token",
        uploads_base_url: "https://uploads.example",
      }))
      .mockResolvedValueOnce(Response.json({
        filename: "catalog/product.webp",
      }))
      .mockResolvedValueOnce(Response.json({
        public_url: "https://uploads.example/public-files/client/catalog%2Fproduct.webp",
      }));
    vi.stubGlobal("fetch", fetchMock);

    const uploads = await import("../apps/vase-editor/web/src/utils/uploadsClient.js");
    expect(uploads).toHaveProperty("uploadPublicFile");
    if (typeof uploads.uploadPublicFile !== "function") return;

    const file = new File(["image"], "product.webp", { type: "image/webp" });
    await expect(uploads.uploadPublicFile(file)).resolves.toBe(
      "https://uploads.example/public-files/client/catalog%2Fproduct.webp",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://uploads.example/upload",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer uploads-token" },
        body: expect.any(FormData),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://uploads.example/files/catalog%2Fproduct.webp/public-url",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not retain full product catalogs in the global undo history", async () => {
    const source = await readFile(
      new URL("../apps/vase-editor/web/src/hooks/admin/useEditorState.js", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("products: deepClone(productsRef.current)");
    expect(source).not.toContain("rawSetProducts(snapshot.products)");

    const setProductsBlock = source.match(
      /const setProducts = useCallback\(\(updater\) => \{[\s\S]*?\n    \}, \[[^\]]*\]\);/,
    )?.[0] || "";
    expect(setProductsBlock).not.toContain("pushHistorySnapshot()");
  });

  it("wires the catalog image picker to public uploads without FileReader", async () => {
    const source = await readFile(
      new URL("../apps/vase-editor/web/src/hooks/admin/useCatalogManager.js", import.meta.url),
      "utf8",
    );

    expect(source).toContain("uploadPublicFile(file)");
    expect(source).not.toContain("readAsDataURL");
  });
});
