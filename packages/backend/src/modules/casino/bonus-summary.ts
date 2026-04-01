import { getSkills, getLuckBonus, getPayoutMultiplier, getShieldBonus, getExtraFreePlays, getSpecialBonus, getCombatMultiplier, type SkillLevels } from "./skilltree.js";
import { getPetBonuses, getPet, PET_CATALOG, ITEM_CATEGORIES, getMoodMultiplier, type PetData } from "./pets.js";

interface BonusLine {
  source: string;  // e.g. "Skill: Münzglück LVL 3"
  effect: string;  // e.g. "+1.5% Flip-Chance"
  value: number;   // raw numeric value
  category: string; // "luck_flip", "payout", "shield", etc.
}

export async function getFullBonusSummary(channelId: string, userId: string): Promise<{
  lines: BonusLine[];
  totals: Record<string, { label: string; total: string }>;
  mood: number;
}> {
  const lines: BonusLine[] = [];

  // ── Skill Tree ──
  const skills = await getSkills(channelId, userId);
  if (skills.luck_flip > 0) lines.push({ source: `🪙 Münzglück LVL ${skills.luck_flip}`, effect: `+${(skills.luck_flip * 0.5).toFixed(1)}% Flip-Chance`, value: skills.luck_flip * 0.5, category: "luck_flip" });
  if (skills.luck_slots > 0) lines.push({ source: `🎰 Slot-Glück LVL ${skills.luck_slots}`, effect: `+${(skills.luck_slots * 0.5).toFixed(1)}% Slot-Chance`, value: skills.luck_slots * 0.5, category: "luck_slots" });
  if (skills.luck_scratch > 0) lines.push({ source: `🎟️ Rubbelglück LVL ${skills.luck_scratch}`, effect: `+${(skills.luck_scratch * 0.5).toFixed(1)}% Scratch-Chance`, value: skills.luck_scratch * 0.5, category: "luck_scratch" });
  if (skills.profit > 0) lines.push({ source: `💰 Profit LVL ${skills.profit}`, effect: `+${(skills.profit * 2)}% Payout`, value: skills.profit * 2, category: "payout" });
  if (skills.shield > 0) lines.push({ source: `🛡️ Schutz LVL ${skills.shield}`, effect: `+${skills.shield} Trostpreis`, value: skills.shield, category: "shield" });
  if (skills.speed > 0) lines.push({ source: `⚡ Tempo LVL ${skills.speed}`, effect: `+${Math.floor(skills.speed / 5)} Free Plays`, value: Math.floor(skills.speed / 5), category: "free_plays" });
  if (skills.specials > 0) lines.push({ source: `🌟 Specials LVL ${skills.specials}`, effect: `+${(skills.specials * 0.5).toFixed(1)}% Special-Rate`, value: skills.specials * 0.5, category: "specials" });
  if (skills.combat > 0) lines.push({ source: `⚔️ Kampf LVL ${skills.combat}`, effect: `+${skills.combat * 5}% Boss-DMG`, value: skills.combat * 5, category: "boss_dmg" });

  // ── Pet Bonus ──
  const petData = await getPet(channelId, userId);
  let mood = 100;
  if (petData) {
    const active = petData.pets.find(p => p.petId === petData.activePetId);
    if (active) {
      const petDef = PET_CATALOG.find(p => p.id === active.petId);
      if (petDef) {
        mood = petData.care ? Math.round(getMoodMultiplier(petData.care) * 100) : 100;
        const moodFactor = mood / 100;
        const effectiveVal = +(petDef.perLevel * active.level * moodFactor).toFixed(3);

        const bonusLabels: Record<string, string> = {
          flip_luck: "Flip-Chance", shield: "Trostpreis", free_plays: "Free Plays",
          specials: "Special-Rate", payout: "Payout", boss_dmg: "Boss-DMG",
          slots_luck: "Slot-Chance", scratch_luck: "Scratch-Chance",
          mystery: "Mystery Bonus", xp: "XP Bonus", heist: "Heist Bonus", all: "ALLES",
        };
        const catMap: Record<string, string> = {
          flip_luck: "luck_flip", shield: "shield", free_plays: "free_plays",
          specials: "specials", payout: "payout", boss_dmg: "boss_dmg",
          slots_luck: "luck_slots", scratch_luck: "luck_scratch",
          mystery: "mystery", xp: "xp", heist: "heist", all: "all",
        };

        lines.push({
          source: `🐾 ${petDef.emoji} ${active.petName} LVL ${active.level} (${mood}% Stimmung)`,
          effect: `+${(effectiveVal * 100).toFixed(1)}% ${bonusLabels[petDef.bonus] ?? petDef.bonus}`,
          value: effectiveVal * 100,
          category: catMap[petDef.bonus] ?? petDef.bonus,
        });
      }

      // ── Item Bonuses ──
      for (const cat of ITEM_CATEGORIES) {
        const equipped = petData.equipped[cat.category as keyof PetData["equipped"]];
        if (!equipped) continue;
        const tier = cat.tiers.find(t => t.emoji === equipped);
        if (!tier) continue;
        const scaled = +(tier.bonusValue * (1 + active.level * 0.05)).toFixed(1);
        lines.push({
          source: `${tier.emoji} ${tier.name} (${cat.name})`,
          effect: `+${scaled} ${cat.bonusDesc}`,
          value: scaled,
          category: String(cat.bonusType),
        });
      }
    }
  }

  // ── Aggregate totals ──
  const totals: Record<string, { label: string; total: string }> = {};
  const catLabels: Record<string, string> = {
    luck_flip: "Flip-Chance", luck_slots: "Slot-Chance", luck_scratch: "Scratch-Chance",
    payout: "Payout-Bonus", shield: "Trostpreis-Bonus", free_plays: "Extra Free Plays",
    specials: "Special-Rate", boss_dmg: "Boss-Schaden", xp: "XP-Bonus",
    heist: "Heist-Bonus", mystery: "Mystery-Bonus", all: "Universal-Bonus", care: "Fütter-Bonus",
  };

  for (const line of lines) {
    if (!totals[line.category]) {
      totals[line.category] = { label: catLabels[line.category] ?? line.category, total: "" };
    }
  }
  for (const [cat, info] of Object.entries(totals)) {
    const sum = lines.filter(l => l.category === cat).reduce((s, l) => s + l.value, 0);
    if (cat === "shield" || cat === "free_plays") {
      info.total = `+${Math.floor(sum)}`;
    } else if (cat === "care") {
      info.total = `+${sum.toFixed(0)}`;
    } else {
      info.total = `+${sum.toFixed(1)}%`;
    }
  }

  return { lines, totals, mood };
}
