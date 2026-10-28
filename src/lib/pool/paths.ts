// Only same-origin paths may be used after sign in. "//evil.example" and
// "/\evil.example" are protocol-relative in browsers, so both are refused.
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
