function defaultPortForProtocol(protocol: string): string {
  return protocol === 'https:' ? '443' : '80';
}

export function getPortFromUrl(urlString: string | null | undefined): string | null {
  if (!urlString) return null;

  try {
    const url = new URL(urlString);
    return url.port || defaultPortForProtocol(url.protocol);
  } catch {
    return null;
  }
}

export function resolveBackendPort({
  nodeEnv,
  configuredPort,
  appUrl,
  fallbackPort = '3000',
}: {
  nodeEnv: string;
  configuredPort?: string | null;
  appUrl?: string | null;
  fallbackPort?: string;
}): string {
  const normalizedConfiguredPort = configuredPort?.trim();
  const appPort = getPortFromUrl(appUrl);

  if (nodeEnv === 'development' && normalizedConfiguredPort && appPort === normalizedConfiguredPort) {
    return fallbackPort;
  }

  return normalizedConfiguredPort || fallbackPort;
}

export function resolveFrontendPort({
  appUrl,
  fallbackPort = '5173',
}: {
  appUrl?: string | null;
  fallbackPort?: string;
}): string {
  return getPortFromUrl(appUrl) ?? fallbackPort;
}
