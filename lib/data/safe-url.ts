/**
 * Sanitize a user/admin-provided link before it's used as an href. Returns the
 * value only if it's a same-origin relative path (single leading "/") or an
 * absolute http(s) URL; everything else (javascript:, data:, vbscript:, mailto,
 * protocol-relative //host, backslash tricks) collapses to "" so it can never
 * become a script-executing or off-site href. Safe on client and server.
 */
export function safeHref(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  if (s.includes("\\")) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s; // relative, same-origin
  if (/^https?:\/\//i.test(s)) return s; // absolute http(s)
  return "";
}
