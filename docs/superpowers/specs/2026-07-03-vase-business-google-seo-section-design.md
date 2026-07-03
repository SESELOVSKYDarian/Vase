# Vase Business Google Positioning Section Design

## Objective

Add a dedicated section inside the Business editor for improving Google
positioning of a page before publishing it.

The section must help the editor user:

- define the page topic clearly
- write metadata that can rank and render well in search results
- validate the page is ready to be indexed
- understand what is missing before publication

This is an editorial SEO feature, not an automated ranking promise.

## Product Context

The current Business editor already exposes basic SEO fields in the
configuration sidebar:

- `SEO title`
- `SEO description`

That is enough for a minimal page, but not enough for a user who wants a more
guided workflow for Google discovery and snippet quality.

This design adds a new section that sits beside the existing SEO fields and
organizes the work around search intent, indexing readiness, and snippet
preview.

## Scope

### In scope

- A new "Posicionamiento en Google" section in the Business editor.
- Metadata fields for search and social snippet quality.
- A live preview of how the page can appear in Google.
- Basic guidance and warnings when the page is weak for indexing.
- Autosave support for the new SEO data.

### Out of scope

- Search Console integration.
- Automatic submission to Google.
- Paid keyword research.
- AI-generated full page copy.
- Ranking guarantees.
- Technical SEO changes outside the editor unless they are needed to expose
  the new data.

## Recommended Approach

Use a single dedicated sidebar card called "Posicionamiento en Google" rather
than scattering SEO controls across multiple places.

Why this approach:

- it is easy to find
- it matches the existing editor layout
- it keeps metadata, preview, and validation together
- it can be built without redesigning the whole Business workspace

## User Experience

The new section should appear in the right sidebar of the page editor, near the
existing configuration controls.

The section must read as a guided checklist, not as a technical form. The user
should understand three things immediately:

1. What Google will read
2. How the page will look in results
3. What is still missing

### Suggested section contents

- Page topic or target phrase
- SEO title
- SEO description
- Canonical path or public URL preview
- Indexing toggle
- Primary keyword
- Secondary keywords
- Content checklist
- Google snippet preview

### Suggested copy direction

- Keep the tone commercial and plain.
- Avoid jargon like "SERP" or "crawl budget" in the interface.
- Use direct labels such as "Titulo para Google", "Descripcion para Google"
  and "Palabra principal".

## Information Architecture

The section should be structured in four blocks:

### 1. Search intent

Capture the main topic of the page in one short phrase.

Fields:

- page topic
- primary keyword
- secondary keywords

Purpose:

- helps the editor stay focused
- feeds suggestions for metadata
- gives a simple input for later content scoring

### 2. Search snippet

Capture the metadata that Google may use in results.

Fields:

- SEO title
- SEO description
- optional canonical path

Rules:

- title should warn when it is too short or too long
- description should warn when it is too short, too long, or empty
- the canonical path should reflect the real public page URL

### 3. Indexing readiness

Tell the user whether the page is ready to be indexed.

Controls:

- index / noindex toggle
- warning if the page has no domain connected
- warning if the page is still temporary or unpublished

Purpose:

- reduce accidental noindex pages
- prevent users from assuming a draft is already searchable

### 4. Google preview

Show a compact preview of the page snippet.

Preview data:

- title
- URL
- description

Behavior:

- update live as the user types
- visually mark overflow or truncated values
- fall back to safe placeholders when a field is empty

## Data Model

The current `seo` object is too small for a guided positioning workflow.
Extend it so the editor can preserve the new fields in drafts and published
documents.

Proposed shape:

```ts
seo: {
  title: string;
  description?: string | null;
  keyword?: string | null;
  secondaryKeywords?: string[];
  canonicalPath?: string | null;
  indexable?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
}
```

Notes:

- `title` and `description` remain the source of truth for search snippets.
- `keyword` is a helper for the editor, not a hidden ranking trick.
- `secondaryKeywords` should stay optional and short.
- `indexable` defaults to `true` for public pages and `false` only when the
  user explicitly turns indexing off.
- Open Graph fields are optional but useful when the page is shared outside
  Google.

## Validation Rules

The section should show inline feedback instead of blocking the user with a
hard error.

### Title

- target length: around 50 to 60 characters
- warn if empty
- warn if too short
- warn if too long

### Description

- target length: around 140 to 160 characters
- warn if empty
- warn if too short
- warn if too long

### Keyword fields

- primary keyword should be a short phrase
- secondary keywords should be a small comma-separated or chip-based list
- warn if the same keyword is repeated many times

### Indexing

- warn if the page is set to `indexable=false` while the user expects public
  visibility
- warn if the page has no connected domain and the user wants to rank in
  Google

## Content Guidance

The section should help the user improve the page, not just fill metadata.

Recommended helper copy:

- write one page per intent
- use the main keyword in the title only when it sounds natural
- make the description explain the value in plain language
- add a public domain before expecting organic traffic
- keep the page indexable only if it should appear in search

Optional checklist items:

- the page has a real topic
- the title mentions the service or product
- the description explains the benefit
- the page has at least one visible heading in the content
- the page is linked to a public domain

## Layout

The new section should behave like the other editor cards:

- rounded container
- light editorial surface
- compact but readable form density
- live preview inside the same card or directly below the fields

The preview should not dominate the editor. It is support content, not a second
page.

## Behavior Rules

- The section must autosave with the rest of the editor draft.
- The section must keep existing SEO values intact when older documents are
  loaded.
- The preview must update immediately when metadata changes.
- The section must not break pages that do not yet have all the new fields.
- The section must degrade gracefully if a domain is missing.

## Acceptance Criteria

- Business editor users can edit a dedicated Google positioning section.
- The editor stores the new SEO metadata in drafts and published pages.
- The page preview reflects the entered title and description live.
- The interface shows warnings when metadata is weak or indexing is not ready.
- Existing pages without the new fields still open without errors.
- The current SEO title and description behavior remains compatible.

## Testing

Minimum checks:

- load an existing page document that only has title and description
- load a newer document that also has keyword and canonical data
- verify draft autosave persists the new SEO fields
- verify the preview updates when the user edits title and description
- verify the empty state warns clearly when the page has no public domain

## Rollout Notes

- Ship the section behind the current Business editor path.
- Do not couple this change to Search Console or external SEO services.
- Keep the feature visible to page owners who can already edit the page.
- If later needed, the same data can feed richer SEO reporting or publishing
  checks.

