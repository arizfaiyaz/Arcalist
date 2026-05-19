export const PAGE_SHARING_PRO_MESSAGE =
  "Page sharing is available with Arcalist Pro.";

export function isSupabasePermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const status =
    typeof candidate.status === "number" ? candidate.status : undefined;

  return (
    code === "42501" ||
    code === "PGRST301" ||
    status === 401 ||
    status === 403 ||
    message.includes("row-level security") ||
    message.includes("violates row-level security policy") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  );
}

export function getFriendlySupabaseErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isSupabasePermissionError(error)) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong. Please try again.";
}
