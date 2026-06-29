import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCustomSitesBaseDir } from "@/server/services/custom-site-paths";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export const dynamic = "force-dynamic";

function isSafeSiteId(value: string) {
  return /^[a-zA-Z0-9_-]{4,80}$/.test(value);
}

function assertInsideBase(baseDir: string, targetPath: string) {
  const rel = relative(baseDir, targetPath);
  if (rel.startsWith("..") || rel === ".." || rel.includes(`..${sep}`)) {
    throw new Error("CUSTOM_SITE_PATH_INVALID");
  }
}

async function readCustomSiteFile(siteId: string, pathParts: string[]) {
  if (!isSafeSiteId(siteId)) return null;

  const baseDir = join(getCustomSitesBaseDir(), siteId, "current");
  const requestedPath = pathParts.length ? pathParts.join("/") : "index.html";
  const targetPath = join(baseDir, requestedPath);
  assertInsideBase(baseDir, targetPath);

  try {
    const targetStat = await stat(targetPath);
    if (targetStat.isFile()) {
      return { bytes: await readFile(targetPath), path: requestedPath };
    }
  } catch {
    // Fall through to SPA fallback.
  }

  if (!extname(requestedPath)) {
    const fallbackPath = join(baseDir, "index.html");
    assertInsideBase(baseDir, fallbackPath);
    try {
      return { bytes: await readFile(fallbackPath), path: "index.html" };
    } catch {
      return null;
    }
  }

  return null;
}

function rewriteIndexHtml(html: string, siteId: string) {
  const basePath = `/api/custom-sites/${encodeURIComponent(siteId)}/`;
  const withBase = html.includes("<base ")
    ? html
    : html.replace(/<head([^>]*)>/i, `<head$1><base href="${basePath}">`);

  return withBase
    .replaceAll('src="/', `src="${basePath}`)
    .replaceAll("src='/", `src='${basePath}`)
    .replaceAll('href="/', `href="${basePath}`)
    .replaceAll("href='/", `href='${basePath}`);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ siteId: string; path?: string[] }> },
) {
  const { siteId, path = [] } = await context.params;
  const file = await readCustomSiteFile(siteId, path);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const extension = extname(file.path).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";
  const body = extension === ".html"
    ? rewriteIndexHtml(file.bytes.toString("utf8"), siteId)
    : file.bytes;

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
