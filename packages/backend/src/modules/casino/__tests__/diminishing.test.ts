import { describe, it, expect } from "vitest";
import { applyDiminishing } from "../diminishing.js";

describe("Diminishing Returns", () => {
  it("returns 0 for 0 input", () => {
    expect(applyDiminishing("payout", 0)).toBe(0);
  });

  it("small values are nearly unchanged", () => {
    const result = applyDiminishing("payout", 0.05); // 5%
    expect(result).toBeGreaterThan(0.04);
    expect(result).toBeLessThan(0.06);
  });

  it("never exceeds cap for luck", () => {
    expect(applyDiminishing("luck_flip", 1.0)).toBeLessThan(0.25);
    expect(applyDiminishing("luck_flip", 10.0)).toBeLessThanOrEqual(0.25);
    expect(applyDiminishing("luck_flip", 100.0)).toBeLessThanOrEqual(0.25);
  });

  it("never exceeds cap for payout", () => {
    expect(applyDiminishing("payout", 10.0)).toBeLessThan(0.40);
  });

  it("never exceeds cap for specials", () => {
    expect(applyDiminishing("specials", 5.0)).toBeLessThan(0.20);
  });

  it("never exceeds cap for boss_dmg", () => {
    expect(applyDiminishing("boss_dmg", 10.0)).toBeLessThan(0.50);
  });

  it("uncapped categories return raw value", () => {
    expect(applyDiminishing("xp", 5.0)).toBe(5.0);
    expect(applyDiminishing("heist", 3.0)).toBe(3.0);
    expect(applyDiminishing("mystery", 2.0)).toBe(2.0);
  });

  it("shield cap is 15", () => {
    expect(applyDiminishing("shield", 100)).toBeLessThan(15);
    expect(applyDiminishing("shield", 5)).toBeGreaterThan(3);
  });

  it("returns positive for positive input", () => {
    expect(applyDiminishing("luck_flip", 0.01)).toBeGreaterThan(0);
    expect(applyDiminishing("payout", 0.01)).toBeGreaterThan(0);
  });
});
