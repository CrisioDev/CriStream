import { describe, it, expect } from "vitest";

// Test the format logic (same as frontend)
function formatNumber(input: number | string | null | undefined): string {
  if (input === undefined || input === null) return "0";
  const n = typeof input === "string" ? parseFloat(input) : input;
  if (isNaN(n)) return "0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e18) return sign + (abs / 1e18).toFixed(1) + " Quint";
  if (abs >= 1e15) return sign + (abs / 1e15).toFixed(1) + " Quad";
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + " Tril";
  if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(1) + " Mrd";
  if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(1) + " Mio";
  if (abs >= 1e4)  return sign + (abs / 1e3).toFixed(1) + "K";
  return String(abs);
}

describe("formatNumber", () => {
  it("handles null/undefined", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });
  it("small numbers unchanged", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(9999)).toBe("9999");
  });
  it("thousands", () => {
    expect(formatNumber(10000)).toBe("10.0K");
    expect(formatNumber(50000)).toBe("50.0K");
  });
  it("millions", () => {
    expect(formatNumber(1500000)).toBe("1.5 Mio");
  });
  it("billions", () => {
    expect(formatNumber(2500000000)).toBe("2.5 Mrd");
  });
  it("trillions", () => {
    expect(formatNumber(1.2e12)).toBe("1.2 Tril");
  });
  it("quadrillions", () => {
    expect(formatNumber(3.5e15)).toBe("3.5 Quad");
  });
  it("quintillions", () => {
    expect(formatNumber(9.2e18)).toBe("9.2 Quint");
  });
  it("handles string input (BigInt serialized)", () => {
    expect(formatNumber("166000000000022")).toBe("166.0 Tril");
  });
  it("handles negative", () => {
    expect(formatNumber(-5000000)).toBe("-5.0 Mio");
  });
});
