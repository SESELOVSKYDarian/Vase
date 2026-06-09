type PlatformHostsInput = {
  nodeEnv?: string;
  appUrl?: string;
  trustedOrigins?: string | string[];
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

export function resolvePlatformHosts(input: PlatformHostsInput = {}) {
  const {
    nodeEnv = process.env.NODE_ENV,
    appUrl = process.env.NEXT_PUBLIC_APP_URL,
    trustedOrigins = process.env.TRUSTED_ORIGINS,
  } = input;
  const defaults = nodeEnv === "production" ? ["vase.ar", "www.vase.ar"] : ["localhost:3000"];
  const hosts = new Set(defaults);

  for (const host of readHostsFromValue([appUrl ?? "", ...readHostsFromValue(trustedOrigins)])) {
    hosts.add(host);
  }

  return Array.from(hosts);
}

export function isPlatformHost(hostname: string, input: PlatformHostsInput = {}) {
  return resolvePlatformHosts(input).includes(hostname.trim().toLowerCase());
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
