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
      mood = petData.care ? Math.round(getMoodMultiplier(petData.care) * 100) : 100;
      const moodFactor = mood / 100;

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

      // Bred pets: show all combined bonuses
      const bredBonuses = (active as any).bredBonuses as { bonus: string; perLevel: number }[] | undefined;
      if (bredBonuses && bredBonuses.length > 0) {
        for (const b of bredBonuses) {
          const val = +(b.perLevel * active.level * moodFactor * 100).toFixed(1);
          lines.push({
            source: `🧬 ${active.petName} LVL ${active.level} (${mood}%)`,
            effect: `+${val}% ${bonusLabels[b.bonus] ?? b.bonus}`,
            value: val,
            category: catMap[b.bonus] ?? b.bonus,
          });
        }
      } else {
        // Normal catalog pet
        const petDef = PET_CATALOG.find(p => p.id === active.petId);
        if (petDef) {
          const effectiveVal = +(petDef.perLevel * active.level * moodFactor).toFixed(3);
          lines.push({
            source: `🐾 ${petDef.emoji} ${active.petName} LVL ${active.level} (${mood}%)`,
            effect: `+${(effectiveVal * 100).toFixed(1)}% ${bonusLabels[petDef.bonus] ?? petDef.bonus}`,
            value: effectiveVal * 100,
            category: catMap[petDef.bonus] ?? petDef.bonus,
          });
        }
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
  // Calculate "all" bonus to add to every category
  const allBonus = lines.filter(l => l.category === "all").reduce((s, l) => s + l.value, 0);

  // Add "all" bonus to all percentage-based categories
  const allAppliesTo = ["luck_flip", "luck_slots", "luck_scratch", "payout", "specials", "boss_dmg", "xp", "heist", "mystery"];
  for (const cat of allAppliesTo) {
    if (!totals[cat] && allBonus > 0) {
      totals[cat] = { label: catLabels[cat] ?? cat, total: "" };
    }
  }

  for (const [cat, info] of Object.entries(totals)) {
    let sum = lines.filter(l => l.category === cat).reduce((s, l) => s + l.value, 0);
    // Add universal "all" bonus to each category
    if (cat !== "all" && cat !== "shield" && cat !== "free_plays" && cat !== "care" && allBonus > 0) {
      sum += allBonus;
    }
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
