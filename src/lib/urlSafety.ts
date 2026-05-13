const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:"]);

export function normalizeSafeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    const protocol = parsed.protocol.toLowerCase();
    if (BLOCKED_PROTOCOLS.has(protocol)) return null;
    if (!ALLOWED_PROTOCOLS.has(protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSafeUrl(input: string): boolean {
  return normalizeSafeUrl(input) !== null;
}

export function getSafeDomain(input: string): string | null {
  const normalized = normalizeSafeUrl(input);
  if (!normalized) return null;
  return new URL(normalized).hostname;
}

export function openSafeUrl(
  input: string,
  target: "_self" | "_blank" = "_self",
): boolean {
  const normalized = normalizeSafeUrl(input);
  if (!normalized) return false;
  window.open(
    normalized,
    target,
    target === "_blank" ? "noopener,noreferrer" : undefined,
  );
  return true;
}
