// El código está repartido por tema en la carpeta platform-hosts/. Este archivo solo lo junta.
// partes: ./platform-hosts/build-labs-host-redirect-url.ts, ./platform-hosts/resolve-labs-host-request.ts
export { LABS_HOME_PATH, resolvePlatformHosts, isPlatformHost, resolveRequestHostname, resolveLabsHosts, isLabsHost, isLabsWorkspacePath, resolveLabsRedirectHost, resolvePrimaryPlatformHost, buildDefaultPlatformRedirectUrl, buildLabsHostRedirectUrl } from "./platform-hosts/build-labs-host-redirect-url";
export { resolveLabsHostRequest, buildPublicSiteRedirectUrl, buildPrimaryHostRedirectUrl, getDefaultPlatformPathForHost, resolveEditorHost } from "./platform-hosts/resolve-labs-host-request";
