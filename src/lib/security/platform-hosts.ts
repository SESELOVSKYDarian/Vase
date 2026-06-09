type PlatformHostsInput = {
  nodeEnv?: string;
  appUrl?: string;
  trustedOrigins?: string | string[];
  labsHost?: string;
};

type EditorHostInput = {
  nodeEnv?: string;
  editorUrl?: string;
};

function normalizeHostCandidate(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).host.toLowerCase();
    }
  } catch {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

function readHostsFromValue(value?: string | string[]) {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : value.split(",");
  const hosts = rawValues
    .map((entry) => normalizeHostCandidate(entry))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set(hosts));
}

function getConfiguredHostValues(input: PlatformHostsInput) {
  return [input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "", ...readHostsFromValue(input.trustedOrigins ?? process.env.TRUSTED_ORIGINS)];
}

export function resolvePlatformHosts(input: PlatformHostsInput = {}) {
  const {
    nodeEnv = process.env.NODE_ENV,
  } = input;
  const defaults = nodeEnv === "production" ? ["vase.ar", "www.vase.ar"] : ["localhost:3000"];
  const hosts = new Set(defaults);

  for (const host of readHostsFromValue(getConfiguredHostValues(input))) {
    hosts.add(host);
  }

  return Array.from(hosts);
}

export function isPlatformHost(hostname: string, input: PlatformHostsInput = {}) {
  return resolvePlatformHosts(input).includes(hostname.trim().toLowerCase());
}

export function resolveLabsHosts(input: PlatformHostsInput = {}) {
  const { nodeEnv = process.env.NODE_ENV, labsHost = process.env.VASE_LABS_HOST } = input;
  const hosts = new Set(nodeEnv === "production" ? ["labs.vase.ar"] : []);

  for (const host of readHostsFromValue([labsHost ?? "", ...getConfiguredHostValues(input)])) {
    if (host === "labs.vase.ar" || host.startsWith("labs.")) {
      hosts.add(host);
    }
  }

  return Array.from(hosts);
}

export function isLabsHost(hostname: string, input: PlatformHostsInput = {}) {
  return resolveLabsHosts(input).includes(hostname.trim().toLowerCase());
}

export function isLabsWorkspacePath(pathname: string) {
  return (
    pathname === "/app/labs" ||
    pathname.startsWith("/app/labs/") ||
    pathname === "/app/owner/labs" ||
    pathname.startsWith("/app/owner/labs/")
  );
}

export function resolveLabsRedirectHost(input: PlatformHostsInput = {}) {
  return resolveLabsHosts(input)[0] ?? null;
}

export function buildLabsHostRedirectUrl({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}) {
  const redirectUrl = new URL(url);

  if (!isLabsWorkspacePath(redirectUrl.pathname) || isLabsHost(hostname, input)) {
    return null;
  }

  const labsHost = resolveLabsRedirectHost(input);
  if (!labsHost) {
    return null;
  }

  redirectUrl.host = labsHost;
  if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
    redirectUrl.protocol = "https:";
  }

  return redirectUrl.toString();
}

export function getDefaultPlatformPathForHost(hostname: string, input: PlatformHostsInput = {}) {
  return isLabsHost(hostname, input) ? "/app/labs" : "/app";
}

export function resolveEditorHost(input: EditorHostInput = {}) {
  const {
    nodeEnv = process.env.NODE_ENV,
    editorUrl = process.env.BUSINESS_EDITOR_URL,
  } = input;
  const configuredHost = normalizeHostCandidate(editorUrl ?? "");

  if (configuredHost) {
    return configuredHost;
  }

  return nodeEnv === "production" ? "editor.vase.ar" : "localhost:5173";
}
