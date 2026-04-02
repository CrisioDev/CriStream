import { describe, it, expect } from "vitest";
import { getSkillCost, getTotalInvested, getPayoutMultiplier, getLuckBonus, getShieldBonus, getExtraFreePlays } from "../skilltree.js";
import type { SkillLevels } from "../skilltree.js";

const DEFAULT: SkillLevels = {
  luck_flip: 0, luck_slots: 0, luck_scratch: 0,
  profit: 0, shield: 0, speed: 0, specials: 0, combat: 0,
};

describe("Skill Tree", () => {
  describe("getSkillCost", () => {
    it("level 0 costs 50", () => expect(getSkillCost(0)).toBe(50));
    it("level 1 costs 100", () => expect(getSkillCost(1)).toBe(100));
    it("level 5 costs 1600", () => expect(getSkillCost(5)).toBe(1600));
    it("costs grow exponentially", () => {
      expect(getSkillCost(10)).toBeGreaterThan(getSkillCost(9) * 1.9);
    });
  });

  describe("getTotalInvested", () => {
    it("returns 0 for no skills", () => {
      expect(getTotalInvested(DEFAULT)).toBe(0);
    });
    it("calculates correctly for single skill", () => {
      expect(getTotalInvested({ ...DEFAULT, profit: 1 })).toBe(50);
      expect(getTotalInvested({ ...DEFAULT, profit: 2 })).toBe(150); // 50 + 100
    });
  });

  describe("bonuses", () => {
    it("payout multiplier starts at 1.0", () => {
      expect(getPayoutMultiplier(DEFAULT)).toBe(1.0);
    });
    it("payout increases with profit level", () => {
      expect(getPayoutMultiplier({ ...DEFAULT, profit: 5 })).toBe(1.1);
    });
    it("luck bonus is 0 at level 0", () => {
      expect(getLuckBonus(DEFAULT, "flip")).toBe(0);
    });
    it("luck bonus increases per level", () => {
      expect(getLuckBonus({ ...DEFAULT, luck_flip: 4 }, "flip")).toBeCloseTo(0.02);
    });
    it("shield bonus matches level", () => {
      expect(getShieldBonus({ ...DEFAULT, shield: 3 })).toBe(3);
    });
    it("free plays every 5 speed levels", () => {
      expect(getExtraFreePlays({ ...DEFAULT, speed: 4 })).toBe(0);
      expect(getExtraFreePlays({ ...DEFAULT, speed: 5 })).toBe(1);
      expect(getExtraFreePlays({ ...DEFAULT, speed: 12 })).toBe(2);
    });
  });
});
