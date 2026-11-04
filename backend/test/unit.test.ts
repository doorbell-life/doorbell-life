import { describe, expect, it } from "vitest";
import { oklchToHex } from "../src/oklch.ts";
import * as v from "../src/validate.ts";

// 反向換算（測試用）：sRGB hex → OKLCH
function hexToOklch(hex: string): [number, number, number] {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

describe("oklchToHex", () => {
  it("matches CSS Color 4 reference values for sRGB primaries and grays", () => {
    expect(oklchToHex(0.627955, 0.257683, 29.2339)).toBe("#ff0000");
    expect(oklchToHex(0.86644, 0.294827, 142.4953)).toBe("#00ff00");
    expect(oklchToHex(0.452014, 0.313214, 264.052)).toBe("#0000ff");
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    expect(oklchToHex(0.5, 0, 0)).toBe("#636363");
  });

  it("round-trips in-gamut brand colors within rounding", () => {
    for (const [L, C, H] of [
      [0.55, 0.12, 55],
      [0.5, 0.1, 150],
      [0.45, 0.12, 250],
      [0.52, 0.08, 330],
    ]) {
      const [l, c, h] = hexToOklch(oklchToHex(L, C, H));
      expect(Math.abs(l - L)).toBeLessThan(0.005);
      expect(Math.abs(c - C)).toBeLessThan(0.005);
      expect(Math.abs(h - H)).toBeLessThan(1.5);
    }
  });

  it("clips out-of-gamut colors to valid hex", () => {
    expect(oklchToHex(0.55, 0.4, 140)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("validate", () => {
  it("host: a-z0-9.- only, max 253", () => {
    expect(v.host("example.com")).toBe("example.com");
    expect(v.host("sub-1.example.co.uk")).toBe("sub-1.example.co.uk");
    for (const bad of ["Example.com", "ex ample.com", "a..b", "-a.com", "a.com/x", "<x>", "", null, 1, "a".repeat(254)])
      expect(v.host(bad)).toBeNull();
  });

  it("primary: L 0.45–0.55 and normalized", () => {
    expect(v.primary("oklch(0.55 0.16 55)")).toEqual({ oklch: "oklch(0.55 0.16 55)", hex: oklchToHex(0.55, 0.16, 55) });
    expect(v.primary("oklch(.5 .1 200)")?.oklch).toBe("oklch(0.5 0.1 200)");
    for (const bad of [
      "oklch(0.60 0.1 20)",
      "oklch(0.44 0.1 20)",
      "oklch(0.5 0.5 20)",
      "oklch(0.5 0.1 361)",
      "oklch(50% 0.1 20)",
      "oklch(0.5 0.1 20 / 0.5)",
      "red",
      "oklch(0.5 0.1 20); background:url(x)",
    ])
      expect(v.primary(bad)).toBeNull();
  });

  it("name rejects control, bidi and angle-bracket characters", () => {
    expect(v.name(" 綠色乖乖 ")).toBe("綠色乖乖");
    for (const bad of ["", "a\u202eb", "<b>x</b>", "a\nb", "x".repeat(61)]) expect(v.name(bad)).toBeNull();
  });

  it("imageType sniffs magic bytes", () => {
    expect(v.imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(v.imageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(v.imageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(v.imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull(); // JPEG
  });

  it("date requires a real calendar date", () => {
    expect(v.date("2026-02-28")).toBe("2026-02-28");
    expect(v.date("2026-02-30")).toBeNull();
    expect(v.date("2026-2-1")).toBeNull();
  });
});
