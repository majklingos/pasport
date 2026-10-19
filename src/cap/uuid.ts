// Generování jednoznačných ID ve formátu UUID verze 4.
//
// crypto.randomUUID() prohlížeč nabízí jen na HTTPS (a na localhost).
// Na telefonu otevřeném přes http://192.168.x.x chybí, proto máme náhradu
// přes crypto.getRandomValues(), které funguje všude.

/** Vrátí nové náhodné UUID, např. "3f2b8c1e-9a4d-4e7f-b1c2-5d6e7f8a9b0c". */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidFromRandomBytes();
}

/** Náhradní cesta: UUID v4 složené z 16 náhodných bajtů (RFC 4122). */
export function uuidFromRandomBytes(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // verze 4
  b[8] = (b[8] & 0x3f) | 0x80; // varianta RFC 4122
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
