const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function eur(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return eurFmt.format(n);
}

export function dateDe(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric", ...opts }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function timeDe(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "";
}

/** Nur http(s)-Links zulassen (Schutz vor javascript:-URLs). */
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
