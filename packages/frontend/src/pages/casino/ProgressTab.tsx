import { api } from "@/api/client";
import { formatNumber } from "@/lib/format-number";
import type { Quest, Achievement, SeasonData, SeasonReward, PlayerStats } from "./types";

const QUEST_DIFF_COLORS: Record<string, string> = {
  easy: "from-green-500/40 to-green-600/20",
  medium: "from-blue-500/40 to-blue-600/20",
  hard: "from-purple-500/40 to-purple-600/20",
  bonus: "from-yellow-500/40 to-yellow-600/20",
};
const QUEST_BORDER_COLORS: Record<string, string> = {
  easy: "border-green-500/50",
  medium: "border-blue-500/50",
  hard: "border-purple-500/50",
  bonus: "border-yellow-500/50",
};
const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-500/40",
  uncommon: "border-green-500/50",
  rare: "border-blue-500/60",
  epic: "border-purple-500/60",
  legendary: "border-yellow-500/70",
};
const RARITY_BG: Record<string, string> = {
  common: "rgba(107,114,128,0.1)",
  uncommon: "rgba(34,197,94,0.1)",
  rare: "rgba(59,130,246,0.1)",
  epic: "rgba(168,85,247,0.15)",
  legendary: "rgba(255,215,0,0.15)",
};
const RARITY_LABELS: Record<string, string> = {
  common: "Gewohnlich",
  uncommon: "Ungewohnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendar",
};
const CATEGORY_NAMES: Record<string, string> = {
  start: "\uD83C\uDFAE Erste Schritte", milestone: "\uD83C\uDFC5 Meilensteine", luck: "\uD83C\uDF40 Gluck",
  pech: "😢 Pech", specials: "\uD83C\uDF81 Specials", double: "⚡ Doppelt-oder-Nichts",
  social: "\uD83D\uDC65 Sozial", grind: "\uD83D\uDCAA Ausdauer", legendary: "\uD83C\uDF1F Legendar",
};

function formatCountdown(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "Jetzt!";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function formatQuestReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

interface ProgressTabProps {
  user: any;
  channelName: string;
  quests: Quest[];
  achievements: Achievement[];
  achievementStats: { unlocked: number; total: number };
  openCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  season: SeasonData | null;
  seasonLeaderboard: { displayName: string; xp: number; level: number }[];
  showSeasonLb: boolean;
  setShowSeasonLb: (v: boolean) => void;
  claimingLevel: number | null;
  autoFlip: { active: boolean; prestige: number; interval: number; totalFlips: number; totalWon: number } | null;
  setAutoFlip: (fn: (prev: any) => any) => void;
  skillData: { skills: any; details: any[]; totalLevel: number; totalInvested: number } | null;
  setSkillData: (v: any) => void;
  upgrading: string | null;
  setUpgrading: (v: string | null) => void;
  playerStats: PlayerStats | null;
  statsOpen: boolean;
  setStatsOpen: (v: boolean) => void;
  tickets: any;
  tournament: { weekNumber: number; startDate: string; endDate: string; daysLeft: number } | null;
  tournamentLb: { displayName: string; score: number; rank: number }[];
  showTournamentLb: boolean;
  setShowTournamentLb: (v: boolean) => void;
  setSeason: (fn: (prev: SeasonData | null) => SeasonData | null) => void;
  setMessage: (v: string | null) => void;
  fetchPoints: () => void;
  fetchSeason: () => void;
  fetchSeasonLeaderboard: () => void;
  fetchTournamentLeaderboard: () => void;
  claimLevel: (level: number) => void;
  buyPremium: () => void;
  confettiRef: React.RefObject<HTMLDivElement | null>;
  spawnConfetti: (container: HTMLDivElement, count?: number, goldOnly?: boolean) => void;
}

export function ProgressTab(props: ProgressTabProps) {
  const {
    user, channelName, quests, achievements, achievementStats, openCategories, toggleCategory,
    season, seasonLeaderboard, showSeasonLb, setShowSeasonLb, claimingLevel,
    autoFlip, setAutoFlip, skillData, setSkillData, upgrading, setUpgrading,
    playerStats, statsOpen, setStatsOpen, tickets,
    tournament, tournamentLb, showTournamentLb, setShowTournamentLb,
    setSeason, setMessage, fetchPoints, fetchSeason, fetchSeasonLeaderboard, fetchTournamentLeaderboard,
    claimLevel, buyPremium,
  } = props;

  if (!user) return null;

  const achievementsByCategory = achievements.reduce<Record<string, Achievement[]>>((acc, ach) => {
    const cat = ach.category || "Sonstige";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(ach);
    return acc;
  }, {});

  const allRewardLevels = season ? [...new Set((season.season.rewards ?? []).map((r: SeasonReward) => r.level))].sort((a, b) => a - b) : [];
  const REWARD_LEVELS = allRewardLevels.length > 0 ? allRewardLevels : [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  return (
    <>
      {/* ── DAILY QUESTS ── */}
      {quests.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg text-yellow-400">{"\uD83D\uDCCB"} TAGLICHE QUESTS</h3>
            <span className="text-xs text-gray-500">Neue Quests in {formatQuestReset()}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quests.map(quest => (
              <div key={quest.id} className={`relative rounded-2xl p-4 border ${QUEST_BORDER_COLORS[quest.difficulty] || "border-gray-500/30"} ${quest.done ? "ring-1 ring-green-500/50" : ""}`}
                style={{ background: `linear-gradient(135deg, ${quest.done ? "rgba(34,197,94,0.1), rgba(34,197,94,0.05)" : QUEST_DIFF_COLORS[quest.difficulty]?.replace("from-", "").replace(" to-", ", ") || "rgba(255,255,255,0.05), rgba(255,255,255,0.02)"})` }}>
                {quest.done && (
                  <div className="absolute top-2 right-2 text-2xl" style={{ filter: "drop-shadow(0 0 8px rgba(34,197,94,0.8))" }}>✅</div>
                )}
                <h4 className="font-bold text-white text-sm mb-2">{quest.name}</h4>
                <div className="relative h-3 rounded-full overflow-hidden mb-1" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                    background: quest.done ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #9146ff, #a78bfa)",
                  }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{quest.progress}/{quest.target}</span>
                  <span className="text-yellow-400 font-bold">+{quest.reward} Pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BATTLE PASS / SEASON ── */}
      {season && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.08), rgba(0,0,0,0.3))", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg text-purple-300">{"\uD83C\uDF96️"} {season.season.name}</h3>
                <span className="text-xs text-gray-500">Saison {season.season.number} · Endet in {formatCountdown(season.season.endDate)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bp-glow rounded-full px-4 py-1.5 font-black text-lg" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>
                  LVL {season.progress.level}
                </div>
                {season.progress.premium ? (
                  <span className="text-xs text-yellow-400 font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>PREMIUM</span>
                ) : (
                  <button onClick={buyPremium} className="casino-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))",
                    border: "1px solid rgba(255,215,0,0.4)", color: "#ffd700",
                  }}>Premium kaufen (500 Pts)</button>
                )}
              </div>
            </div>
            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{season.progress.xpIntoCurrentLevel ?? season.progress.xp} / {season.nextLevelXp} XP</span>
                <span>Gesamt: {season.progress.xp} XP</span>
              </div>
              <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{
                  width: `${Math.min(100, ((season.progress.xpIntoCurrentLevel ?? season.progress.xp) / season.nextLevelXp) * 100)}%`,
                  background: "linear-gradient(90deg, #9146ff, #c084fc)",
                }} />
              </div>
            </div>
            {/* Reward Track */}
            <div className="bp-track overflow-x-auto pb-2 mb-3" style={{ scrollSnapType: "x mandatory" }}>
              <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                {REWARD_LEVELS.map(level => {
                  const reached = season.progress.level >= level;
                  const claimed = season.progress.claimedLevels.includes(level);
                  const canClaim = reached && !claimed;
                  const rewards = (season.season.rewards ?? []).filter((r: SeasonReward) => r.level === level);
                  const freeRewards = rewards.filter((r: SeasonReward) => !r.premium);
                  const premiumRewards = rewards.filter((r: SeasonReward) => r.premium);
                  const rewardIcon = (r: SeasonReward) => r.type === "points" ? "\uD83D\uDCB0" : r.type === "title" ? "\uD83C\uDFF7️" : r.type === "autoflip" ? "\uD83E\uDD16" : "\uD83D\uDCE6";
                  const prestigeLevel = autoFlip?.prestige ?? 0;
                  const seasonMult = Math.pow(10, prestigeLevel);
                  const rewardText = (r: SeasonReward) => {
                    if (r.type === "points") {
                      const scaled = Math.round(Number(r.value) * seasonMult);
                      return seasonMult > 1 ? `${formatNumber(scaled)} Pts (x${formatNumber(seasonMult)})` : `${formatNumber(Number(r.value))} Pts`;
                    }
                    if (r.type === "title") return `"${r.value}"`;
                    if (r.type === "autoflip") return `${r.value}`;
                    if (r.type === "lootbox") {
                      const scaled = Math.round(Number(r.value) * 50 * seasonMult);
                      return seasonMult > 1 ? `${formatNumber(scaled)} Pts (x${formatNumber(seasonMult)})` : `${r.value}x Lootbox`;
                    }
                    return String(r.value);
                  };
                  return (
                    <div key={level} className={`flex-shrink-0 w-28 text-center rounded-xl p-2 ${canClaim ? "bp-unclaimed" : ""}`}
                      style={{
                        scrollSnapAlign: "start",
                        background: claimed ? "rgba(34,197,94,0.15)" : reached ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
                        border: `2px solid ${claimed ? "rgba(34,197,94,0.5)" : reached ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                        opacity: reached ? 1 : 0.5,
                      }}>
                      <div className="text-xs text-gray-400 mb-1">LVL {level}</div>
                      {freeRewards.map((r: SeasonReward, i: number) => (
                        <div key={i} className="text-xs mb-0.5"><span>{rewardIcon(r)} {rewardText(r)}</span></div>
                      ))}
                      {premiumRewards.length > 0 && (
                        <div className="mt-1 border-t border-yellow-500/20 pt-1">
                          {premiumRewards.map((r: SeasonReward, i: number) => (
                            <div key={i} className={`text-xs ${season.progress.premium ? "text-yellow-400" : "text-gray-600"}`}>
                              <span>⭐ {rewardText(r)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-1">
                        {canClaim ? (
                          <button onClick={() => claimLevel(level)} disabled={claimingLevel !== null}
                            className="casino-btn text-xs font-bold px-2 py-0.5 rounded-full w-full"
                            style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>Claim</button>
                        ) : claimed ? (
                          <span className="text-xs text-green-400">✅ Erhalten</span>
                        ) : (
                          <span className="text-xs text-gray-600">{level - season.progress.level} LVL</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Season Leaderboard */}
            <button onClick={() => { setShowSeasonLb(!showSeasonLb); if (!showSeasonLb) fetchSeasonLeaderboard(); }}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold">
              {showSeasonLb ? "▲ Saison-Rangliste ausblenden" : "▼ Saison-Rangliste anzeigen"}
            </button>
            {showSeasonLb && seasonLeaderboard.length > 0 && (
              <div className="mt-3 space-y-1">
                {seasonLeaderboard.map((entry, i) => {
                  const medal = i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `${i+1}.`;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{ background: i < 3 ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.02)" }}>
                      <span className="w-6 text-center shrink-0">{medal}</span>
                      <span className={`flex-1 truncate ${i < 3 ? "font-bold text-purple-300" : "text-white"}`}>
                        {entry.displayName}
                        {(entry as any).prestige > 0 && <span className="ml-1 text-[9px] text-yellow-400">P{(entry as any).prestige}</span>}
                      </span>
                      <span className="text-purple-400 font-bold">LVL {entry.level}</span>
                      <span className="text-gray-500">{formatNumber(entry.xp)} XP</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Prestige */}
            {season.progress.level >= 50 && (
              <div className="mt-4 rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(255,215,0,0.3)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-yellow-300">⭐ PRESTIGE</h4>
                  {autoFlip && <span className="text-xs text-purple-400">Prestige {autoFlip.prestige}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-3">Setze den Battle Pass zuruck und schalte einen Auto-Munzwurf-Bot frei. Jedes Prestige-Level macht ihn schneller!</p>
                {!autoFlip || autoFlip.prestige === 0 ? (
                  <button onClick={async () => {
                    try {
                      const res = await api.post<any>(`/viewer/${channelName}/casino/prestige`, {}) as any;
                      if (res.success) { fetchSeason(); fetchPoints(); }
                      else setMessage(res.error ?? "Fehler!");
                    } catch { setMessage("Fehler!"); }
                  }} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                    ⭐ PRESTIGE MACHEN
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-yellow-300 font-bold">{"\uD83E\uDD16"} Auto-Flipper</span>
                        <span className="text-gray-400 ml-2">alle {autoFlip.interval}s</span>
                      </div>
                      <button onClick={async () => {
                        try {
                          const res = await api.post<any>(`/viewer/${channelName}/casino/autoflip/toggle`, {}) as any;
                          if (res.data) setAutoFlip((af: any) => af ? { ...af, active: res.data.active } : af);
                        } catch { /* */ }
                      }} className={`px-3 py-1 rounded-full text-xs font-bold ${autoFlip.active ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-red-500/20 text-red-400 border border-red-500/40"}`}>
                        {autoFlip.active ? "AN" : "AUS"}
                      </button>
                      <button onClick={async () => {
                        try {
                          const res = await api.post<any>(`/viewer/${channelName}/casino/prestige`, {}) as any;
                          if (res.success) { fetchSeason(); fetchPoints(); }
                          else setMessage(res.error ?? "Fehler!");
                        } catch { setMessage("Fehler!"); }
                      }} className="casino-btn px-4 py-1 rounded-full text-xs font-bold text-black" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                        ⭐ Nachstes Prestige
                      </button>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Flips: {autoFlip.totalFlips}</span>
                      <span>Gewonnen: {autoFlip.totalWon}</span>
                      <span>Rate: {autoFlip.totalFlips > 0 ? Math.round(autoFlip.totalWon / autoFlip.totalFlips * 100) : 0}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BINGO & LOTTO ── */}
      <div className="max-w-4xl mx-auto px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-2xl">{"\uD83C\uDFB1"}</span>
          <h3 className="font-black text-blue-300">BINGO</h3>
          <p className="text-xs text-gray-500">!bingo (10 Pts) · Taglich 07:00 · Bis 500 Pts</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-2xl">{"\uD83C\uDF40"}</span>
          <h3 className="font-black text-green-300">LOTTO</h3>
          <p className="text-xs text-gray-500">!lotto (50 Pts) · Sonntag 10:00 · Bis 10.000 Pts JACKPOT</p>
        </div>
      </div>

      {/* Tickets */}
      <div className="max-w-4xl mx-auto px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets?.bingo ? (
          <div className="rounded-2xl p-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <h4 className="font-black text-blue-300 mb-1">{"\uD83C\uDFB1"} Dein Bingo-Ticket</h4>
            <p className="text-lg font-mono font-bold text-white">{tickets.bingo.numbers.join(" · ")}</p>
            {tickets.lastBingoDraw && (
              <div className="mt-2 text-xs text-gray-400">
                <span>Letzte Ziehung: </span>
                <span className="text-blue-400 font-mono">{tickets.lastBingoDraw.numbers.join(" · ")}</span>
                {(() => {
                  const matches = tickets.bingo.numbers.filter((n: number) => tickets.lastBingoDraw.numbers.includes(n)).length;
                  return matches > 0 ? <span className="text-yellow-400 ml-1">({matches} Treffer!)</span> : null;
                })()}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Nachste Ziehung: 07:00 · !bingo (10 Pts)</p>
          </div>
        ) : (
          <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(59,130,246,0.05)", border: "1px dashed rgba(59,130,246,0.2)" }}>
            <h4 className="font-black text-blue-300/50 mb-1">{"\uD83C\uDFB1"} Bingo</h4>
            <p className="text-xs text-gray-600">Kein Ticket · Schreibe !bingo im Chat (10 Pts)</p>
          </div>
        )}
        {tickets?.lotto ? (
          <div className="rounded-2xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <h4 className="font-black text-green-300 mb-1">{"\uD83C\uDF40"} Dein Lottoschein</h4>
            <p className="text-lg font-mono font-bold text-white">{tickets.lotto.numbers.join(" · ")}</p>
            {tickets.lastLottoDraw && (
              <div className="mt-2 text-xs text-gray-400">
                <span>Letzte Ziehung: </span>
                <span className="text-green-400 font-mono">{tickets.lastLottoDraw.numbers.join(" · ")}</span>
                {(() => {
                  const matches = tickets.lotto.numbers.filter((n: number) => tickets.lastLottoDraw.numbers.includes(n)).length;
                  return matches > 0 ? <span className="text-yellow-400 ml-1">({matches} Richtige!)</span> : null;
                })()}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Nachste Ziehung: Sonntag 10:00 · !lotto (50 Pts)</p>
          </div>
        ) : (
          <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(34,197,94,0.05)", border: "1px dashed rgba(34,197,94,0.2)" }}>
            <h4 className="font-black text-green-300/50 mb-1">{"\uD83C\uDF40"} Lotto</h4>
            <p className="text-xs text-gray-600">Kein Schein · Schreibe !lotto im Chat (50 Pts)</p>
          </div>
        )}
      </div>

      {/* ── TOURNAMENT ── */}
      {tournament && (
        <div className="max-w-2xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(99,102,241,0.08), rgba(59,130,246,0.05))",
            border: "1px solid rgba(99,102,241,0.3)",
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg text-indigo-300">{"\uD83C\uDFDF️"} WOCHENTURNIER</h3>
              <span className="text-xs px-2 py-1 rounded-full font-bold" style={{
                background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8",
              }}>Woche {tournament.weekNumber}</span>
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-300">{tournament.daysLeft}</div>
                <div className="text-[10px] text-gray-500">Tage ubrig</div>
              </div>
              <div className="text-center text-xs text-gray-500">
                {new Date(tournament.startDate).toLocaleDateString("de-DE")} – {new Date(tournament.endDate).toLocaleDateString("de-DE")}
              </div>
            </div>
            <button onClick={() => { setShowTournamentLb(!showTournamentLb); if (!showTournamentLb) fetchTournamentLeaderboard(); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">
              {showTournamentLb ? "▲ Rangliste ausblenden" : "▼ Turnier-Rangliste anzeigen"}
            </button>
            {showTournamentLb && tournamentLb.length > 0 && (
              <div className="mt-3 space-y-1">
                {tournamentLb.map((entry, i) => {
                  const medal = i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `${i + 1}.`;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{ background: i < 3 ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)" }}>
                      <span className="w-6 text-center shrink-0">{medal}</span>
                      <span className={`flex-1 truncate ${i < 3 ? "font-bold text-indigo-300" : "text-white"}`}>{entry.displayName}</span>
                      <span className="text-indigo-400 font-bold">{formatNumber(entry.score)} Pts</span>
                    </div>
                  );
                })}
              </div>
            )}
            {showTournamentLb && tournamentLb.length === 0 && (
              <p className="text-xs text-gray-600 mt-2">Noch keine Teilnehmer diese Woche.</p>
            )}
          </div>
        </div>
      )}

      {/* ── SKILL TREE ── */}
      {skillData && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.05), rgba(0,0,0,0.2))", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-purple-300">{"\uD83C\uDF33"} SKILL TREE</h3>
              <div className="text-xs text-gray-500">Level {skillData.totalLevel} · {formatNumber(skillData.totalInvested)} Pts investiert</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {skillData.details.map((skill: any) => (
                <div key={skill.id} className="rounded-xl p-3 text-center" style={{
                  background: skill.level > 0 ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.02)",
                  border: `2px solid ${skill.level > 0 ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  <div className="text-2xl mb-1">{skill.emoji}</div>
                  <div className="text-xs font-bold text-white mb-0.5">{skill.name}</div>
                  <div className="text-lg font-black text-purple-300">LVL {skill.level}</div>
                  <div className="text-[10px] text-gray-400 mb-1">{skill.perLevel}</div>
                  <div className="text-[10px] text-purple-400 mb-2">{skill.effect}</div>
                  <button
                    onClick={async () => {
                      setUpgrading(skill.id);
                      try {
                        const res = await api.post<any>(`/viewer/${channelName}/casino/skills/upgrade`, { skill: skill.id }) as any;
                        if (res.success) {
                          const sk = await api.get<any>(`/viewer/${channelName}/casino/skills`) as any;
                          if (sk.data) setSkillData(sk.data);
                          fetchPoints();
                        } else setMessage(res.error ?? "Fehler!");
                      } catch { setMessage("Fehler!"); }
                      setUpgrading(null);
                    }}
                    disabled={upgrading !== null}
                    className="casino-btn w-full py-1.5 rounded-lg text-xs font-bold text-black"
                    style={{ background: upgrading === skill.id ? "#666" : "linear-gradient(135deg, #9146ff, #6441a5)" }}>
                    {upgrading === skill.id ? "..." : `⬆ ${formatNumber(skill.nextCost)} Pts`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYER STATS ── */}
      {playerStats && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => setStatsOpen(!statsOpen)} className="w-full flex items-center justify-between">
              <h3 className="font-black text-sm text-gray-400">{"\uD83D\uDCCA"} DEINE STATISTIKEN</h3>
              <span className="text-xs text-gray-600">{statsOpen ? "▲" : "▼"}</span>
            </button>
            {statsOpen && (() => {
              const s = playerStats;
              const winRate = s.totalPlays > 0 ? (s.totalWins / s.totalPlays * 100) : 0;
              const favGame = [
                { name: "Slots", count: s.slotsPlayed },
                { name: "Scratch", count: s.scratchPlayed },
                { name: "Flip", count: s.flipPlayed },
              ].sort((a, b) => b.count - a.count)[0];
              return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {[
                  { val: formatNumber(s.totalPlays), label: "Spiele gesamt", color: "text-white" },
                  { val: `${winRate.toFixed(1)}%`, label: "Gewinnrate", color: "text-green-400" },
                  { val: String(s.maxStreak), label: "Bester Streak", color: "text-yellow-400" },
                  { val: `+${formatNumber(s.totalPointsWon)}`, label: "Gewonnen", color: "text-green-400" },
                  { val: `-${formatNumber(s.totalPointsLost)}`, label: "Verloren", color: "text-red-400" },
                  { val: String(s.bossesKilled), label: "Boss Kills", color: "text-red-500" },
                  { val: formatNumber(s.maxDoubleAmount), label: "Grosster Double", color: "text-yellow-300" },
                  { val: String(s.questsCompleted), label: "Quests erledigt", color: "text-purple-400" },
                  { val: String(s.heistsPlayed), label: "Heists gespielt", color: "text-cyan-400" },
                  { val: `${s.allInsWon}/${s.allInsPlayed}`, label: "All-In (W/Total)", color: "text-red-400" },
                  { val: `${s.doublesWon}/${s.doublesPlayed}`, label: "Doppelungen", color: "text-orange-400" },
                  { val: favGame?.name ?? "—", label: "Lieblingsspiel", color: "text-pink-400" },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className={`text-xl font-black ${stat.color}`}>{stat.val}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS ── */}
      {achievements.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="font-black text-lg text-yellow-400 mb-4">
              {"\uD83C\uDFC6"} {achievementStats.unlocked}/{achievementStats.total} Achievements
            </h3>
            {Object.entries(achievementsByCategory).map(([category, achs]) => {
              const isOpen = openCategories.has(category);
              const unlockedInCat = achs.filter(a => a.unlocked).length;
              return (
                <div key={category} className="mb-2">
                  <button onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-left hover:bg-white/5 transition-colors"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="font-bold text-sm text-gray-300">{CATEGORY_NAMES[category] ?? category}</span>
                    <span className="text-xs text-gray-500">{unlockedInCat}/{achs.length} {isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 ml-2">
                      {achs.map(ach => (
                        <div key={ach.id} className={`rounded-xl p-3 border-2 ${RARITY_COLORS[ach.rarity] || "border-gray-500/30"} ${!ach.unlocked ? "opacity-50 grayscale" : ""}`}
                          style={{ background: ach.unlocked ? (RARITY_BG[ach.rarity] || "rgba(255,255,255,0.03)") : "rgba(0,0,0,0.2)" }}>
                          <div className="flex items-start gap-2">
                            <span className="text-xl shrink-0">{ach.unlocked ? "\uD83C\uDFC6" : "\uD83D\uDD12"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white truncate">{ach.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  ach.rarity === "legendary" ? "text-yellow-300 bg-yellow-500/20" :
                                  ach.rarity === "epic" ? "text-purple-300 bg-purple-500/20" :
                                  ach.rarity === "rare" ? "text-blue-300 bg-blue-500/20" :
                                  ach.rarity === "uncommon" ? "text-green-300 bg-green-500/20" :
                                  "text-gray-400 bg-gray-500/20"
                                }`}>{RARITY_LABELS[ach.rarity] || ach.rarity}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{ach.description}</p>
                              {ach.unlocked && ach.unlockedAt && (
                                <p className="text-[10px] text-gray-600 mt-0.5">
                                  Freigeschaltet: {new Date(ach.unlockedAt).toLocaleDateString("de-DE")}
                                </p>
                              )}
                              {ach.reward > 0 && (
                                <span className="text-[10px] text-yellow-400 font-bold">+{ach.reward} Pts</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
