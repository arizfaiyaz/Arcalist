const BLOCKED_PROTOCOLS = new Set([
  "about:",
  "brave:",
  "chrome:",
  "chrome-extension:",
  "edge:",
  "file:",
]);

export function normalizeDomain(hostname: string): string {
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost") return "localhost";
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized;
}

export function getDomainFromUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url);
    if (BLOCKED_PROTOCOLS.has(parsed.protocol)) return null;
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return normalizeDomain(parsed.hostname);
  } catch {
    return null;
  }
}

export function isTrackableUrl(url: string): boolean {
  return getDomainFromUrl(url) !== null;
}

export function getFaviconForDomain(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}
