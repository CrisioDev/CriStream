/**
 * Diminishing Returns — soft caps on bonuses
 * Formula: effective = cap * (1 - e^(-raw / cap))
 *
 * This means early investments feel strong but returns flatten.
 * Can never exceed cap, but approaches it asymptotically.
 */

const CAPS: Record<string, number> = {
  luck_flip: 0.25,      // max +25% flip chance (base 50% + 25% = 75%)
  luck_slots: 0.25,     // max +25%
  luck_scratch: 0.25,   // max +25%
  payout: 0.40,         // max +40% payout multiplier
  specials: 0.20,       // max +20% special trigger rate
  boss_dmg: 0.50,       // max +50% boss damage
  shield: 15,           // max +15 consolation bonus
  free_plays: 10,       // max +10 extra free plays
  // No cap on: xp, heist, mystery, care
};

export function applyDiminishing(category: string, rawValue: number): number {
  const cap = CAPS[category];
  if (cap === undefined) return rawValue; // no cap
  if (rawValue <= 0) return 0;
  return cap * (1 - Math.exp(-rawValue / cap));
}
