import sanitizeHtml from "sanitize-html";

export function sanitizeText(input: string) {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export function sanitizeNullableText(input?: string | null) {
  if (!input) {
    return null;
  }

  const sanitized = sanitizeText(input);
  return sanitized.length > 0 ? sanitized : null;
}
