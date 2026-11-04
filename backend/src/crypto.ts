// token、session 只存 SHA-256 雜湊；比對用常數時間。
const enc = new TextEncoder();

export function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomId(): string {
  return hex(crypto.getRandomValues(new Uint8Array(12)));
}

export function hex(b: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}

/** 兩個等長 hex 雜湊的常數時間比對。 */
export function sameHash(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}
