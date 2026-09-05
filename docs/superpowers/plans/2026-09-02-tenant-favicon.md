# Tenant Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate tenant favicon configuration from navbar logos and expose a square-safe editor workflow.

**Architecture:** `StoreLayout` will resolve favicon only from dedicated favicon fields plus the neutral fallback. `EditorPage` will persist `branding.favicon_url`, present a contain-based square preview, and warn from intrinsic file dimensions without transforming uploads.

**Tech Stack:** React, Vite, Node built-in test runner.

---

### Task 1: Add a failing favicon resolution contract

**Files:**
- Create: `apps/vase-editor/web/tests/tenant-favicon.test.mjs`
- Test: `apps/vase-editor/web/tests/tenant-favicon.test.mjs`

- [ ] **Step 1: Write the failing assertions**

```js
assert.match(source, /favicon_url \|\| settings\?\.seo\?\.favicon_url \|\| '\/favicon\.ico'/);
assert.doesNotMatch(source, /favicon_url \|\| settings\?\.seo\?\.favicon_url \|\| settings\?\.branding\?\.logo_url/);
assert.match(source, /faviconLink\.setAttribute\('type', faviconMimeType\)/);
```

- [ ] **Step 2: Run it red**

Run: `node --test tests/tenant-favicon.test.mjs` from `apps/vase-editor/web`.

Expected: FAIL because `logo_url` is still a fallback and no MIME is set.

### Task 2: Separate runtime favicon resolution

**Files:**
- Modify: `apps/vase-editor/web/src/components/layout/StoreLayout.jsx:45-70`
- Test: `apps/vase-editor/web/tests/tenant-favicon.test.mjs`

- [ ] **Step 1: Add MIME detection and dedicated fallback order**

```js
const favicon = String(settings?.branding?.favicon_url || settings?.seo?.favicon_url || '/favicon.ico').trim();
const faviconMimeType = getFaviconMimeType(favicon);
faviconLink.setAttribute('href', favicon);
if (faviconMimeType) faviconLink.setAttribute('type', faviconMimeType);
else faviconLink.removeAttribute('type');
```

- [ ] **Step 2: Update the effect dependencies**

```js
}, [seo, settings?.branding?.name, settings?.branding?.favicon_url, settings?.seo?.favicon_url]);
```

- [ ] **Step 3: Run green**

Run: `node --test tests/tenant-favicon.test.mjs`.

Expected: PASS.

### Task 3: Expose `branding.favicon_url` in the editor

**Files:**
- Modify: `apps/vase-editor/web/src/pages/admin/EditorPage.jsx:171-190,2223-2248,2564-2597`
- Test: `apps/vase-editor/web/tests/tenant-favicon.test.mjs`

- [ ] **Step 1: Add favicon state and upload handler**

```js
const [faviconUploading, setFaviconUploading] = useState(false);
const [faviconAspectWarning, setFaviconAspectWarning] = useState('');
// read file as data URL, load it into Image, then set branding.favicon_url
```

- [ ] **Step 2: Add the dedicated control**

```jsx
<img src={settings.branding.favicon_url} alt="Vista previa del favicon" className="h-full w-full object-contain" />
<p>Se muestra en la pestaña del navegador. Usá una imagen cuadrada para obtener mejores resultados.</p>
```

The file input accepts `.png,.webp,.svg,.ico,image/png,image/webp,image/svg+xml,image/x-icon`; warn rather than reject non-square raster images.

- [ ] **Step 3: Run contract test and build**

Run: `node --test tests/tenant-favicon.test.mjs && npm run build`.

Expected: PASS and build exit 0.
