import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

// ── Types ──
interface CasinoSpecial {
  type: string;
  points?: number;
  message: string;
  animationData?: Record<string, any>;
}

interface Quest {
  id: string;
  name: string;
  target: number;
  progress: number;
  reward: number;
  done: boolean;
  difficulty: "easy" | "medium" | "hard" | "bonus";
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  unlockedAt?: string;
  reward: number;
}

interface PlayerStats {
  totalPlays: number;
  totalWins: number;
  totalPointsWon: number;
  totalPointsLost: number;
  maxStreak: number;
  currentStreak: number;
  maxLossStreak: number;
  slotsPlayed: number;
  scratchPlayed: number;
  flipPlayed: number;
  triplesHit: number;
  jackpots777: number;
  doublesWon: number;
  doublesPlayed: number;
  maxDoubleStreak: number;
  maxDoubleAmount: number;
  mysteryBoxes: number;
  bossesKilled: number;
  bossDamageDealt: number;
  specialsTriggered: number;
  questsCompleted: number;
  daysPlayed: number;
  gluecksradSpins: number;
  giftsTriggered: number;
  allInsPlayed: number;
  allInsWon: number;
  heistsPlayed: number;
  [key: string]: any;
}

interface SeasonReward { level: number; type: "points" | "title" | "lootbox" | "autoflip"; value: string | number; premium: boolean; }
interface SeasonData {
  season: { name: string; number: number; startDate: string; endDate: string; rewards: SeasonReward[] };
  progress: { xp: number; xpIntoCurrentLevel?: number; level: number; premium: boolean; claimedLevels: number[] };
  nextLevelXp: number;
}

interface HeistState {
  active: boolean;
  phase?: "lobby" | "playing" | "betrayal" | "finished";
  players?: { displayName: string; ready?: boolean; result?: any }[];
  countdown?: number;
  round?: number;
  totalRounds?: number;
  pot?: number;
  results?: { displayName: string; payout: number; betrayed?: boolean }[];
  createdBy?: string;
}

interface Progression {
  stats: PlayerStats;
  newAchievements: { id: string; name: string; reward: number }[];
  questUpdates: { id: string; name: string; progress: number; target: number; done: boolean; reward: number }[];
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  seasonRewards: any[];
}

// ── Helpers ──
function spawnConfetti(container: HTMLDivElement, count = 60, goldOnly = false) {
  const colors = goldOnly
    ? ["#ffd700", "#ffb300", "#ff8c00", "#ffe066", "#fff2a0"]
    : ["#ffd700", "#ff6b6b", "#4ade80", "#60a5fa", "#f472b6", "#a78bfa", "#ff8c00"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}%;top:-10px;border-radius:${Math.random()>0.5?"50%":"2px"};pointer-events:none;z-index:100;animation:confetti-fall ${1.5+Math.random()*2}s ease-out forwards;opacity:0.9;`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

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
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
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

// ── Component ──
export function CasinoPage() {
  const { user } = useAuthStore();
  const [channelInput, setChannelInput] = useState("");
  const confettiRef = useRef<HTMLDivElement>(null);
  const channelName = channelInput || "TheCrisio";

  // Handle token from OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refresh = params.get("refresh");
    if (token && refresh) {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refresh);
      window.history.replaceState({}, "", "/casino");
      window.location.reload();
    }
  }, []);

  const [points, setPoints] = useState<number | null>(null);

  // Slots
  const [slotReels, setSlotReels] = useState(["❓", "❓", "❓"]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<{ text: string; win: boolean } | null>(null);

  // Scratch
  const [scratchCards, setScratchCards] = useState(["❓", "❓", "❓"]);
  const [scratchResult, setScratchResult] = useState<{ text: string; win: boolean } | null>(null);

  // Flip
  const [coinSide, setCoinSide] = useState<string | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<{ text: string; win: boolean } | null>(null);

  // Double or Nothing
  const [doubleAmount, setDoubleAmount] = useState(0);
  const [doubleActive, setDoubleActive] = useState(false);
  const [doubleResult, setDoubleResult] = useState<string | null>(null);
  const [doubleFlipping, setDoubleFlipping] = useState(false);

  // Streak & Stats (session)
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [multiplierAnim, setMultiplierAnim] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [freePlays, setFreePlays] = useState<{ flip: number; slots: number; scratch: number } | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ displayName: string; points: number }[]>([]);
  const [tickets, setTickets] = useState<any>(null);

  // ── Specials ──
  const [activeSpecial, setActiveSpecial] = useState<CasinoSpecial | null>(null);
  const specialsQueueRef = useRef<CasinoSpecial[]>([]);
  const [sirenActive, setSirenActive] = useState(false);
  const [cursedCoin, setCursedCoin] = useState(false);
  const [catWalk, setCatWalk] = useState(false);

  // Glucksrad
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [wheelUsed, setWheelUsed] = useState(false);

  // Boss Fight
  const [boss, setBoss] = useState<{ active: boolean; name?: string; hp?: number; maxHp?: number; participants?: number } | null>(null);

  // ── NEW: Daily Quests ──
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questBonusAnim, setQuestBonusAnim] = useState<string | null>(null);

  // ── NEW: Achievements ──
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<{ unlocked: number; total: number }>({ unlocked: 0, total: 0 });
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [newAchievementPopup, setNewAchievementPopup] = useState<{ name: string; reward: number } | null>(null);

  // ── NEW: Battle Pass / Season ──
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<{ displayName: string; xp: number; level: number }[]>([]);
  const [showSeasonLb, setShowSeasonLb] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  // Auto-Flip & Prestige
  const [autoFlip, setAutoFlip] = useState<{ active: boolean; prestige: number; interval: number; totalFlips: number; totalWon: number } | null>(null);

  // Skill Tree
  const [skillData, setSkillData] = useState<{ skills: any; details: any[]; totalLevel: number; totalInvested: number } | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // V-Pet
  const [pet, setPet] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [showShop, setShowShop] = useState(false);
  const [buyingPet, setBuyingPet] = useState(false);

  // ── NEW: All-In ──
  const [allInPlaying, setAllInPlaying] = useState(false);
  const [allInResult, setAllInResult] = useState<{ text: string; win: boolean } | null>(null);
  const [allInCooldown, setAllInCooldown] = useState<number>(0);
  const [allInShake, setAllInShake] = useState(false);

  // ── NEW: Heist ──
  const [heist, setHeist] = useState<HeistState | null>(null);
  const [heistMessage, setHeistMessage] = useState<string | null>(null);

  // ── NEW: Player Stats ──
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  // ── Process specials queue ──
  const processSpecial = useCallback((special: CasinoSpecial) => {
    setActiveSpecial(special);
    const t = special.type;
    if (t === "goldener_regen" && confettiRef.current) spawnConfetti(confettiRef.current, 100, true);
    if (t === "jackpot_sirene") { setSirenActive(true); setTimeout(() => setSirenActive(false), 3000); }
    if (t === "verfluchte_muenze") { setCursedCoin(true); setTimeout(() => setCursedCoin(false), 4000); }
    if (t === "schwarze_katze") { setCatWalk(true); setTimeout(() => setCatWalk(false), 3000); }
    if (t === "multiplikator" && confettiRef.current) spawnConfetti(confettiRef.current, 80);
    if (t === "mystery_box" && confettiRef.current) spawnConfetti(confettiRef.current, 40);
    if (t === "boss_kill" && confettiRef.current) spawnConfetti(confettiRef.current, 150);
    if (t === "geschenk_an_chat" && confettiRef.current) spawnConfetti(confettiRef.current, 60);
    setTimeout(() => {
      setActiveSpecial(null);
      const next = specialsQueueRef.current.shift();
      if (next) processSpecial(next);
    }, t === "multiplikator" ? 4000 : 3000);
  }, []);

  const enqueueSpecials = useCallback((specials: CasinoSpecial[]) => {
    if (!specials?.length) return;
    for (const s of specials) specialsQueueRef.current.push(s);
    if (!activeSpecial) {
      const next = specialsQueueRef.current.shift();
      if (next) processSpecial(next);
    }
  }, [activeSpecial, processSpecial]);

  // ── Process progression from gamble response ──
  const processProgression = useCallback((progression: Progression | undefined) => {
    if (!progression) return;

    // Update quests
    if (progression.questUpdates?.length) {
      setQuests(prev => {
        const updated = [...prev];
        for (const qu of progression.questUpdates) {
          const idx = updated.findIndex(q => q.id === qu.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx]!, progress: qu.progress, done: qu.done };
            if (qu.done && !prev[idx]!.done) {
              setQuestBonusAnim(`+${qu.reward} Quest Bonus!`);
              setTimeout(() => setQuestBonusAnim(null), 2500);
            }
          }
        }
        return updated;
      });
    }

    // New achievements popup
    if (progression.newAchievements?.length) {
      for (let i = 0; i < progression.newAchievements.length; i++) {
        const ach = progression.newAchievements[i]!;
        setTimeout(() => {
          setNewAchievementPopup({ name: ach.name, reward: ach.reward });
          if (confettiRef.current) spawnConfetti(confettiRef.current, 50, true);
          setTimeout(() => setNewAchievementPopup(null), 3000);
        }, i * 3500);
      }
      // Refresh achievements list
      fetchAchievements();
    }

    // Season XP / level up
    if (progression.xpGained && season) {
      setSeason(prev => {
        if (!prev) return prev;
        const newXp = prev.progress.xp + progression.xpGained;
        const newLevel = progression.levelUp ? progression.newLevel : prev.progress.level;
        return { ...prev, progress: { ...prev.progress, xp: newXp, level: newLevel } };
      });
    }

    // Stats
    if (progression.stats) {
      setPlayerStats(progression.stats);
    }
  }, [season]);

  // ── Fetches ──
  const fetchPoints = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/profile/${user.twitchId}`) as any;
      if (res.data) setPoints(res.data.points);
    } catch { /* */ }
  }, [user, channelName]);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  const fetchFree = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/free`) as any;
      if (res.data) setFreePlays(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  useEffect(() => { fetchFree(); }, [fetchFree]);

  // Fetch quests
  const fetchQuests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/quests`) as any;
      if (Array.isArray(res.data)) setQuests(res.data);
      else if (res.data?.quests) setQuests(res.data.quests);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/achievements`) as any;
      if (res.data) {
        setAchievements(res.data.achievements || []);
        setAchievementStats({ unlocked: res.data.unlocked ?? 0, total: res.data.total ?? 0 });
      }
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch season/battle pass
  const fetchSeason = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/season`) as any;
      if (res.data) setSeason(res.data);
      // Also fetch auto-flip status + skills
      const af = await api.get<any>(`/viewer/${channelName}/casino/autoflip`) as any;
      if (af.data) setAutoFlip(af.data);
      const sk = await api.get<any>(`/viewer/${channelName}/casino/skills`) as any;
      if (sk.data) setSkillData(sk.data);
      const pt = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any;
      setPet(pt.data);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch player stats
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/stats`) as any;
      if (res.data) setPlayerStats(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch heist
  const fetchHeist = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/heist`) as any;
      if (res.data) setHeist(res.data);
      else setHeist(null);
    } catch { setHeist(null); }
  }, [user, channelName]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchQuests();
      fetchAchievements();
      fetchSeason();
      fetchStats();
      fetchHeist();
    }
  }, [user, channelName, fetchQuests, fetchAchievements, fetchSeason, fetchStats, fetchHeist]);

  // Feed, leaderboard, boss polling
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const [f, l, b] = await Promise.all([
          api.get<any[]>(`/viewer/${channelName}/casino/feed`),
          api.get<any[]>(`/viewer/${channelName}/casino/leaderboard`),
          api.get<any>(`/viewer/${channelName}/casino/boss`),
        ]);
        if (f.data) setFeed(f.data);
        if (l.data) setLeaderboard(l.data);
        if (b.data) setBoss(b.data);
      } catch { /* */ }
      if (user) {
        try {
          const t = await api.get<any>(`/viewer/${channelName}/casino/tickets`);
          if (t.data) setTickets(t.data);
        } catch { /* */ }
      }
    };
    fetchFeed();
    const iv = setInterval(fetchFeed, 5000);
    return () => clearInterval(iv);
  }, [channelName, user]);

  // Heist polling when active
  useEffect(() => {
    if (!heist?.active) return;
    const iv = setInterval(fetchHeist, 3000);
    return () => clearInterval(iv);
  }, [heist?.active, fetchHeist]);

  // All-In cooldown timer
  useEffect(() => {
    if (allInCooldown <= 0) return;
    const iv = setInterval(() => {
      setAllInCooldown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [allInCooldown]);

  const showWin = (profit: number) => {
    setStreak(s => { const n = s + 1; if (n > maxStreak) setMaxStreak(n); return n; });
    setTotalWon(t => t + profit);
    if (profit >= 100 && confettiRef.current) spawnConfetti(confettiRef.current, Math.min(profit, 200));
    if (profit >= 200) showMultiplier("MEGA WIN!");
    else if (profit >= 50) showMultiplier("BIG WIN!");
    else if (profit >= 10) showMultiplier("WIN!");
  };

  const showLoss = (loss: number) => { setStreak(0); setTotalLost(t => t + loss); };
  const showMultiplier = (text: string) => { setMultiplierAnim(text); setTimeout(() => setMultiplierAnim(null), 2000); };

  // ── Double or Nothing ──
  const startDouble = (amount: number) => { setDoubleAmount(amount); setDoubleActive(true); setDoubleResult(null); };

  const playDouble = async () => {
    if (!user || doubleAmount <= 0) return;
    setDoubleFlipping(true); setDoubleResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "double", amount: doubleAmount }) as any;
      setTimeout(() => {
        setDoubleFlipping(false);
        if (!res.success) { setDoubleResult(res.error ?? "Fehler!"); setDoubleActive(false); fetchPoints(); return; }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        if (res.data.win) {
          const newAmount = doubleAmount * 2;
          setDoubleResult(`VERDOPPELT! ${newAmount} Punkte!`);
          setDoubleAmount(newAmount);
          showWin(doubleAmount);
          if (confettiRef.current && newAmount >= 200) spawnConfetti(confettiRef.current, 40);
        } else {
          setDoubleResult(`VERLOREN! ${doubleAmount} Punkte weg!`);
          showLoss(doubleAmount);
          setDoubleAmount(0); setDoubleActive(false);
        }
        fetchPoints();
      }, 800);
    } catch { setDoubleFlipping(false); setDoubleResult("Fehler!"); setDoubleActive(false); }
  };

  const cashOut = () => { setDoubleActive(false); setDoubleResult(`Eingesackt: ${doubleAmount} Punkte!`); setDoubleAmount(0); fetchPoints(); };

  // ── Game handlers ──
  const playSlots = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setSlotSpinning(true); setSlotResult(null); setDoubleActive(false);
    const symbols = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
    const iv = setInterval(() => setSlotReels([symbols[Math.floor(Math.random()*7)]!,symbols[Math.floor(Math.random()*7)]!,symbols[Math.floor(Math.random()*7)]!]), 80);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "slots" }) as any;
      setTimeout(() => {
        clearInterval(iv);
        if (!res.success) { setSlotReels(["❌","❌","❌"]); setSlotResult({ text: res.error, win: false }); setSlotSpinning(false); return; }
        setSlotReels(res.data.reels);
        const profit = res.data.payout - res.data.cost;
        setSlotResult({ text: `${res.data.label} → ${res.data.payout} Pts (${profit>=0?"+":""}${profit})${res.data.free ? " [GRATIS]" : ""}`, win: profit > 0 });
        if (res.data.freeLeft !== undefined) setFreePlays(f => f ? { ...f, slots: res.data.freeLeft } : f);
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); } else showLoss(-profit);
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        setSlotSpinning(false); fetchPoints();
      }, 1500);
    } catch { clearInterval(iv); setSlotResult({ text: "Fehler!", win: false }); setSlotSpinning(false); }
  };

  const playScratch = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setScratchCards(["❓","❓","❓"]); setScratchResult(null); setDoubleActive(false);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "scratch" }) as any;
      if (!res.success) { setScratchResult({ text: res.error, win: false }); return; }
      setTimeout(() => setScratchCards([res.data.symbols[0],"❓","❓"]), 400);
      setTimeout(() => setScratchCards([res.data.symbols[0],res.data.symbols[1],"❓"]), 900);
      setTimeout(() => {
        setScratchCards(res.data.symbols);
        const profit = res.data.payout - res.data.cost;
        setScratchResult({ text: `${res.data.label} → ${res.data.payout} Pts (${profit>=0?"+":""}${profit})${res.data.free ? " [GRATIS]" : ""}`, win: profit > 0 });
        if (res.data.freeLeft !== undefined) setFreePlays(f => f ? { ...f, scratch: res.data.freeLeft } : f);
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); } else showLoss(-profit);
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        fetchPoints();
      }, 1400);
    } catch { setScratchResult({ text: "Fehler!", win: false }); }
  };

  const playFlip = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setCoinFlipping(true); setCoinSide(null); setFlipResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "flip" }) as any;
      setTimeout(() => {
        setCoinFlipping(false);
        if (!res.success) { setFlipResult({ text: res.error, win: false }); return; }
        setCoinSide(res.data.result);
        setFlipResult({ text: `${res.data.win ? "GEWONNEN!" : "Verloren!"} ${res.data.payout - res.data.cost >= 0 ? "+" : ""}${res.data.payout - res.data.cost}${res.data.free ? " [GRATIS]" : ""}`, win: res.data.win });
        if (res.data.freeLeft !== undefined) setFreePlays(f => f ? { ...f, flip: res.data.freeLeft } : f);
        if (res.data.win) showWin(1); else showLoss(1);
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        fetchPoints();
      }, 1000);
    } catch { setCoinFlipping(false); setFlipResult({ text: "Fehler!", win: false }); }
  };

  // ── All-In ──
  const playAllIn = async () => {
    if (!user || allInPlaying || allInCooldown > 0 || !points || points <= 0) return;
    setAllInPlaying(true); setAllInResult(null); setAllInShake(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "allin" }) as any;
      // Dramatic slow reveal
      setTimeout(() => {
        setAllInShake(false);
        setAllInPlaying(false);
        if (!res.success) {
          setAllInResult({ text: res.error ?? "Fehler!", win: false });
          if (res.error?.includes("Cooldown") || res.error?.includes("cooldown")) {
            setAllInCooldown(3600);
          }
          return;
        }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        if (res.data.win) {
          setAllInResult({ text: `ALL-IN GEWONNEN! +${res.data.payout} Punkte!`, win: true });
          showWin(res.data.payout);
          if (confettiRef.current) spawnConfetti(confettiRef.current, 200, true);
          showMultiplier("ALL-IN WIN!");
        } else {
          setAllInResult({ text: `ALL-IN VERLOREN! ${res.data.amount} Punkte weg!`, win: false });
          showLoss(res.data.amount || 0);
        }
        setAllInCooldown(3600);
        fetchPoints();
      }, 2500);
    } catch { setAllInPlaying(false); setAllInShake(false); setAllInResult({ text: "Fehler!", win: false }); }
  };

  // ── Glucksrad ──
  const spinWheel = async () => {
    if (!user || wheelSpinning) return;
    setWheelSpinning(true); setWheelResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/gluecksrad`, {}) as any;
      setTimeout(() => {
        setWheelSpinning(false);
        if (!res.success) { setWheelResult(res.error ?? "Fehler!"); setWheelUsed(true); return; }
        setWheelResult(`+${res.data.points} Punkte!`);
        setWheelUsed(true);
        if (confettiRef.current && res.data.points >= 50) spawnConfetti(confettiRef.current, 60);
        fetchPoints();
      }, 2000);
    } catch { setWheelSpinning(false); setWheelResult("Fehler!"); }
  };

  // ── Season actions ──
  const buyPremium = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/season/premium`, {}) as any;
      if (res.success) {
        setSeason(prev => prev ? { ...prev, progress: { ...prev.progress, premium: true } } : prev);
        fetchPoints();
      } else {
        setMessage(res.error ?? "Fehler!");
      }
    } catch { setMessage("Fehler!"); }
  };

  const claimLevel = async (level: number) => {
    if (!user || claimingLevel !== null) return;
    setClaimingLevel(level);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/season/claim`, { level }) as any;
      if (res.success) {
        setSeason(prev => {
          if (!prev) return prev;
          return { ...prev, progress: { ...prev.progress, claimedLevels: [...prev.progress.claimedLevels, level] } };
        });
        fetchPoints();
        if (confettiRef.current) spawnConfetti(confettiRef.current, 30);
      }
    } catch { /* */ }
    setClaimingLevel(null);
  };

  const fetchSeasonLeaderboard = async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/season/leaderboard`) as any;
      if (res.data) setSeasonLeaderboard(res.data);
    } catch { /* */ }
  };

  // ── Heist actions ──
  const createHeist = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/heist`, {}) as any;
      if (res.success) { fetchHeist(); fetchPoints(); }
      else setHeistMessage(res.error ?? "Fehler!");
    } catch { setHeistMessage("Fehler!"); }
  };

  const joinHeist = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/heist/join`, {}) as any;
      if (res.success) { fetchHeist(); fetchPoints(); }
      else setHeistMessage(res.error ?? "Fehler!");
    } catch { setHeistMessage("Fehler!"); }
  };

  const playHeistRound = async (game: string) => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/heist/play`, { game }) as any;
      if (res.success) fetchHeist();
      else setHeistMessage(res.error ?? "Fehler!");
    } catch { setHeistMessage("Fehler!"); }
  };

  const heistBetray = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/heist/betray`, {}) as any;
      if (res.success) fetchHeist();
      else setHeistMessage(res.error ?? "Fehler!");
    } catch { setHeistMessage("Fehler!"); }
  };

  const heistFinish = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/heist/finish`, {}) as any;
      if (res.success) { fetchHeist(); fetchPoints(); }
      else setHeistMessage(res.error ?? "Fehler!");
    } catch { setHeistMessage("Fehler!"); }
  };

  const resultClass = (r: { win: boolean } | null) => !r ? "" : r.win
    ? "text-green-400 bg-green-500/10 border border-green-500/30"
    : "text-red-400 bg-red-500/10 border border-red-500/30";

  // Achievement categories grouping
  const CATEGORY_NAMES: Record<string, string> = {
    start: "🎮 Erste Schritte", milestone: "🏅 Meilensteine", luck: "🍀 Glück",
    pech: "😢 Pech", specials: "🎁 Specials", double: "⚡ Doppelt-oder-Nichts",
    social: "👥 Sozial", grind: "💪 Ausdauer", legendary: "🌟 Legendär",
  };
  const achievementsByCategory = achievements.reduce<Record<string, Achievement[]>>((acc, ach) => {
    const cat = ach.category || "Sonstige";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(ach);
    return acc;
  }, {});

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Battle pass reward levels — all levels that have rewards
  const allRewardLevels = season ? [...new Set((season.season.rewards ?? []).map((r: SeasonReward) => r.level))].sort((a, b) => a - b) : [];
  const REWARD_LEVELS = allRewardLevels.length > 0 ? allRewardLevels : [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  return (
    <div className={`min-h-screen text-white overflow-hidden relative ${allInShake ? "allin-shake" : ""}`} style={{
      background: "radial-gradient(ellipse at center top, #1a0533 0%, #0a0a1a 40%, #000 100%)",
    }}>
      <style>{`
        @keyframes neon-pulse { 0%,100% { text-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 40px #ff8c00, 0 0 80px #ff6600; } 50% { text-shadow: 0 0 5px #ffd700, 0 0 10px #ffd700, 0 0 20px #ff8c00; } }
        @keyframes slot-glow { 0%,100% { box-shadow: 0 0 15px rgba(145,71,255,0.5), inset 0 0 15px rgba(145,71,255,0.1); } 50% { box-shadow: 0 0 30px rgba(145,71,255,0.8), inset 0 0 30px rgba(145,71,255,0.2); } }
        @keyframes coin-flip { 0% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(1800deg) scale(1.3); } 100% { transform: rotateY(3600deg) scale(1); } }
        @keyframes scratch-reveal { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes marquee-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-200%); } }
        @keyframes multiplier-pop { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 40% { transform: scale(1.4) rotate(5deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 0; } }
        @keyframes streak-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes double-glow { 0%,100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); } 50% { box-shadow: 0 0 40px rgba(255,215,0,0.8), 0 0 60px rgba(255,100,0,0.4); } }
        @keyframes points-flash { 0% { transform: scale(1); } 50% { transform: scale(1.2); color: #ffd700; } 100% { transform: scale(1); } }
        @keyframes siren-flash { 0%,20%,40%,60%,80%,100% { box-shadow: inset 0 0 60px rgba(255,0,0,0.6); } 10%,30%,50%,70%,90% { box-shadow: inset 0 0 60px rgba(255,215,0,0.6); } }
        @keyframes fire-flicker { 0%,100% { text-shadow: 0 0 10px #ff4500, 0 0 20px #ff6600, 0 0 40px #ff0000; transform: scale(1); } 50% { text-shadow: 0 0 20px #ff4500, 0 0 40px #ff6600, 0 0 60px #ff0000; transform: scale(1.1); } }
        @keyframes cat-walk { 0% { transform: translateX(-100px); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateX(calc(100vw + 100px)); opacity: 0; } }
        @keyframes wheel-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(1440deg); } }
        @keyframes special-float { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-80px) scale(1.2); opacity: 0; } }
        @keyframes special-slide { 0% { transform: translateY(-100%); opacity: 0; } 20% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }
        @keyframes boss-hit { 0% { transform: scale(1); } 30% { transform: scale(0.95); filter: brightness(2); } 100% { transform: scale(1); filter: brightness(1); } }
        @keyframes mystery-open { 0% { transform: scale(0.5) rotate(-5deg); opacity: 0; } 50% { transform: scale(1.3) rotate(5deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes near-miss-shake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-4px); } 20%,40%,60%,80% { transform: translateX(4px); } }
        @keyframes allin-pulse { 0%,100% { box-shadow: 0 0 20px rgba(255,0,0,0.4), 0 0 40px rgba(255,0,0,0.2); } 50% { box-shadow: 0 0 40px rgba(255,0,0,0.8), 0 0 80px rgba(255,0,0,0.4), 0 0 120px rgba(255,50,0,0.2); } }
        @keyframes allin-screen-shake { 0%,100% { transform: translate(0,0); } 10% { transform: translate(-3px,2px); } 20% { transform: translate(3px,-2px); } 30% { transform: translate(-2px,-3px); } 40% { transform: translate(2px,3px); } 50% { transform: translate(-3px,1px); } 60% { transform: translate(3px,-1px); } 70% { transform: translate(-1px,3px); } 80% { transform: translate(1px,-3px); } 90% { transform: translate(-2px,2px); } }
        @keyframes quest-bonus-float { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-60px) scale(1.3); opacity: 0; } }
        @keyframes achievement-burst { 0% { transform: scale(0) rotate(-180deg); opacity: 0; } 50% { transform: scale(1.2) rotate(10deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes heist-pulse { 0%,100% { border-color: rgba(220,38,38,0.4); } 50% { border-color: rgba(220,38,38,0.8); } }
        @keyframes bp-glow { 0%,100% { box-shadow: 0 0 8px rgba(168,85,247,0.3); } 50% { box-shadow: 0 0 16px rgba(168,85,247,0.6); } }
        @keyframes bp-unclaimed { 0%,100% { box-shadow: 0 0 8px rgba(255,215,0,0.4); } 50% { box-shadow: 0 0 20px rgba(255,215,0,0.8); } }
        .neon-text { animation: neon-pulse 2s ease-in-out infinite; }
        .slot-machine { animation: slot-glow 2s ease-in-out infinite; }
        .coin-anim { animation: coin-flip 1s ease-in-out; }
        .scratch-pop { animation: scratch-reveal 0.4s ease-out; }
        .float-anim { animation: float 3s ease-in-out infinite; }
        .multiplier-anim { animation: multiplier-pop 2s ease-out forwards; }
        .streak-anim { animation: streak-pulse 0.5s ease-in-out; }
        .double-glow { animation: double-glow 1.5s ease-in-out infinite; }
        .points-flash { animation: points-flash 0.5s ease-out; }
        .casino-btn { transition: all 0.2s; cursor: pointer; }
        .casino-btn:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 8px 25px rgba(255,215,0,0.3); }
        .casino-btn:active { transform: scale(0.98); }
        .casino-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
        .allin-shake { animation: allin-screen-shake 0.5s ease-in-out infinite; }
        .allin-btn-pulse { animation: allin-pulse 1.5s ease-in-out infinite; }
        .quest-bonus-anim { animation: quest-bonus-float 2.5s ease-out forwards; }
        .achievement-burst { animation: achievement-burst 0.6s ease-out forwards; }
        .heist-border { animation: heist-pulse 2s ease-in-out infinite; }
        .bp-glow { animation: bp-glow 2s ease-in-out infinite; }
        .bp-unclaimed { animation: bp-unclaimed 1.5s ease-in-out infinite; }
        .bp-track::-webkit-scrollbar { height: 6px; }
        .bp-track::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; }
        .bp-track::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.5); border-radius: 3px; }
      `}</style>

      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-50" />

      {/* Siren flash overlay */}
      {sirenActive && (
        <div className="fixed inset-0 pointer-events-none z-40" style={{ animation: "siren-flash 0.3s ease-in-out infinite" }} />
      )}

      {/* Cat walk */}
      {catWalk && (
        <div className="fixed top-1/2 left-0 pointer-events-none z-40 text-8xl" style={{ animation: "cat-walk 3s linear forwards" }}>
          🐈‍⬛✨
        </div>
      )}

      {/* Multiplier popup */}
      {multiplierAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="multiplier-anim text-7xl font-black" style={{
            color: "#ffd700", textShadow: "0 0 30px #ffd700, 0 0 60px #ff6600, 0 0 90px #ff0000",
          }}>{multiplierAnim}</div>
        </div>
      )}

      {/* Quest Bonus floating text */}
      {questBonusAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="quest-bonus-anim text-4xl font-black text-green-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.8)" }}>
            {questBonusAnim}
          </div>
        </div>
      )}

      {/* Achievement unlock popup */}
      {newAchievementPopup && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-45">
          <div className="achievement-burst text-center px-8 py-6 rounded-2xl" style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(168,85,247,0.15))",
            border: "2px solid rgba(255,215,0,0.6)",
            boxShadow: "0 0 60px rgba(255,215,0,0.4)",
          }}>
            <div className="text-5xl mb-2">🏆</div>
            <div className="text-2xl font-black text-yellow-300 mb-1">ACHIEVEMENT FREIGESCHALTET!</div>
            <div className="text-lg text-white font-bold">{newAchievementPopup.name}</div>
            <div className="text-sm text-yellow-400 mt-1">+{newAchievementPopup.reward} Punkte</div>
          </div>
        </div>
      )}

      {/* Active Special Overlay */}
      {activeSpecial && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-45">
          {activeSpecial.type === "mitleid" && (
            <div className="text-3xl font-black text-blue-400" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(96,165,250,0.8)" }}>
              +5 Mitleids-Punkte!
            </div>
          )}
          {activeSpecial.type === "ragequit" && (
            <div className="px-8 py-4 rounded-2xl font-black text-2xl text-yellow-300" style={{ animation: "special-slide 3s ease-out forwards", background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,100,0,0.1))", border: "2px solid rgba(255,215,0,0.5)", textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
              WILLKOMMEN ZURUCK! +25
            </div>
          )}
          {activeSpecial.type === "beinahe_jackpot" && (
            <div className="text-4xl font-black text-orange-400" style={{ animation: "near-miss-shake 0.5s ease-in-out 3", textShadow: "0 0 20px rgba(251,146,60,0.8)" }}>
              SO KNAPP!
            </div>
          )}
          {activeSpecial.type === "verfluchte_muenze" && (
            <div className="text-6xl" style={{ animation: "fire-flicker 0.5s ease-in-out infinite" }}>
              🔥🪙🔥
            </div>
          )}
          {activeSpecial.type === "schwarze_katze" && (
            <div className="text-2xl font-black text-purple-300" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
              🐈‍⬛ Schwarze Katze! Nächster = Gewinn!
            </div>
          )}
          {activeSpecial.type === "goldener_regen" && (
            <div className="text-5xl font-black text-yellow-300" style={{ animation: "multiplier-pop 3s ease-out forwards", textShadow: "0 0 40px rgba(255,215,0,0.9)" }}>
              GOLDENER REGEN!
            </div>
          )}
          {activeSpecial.type === "multiplikator" && (
            <div className="text-center">
              <div className="text-6xl mb-2" style={{ animation: "wheel-spin 2s ease-out forwards" }}>🎡</div>
              <div className="text-4xl font-black text-yellow-300" style={{ animation: "multiplier-pop 4s ease-out forwards", textShadow: "0 0 30px rgba(255,215,0,0.9)" }}>
                x{activeSpecial.animationData?.multiplier}! +{activeSpecial.animationData?.bonus} BONUS!
              </div>
            </div>
          )}
          {activeSpecial.type === "jackpot_sirene" && (
            <div className="text-5xl font-black" style={{ animation: "multiplier-pop 3s ease-out forwards", color: "#ff0000", textShadow: "0 0 40px #ff0000, 0 0 80px #ffd700" }}>
              🚨 JACKPOT SIRENE! 🚨
            </div>
          )}
          {activeSpecial.type === "geschenk_an_chat" && (
            <div className="text-center">
              <div className="text-4xl font-black text-pink-400 mb-2" style={{ animation: "multiplier-pop 3s ease-out forwards" }}>
                GESCHENK AN CHAT!
              </div>
              <div className="text-lg text-pink-300">
                {activeSpecial.animationData?.recipients?.join(", ")} bekommen je +10!
              </div>
            </div>
          )}
          {activeSpecial.type === "mystery_box" && (
            <div className="text-center" style={{ animation: "mystery-open 3s ease-out forwards" }}>
              <div className="text-6xl mb-2">📦</div>
              <div className="text-3xl font-black text-cyan-300" style={{ textShadow: "0 0 20px rgba(34,211,238,0.8)" }}>
                MYSTERY BOX! +{activeSpecial.points}!
              </div>
            </div>
          )}
          {activeSpecial.type === "boss_damage" && (
            <div className="text-3xl font-black text-red-400" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              -{activeSpecial.animationData?.damage} HP!
            </div>
          )}
          {activeSpecial.type === "boss_kill" && (
            <div className="text-center">
              <div className="text-5xl font-black text-red-500 mb-2" style={{ animation: "multiplier-pop 3s ease-out forwards", textShadow: "0 0 40px rgba(239,68,68,0.8)" }}>
                💀 BOSS BESIEGT!
              </div>
              <div className="text-xl text-yellow-300">+50 Bonus an alle Teilnehmer!</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MARQUEE
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-black/50 border-b border-yellow-500/20 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap text-sm" style={{ animation: "marquee-scroll 25s linear infinite" }}>
          <span className="text-yellow-400 mx-8">🎰 WILLKOMMEN IM CRISTREAM CASINO 🎰</span>
          <span className="text-green-400 mx-8">💰 DAS HAUS VERLIERT IMMER 💰</span>
          <span className="text-purple-400 mx-8">🃏 VERANTWORTUNGSVOLLES FAKE-GAMBLING™ 🃏</span>
          <span className="text-pink-400 mx-8">⚠️ KEINE ECHTEN VERLUSTE ⚠️</span>
          <span className="text-blue-400 mx-8">🔥 SPECIALS, BOSS FIGHTS & MYSTERY BOXEN 🔥</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          HEADER + POINTS
         ══════════════════════════════════════════════════════════════════ */}
      <div className="text-center pt-8 pb-2">
        <img src="/crisino-header.webp" alt="WILLKOMMEN IM CRISINO" className="mx-auto max-w-xl w-full px-4" style={{ filter: "drop-shadow(0 0 30px rgba(168,85,247,0.5))" }} />
        {!user ? (
          <a href="/api/auth/twitch/viewer?returnTo=/casino" className="inline-block mt-4 casino-btn rounded-full px-8 py-3 font-bold text-lg" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5)", boxShadow: "0 4px 15px rgba(145,71,255,0.4)" }}>
            🎮 Login mit Twitch
          </a>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-4">
              <span className="text-gray-400">{user.displayName}</span>
              <div className="points-flash rounded-full px-5 py-1.5 font-black text-xl" style={{ background: "linear-gradient(135deg,#ffd700,#ff8c00)", color: "#000" }} key={points}>
                {points !== null ? `${points.toLocaleString()} PTS` : "..."}
              </div>
              <input value={channelInput} onChange={(e) => setChannelInput(e.target.value)} placeholder="Channel" className="bg-black/40 border border-yellow-500/20 rounded-lg px-2 py-1 text-xs text-center w-28" />
            </div>
            <div className="flex justify-center gap-4 text-xs">
              {streak > 0 && <span className="streak-anim text-yellow-400 font-bold" key={streak}>🔥 Streak: {streak}</span>}
              {maxStreak > 0 && <span className="text-gray-600">Best: {maxStreak}</span>}
              {totalWon > 0 && <span className="text-green-500">+{totalWon}</span>}
              {totalLost > 0 && <span className="text-red-500">-{totalLost}</span>}
              {(totalWon > 0 || totalLost > 0) && (
                <span className={totalWon - totalLost >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                  Netto: {totalWon - totalLost >= 0 ? "+" : ""}{totalWon - totalLost}
                </span>
              )}
            </div>
          </div>
        )}
        {message && <p className="text-red-400 mt-2 text-sm">{message}</p>}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          1. DAILY QUESTS
         ══════════════════════════════════════════════════════════════════ */}
      {user && quests.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg text-yellow-400">📋 TÄGLICHE QUESTS</h3>
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

      {/* ══════════════════════════════════════════════════════════════════
          DOUBLE OR NOTHING
         ══════════════════════════════════════════════════════════════════ */}
      {doubleActive && doubleAmount > 0 && (
        <div className="max-w-lg mx-auto px-6 py-4 mb-4">
          <div className="double-glow rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(255,215,0,0.1), rgba(255,100,0,0.05))", border: "2px solid rgba(255,215,0,0.4)" }}>
            <h3 className="text-2xl font-black text-yellow-400 mb-1">DOPPELT ODER NICHTS</h3>
            <p className="text-4xl font-black text-white mb-3">{doubleAmount.toLocaleString()} PTS</p>
            {doubleResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${doubleResult.includes("VERDOPPELT") ? "text-green-400 bg-green-500/10" : doubleResult.includes("VERLOREN") ? "text-red-400 bg-red-500/10" : "text-yellow-400"}`}>
                {doubleResult}
              </div>
            )}
            <div className="flex justify-center gap-3">
              <button onClick={playDouble} disabled={doubleFlipping} className="casino-btn rounded-xl px-8 py-3 font-black text-lg text-black" style={{ background: doubleFlipping ? "#666" : "linear-gradient(135deg,#ff4444,#cc0000)" }}>
                {doubleFlipping ? "..." : "🎲 DOPPELN!"}
              </button>
              <button onClick={cashOut} disabled={doubleFlipping} className="casino-btn rounded-xl px-8 py-3 font-black text-lg text-black" style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)" }}>
                💰 EINSACKEN
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">48% Chance zu verdoppeln · 52% alles weg</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BOSS FIGHT
         ══════════════════════════════════════════════════════════════════ */}
      {boss?.active && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.1), rgba(0,0,0,0.3))", border: "2px solid rgba(239,68,68,0.4)" }}>
            <h3 className="text-2xl font-black text-red-400 mb-2">BOSS FIGHT</h3>
            <div className="text-4xl mb-2">{boss.name}</div>
            <div className="relative h-6 rounded-full overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${boss.maxHp ? Math.max(0, (boss.hp! / boss.maxHp) * 100) : 0}%`,
                background: "linear-gradient(90deg, #ef4444, #f97316)",
              }} />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {boss.hp}/{boss.maxHp} HP
              </div>
            </div>
            <p className="text-xs text-gray-400">{boss.participants} Kämpfer · Jeder Gewinn schadet dem Boss!</p>
            <p className="text-xs text-yellow-400 mt-1">Boss besiegt = +50 Bonus für alle Teilnehmer!</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GAME MACHINES (3 existing + All-In below)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* SLOT MACHINE */}
        <div className="slot-machine rounded-3xl p-1" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5,#9146ff)" }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#1a1a2e,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-purple-300 mb-1">🎰 SLOTS</h2>
            <p className="text-center text-xs text-gray-500 mb-1">20 Punkte + Specials</p>
            {freePlays && <p className="text-center text-xs mb-4">{freePlays.slots > 0 ? <span className="text-green-400 font-bold">{freePlays.slots} Gratis-Spins</span> : <span className="text-gray-600">Gratis aufgebraucht</span>}</p>}
            <div className="flex justify-center gap-2 mb-4">
              {slotReels.map((sym, i) => (
                <div key={i} className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl" style={{
                  background: "linear-gradient(180deg,#1a1a1a,#0a0a0a)", border: "2px solid rgba(145,71,255,0.4)",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)", transition: "transform 0.1s",
                  transform: slotSpinning ? "scaleY(0.95)" : "scaleY(1)",
                }}>{sym}</div>
              ))}
            </div>
            {slotResult && <div className={`text-center mb-3 text-sm font-bold rounded-lg py-2 px-3 ${resultClass(slotResult)}`}>{slotResult.text}</div>}
            <button onClick={playSlots} disabled={slotSpinning || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{ background: slotSpinning ? "#666" : "linear-gradient(135deg,#9146ff,#6441a5)" }}>
              {slotSpinning ? "SPINNING..." : "🎰 SPIN!"}
            </button>
          </div>
        </div>

        {/* RUBBELLOS */}
        <div className="rounded-3xl p-1" style={{ background: "linear-gradient(135deg,#00cc88,#009966,#00cc88)" }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#0a1a15,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-emerald-300 mb-1">🎟️ RUBBELLOS</h2>
            <p className="text-center text-xs text-gray-500 mb-1">40 Punkte + Specials</p>
            {freePlays && <p className="text-center text-xs mb-4">{freePlays.scratch > 0 ? <span className="text-green-400 font-bold">{freePlays.scratch} Gratis-Lose</span> : <span className="text-gray-600">Gratis aufgebraucht</span>}</p>}
            <div className="flex justify-center gap-3 mb-4">
              {scratchCards.map((sym, i) => (
                <div key={i} className={`w-20 h-24 rounded-xl flex items-center justify-center text-3xl ${sym !== "❓" ? "scratch-pop" : ""}`} style={{
                  background: sym === "❓" ? "repeating-linear-gradient(45deg,#1a3a2a,#1a3a2a 10px,#1f4535 10px,#1f4535 20px)" : "linear-gradient(180deg,#0a2a1a,#050f0a)",
                  border: `2px solid ${sym !== "❓" ? "rgba(0,204,136,0.6)" : "rgba(0,204,136,0.3)"}`,
                  boxShadow: sym !== "❓" ? "0 0 20px rgba(0,204,136,0.3)" : "none",
                }}>{sym}</div>
              ))}
            </div>
            {scratchResult && <div className={`text-center mb-3 text-sm font-bold rounded-lg py-2 px-3 ${resultClass(scratchResult)}`}>{scratchResult.text}</div>}
            <button onClick={playScratch} disabled={!user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{ background: "linear-gradient(135deg,#00cc88,#009966)" }}>
              🎟️ KRATZEN!
            </button>
          </div>
        </div>

        {/* MÜNZWURF */}
        <div className="rounded-3xl p-1" style={{ background: "linear-gradient(135deg,#ffd700,#ff8c00,#ffd700)" }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#1a1508,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-yellow-300 mb-1">🪙 MÜNZWURF</h2>
            <p className="text-center text-xs text-gray-500 mb-1">1 Punkt · 50/50 + Specials</p>
            {freePlays && <p className="text-center text-xs mb-4">{freePlays.flip > 0 ? <span className="text-green-400 font-bold">{freePlays.flip} Gratis-Flips</span> : <span className="text-gray-600">Gratis aufgebraucht</span>}</p>}
            <div className="flex justify-center mb-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black ${coinFlipping ? "coin-anim" : "float-anim"}`} style={{
                background: coinSide ? "radial-gradient(circle,#ffd700,#b8860b)" : "radial-gradient(circle,#444,#222)",
                border: `4px solid ${cursedCoin ? "#ff4500" : "#ffd700"}`,
                boxShadow: cursedCoin ? "0 0 30px rgba(255,69,0,0.8), 0 0 60px rgba(255,0,0,0.4)" : coinSide ? "0 0 30px rgba(255,215,0,0.5)" : "0 0 10px rgba(255,215,0,0.2)",
                ...(cursedCoin ? { animation: "fire-flicker 0.5s ease-in-out infinite" } : {}),
              }}>{coinFlipping ? "🪙" : coinSide === "Kopf" ? "👑" : coinSide === "Zahl" ? "🔢" : "?"}</div>
            </div>
            {coinSide && !coinFlipping && <div className="text-center text-lg font-bold mb-1 text-yellow-300">{coinSide}!</div>}
            {flipResult && <div className={`text-center mb-3 text-sm font-bold rounded-lg py-2 px-3 ${resultClass(flipResult)}`}>{flipResult.text}</div>}
            <button onClick={playFlip} disabled={coinFlipping || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{ background: coinFlipping ? "#666" : "linear-gradient(135deg,#ffd700,#ff8c00)" }}>
              {coinFlipping ? "FLIEGT..." : "🪙 WERFEN!"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. ALL-IN BUTTON
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-lg mx-auto px-6 pb-6">
          <div className={`rounded-2xl p-6 text-center ${allInPlaying ? "" : "allin-btn-pulse"}`} style={{
            background: "linear-gradient(180deg, rgba(220,38,38,0.15), rgba(0,0,0,0.4))",
            border: "2px solid rgba(220,38,38,0.5)",
          }}>
            <h3 className="text-2xl font-black text-red-400 mb-1">💀 ALL-IN 💀</h3>
            <p className="text-xs text-gray-500 mb-1">40% Chance · 2.5x Auszahlung · Alles oder Nichts!</p>
            <p className="text-3xl font-black text-white mb-3">
              {points !== null && points > 0 ? `${points.toLocaleString()} PUNKTE` : "---"}
            </p>
            {allInResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${allInResult.win ? "text-green-400 bg-green-500/10 border border-green-500/30" : "text-red-400 bg-red-500/10 border border-red-500/30"}`}>
                {allInResult.text}
              </div>
            )}
            {allInCooldown > 0 ? (
              <div className="text-sm text-gray-400">
                Cooldown: {Math.floor(allInCooldown / 60)}m {allInCooldown % 60}s
              </div>
            ) : (
              <button onClick={playAllIn} disabled={allInPlaying || !points || points <= 0}
                className="casino-btn px-10 py-4 rounded-xl font-black text-xl text-white"
                style={{ background: allInPlaying ? "#666" : "linear-gradient(135deg, #dc2626, #7f1d1d, #dc2626)" }}>
                {allInPlaying ? "..." : `💀 ALL-IN! (${points?.toLocaleString() || 0} Pts)`}
              </button>
            )}
            <p className="text-xs text-gray-600 mt-2">1 Stunde Cooldown nach jedem Versuch</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GLUCKSRAD
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-md mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.08), rgba(0,0,0,0.3))", border: "1px solid rgba(34,211,238,0.3)" }}>
            <div className="text-5xl mb-2" style={wheelSpinning ? { animation: "wheel-spin 2s ease-out forwards" } : {}}>🎡</div>
            <h3 className="font-black text-lg text-cyan-300 mb-1">GLÜCKSRAD</h3>
            <p className="text-xs text-gray-500 mb-3">Einmal am Tag gratis drehen · 1-100 Punkte</p>
            {wheelResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${wheelResult.includes("+") ? "text-cyan-300 bg-cyan-500/10" : "text-gray-400"}`}>
                {wheelResult}
              </div>
            )}
            <button onClick={spinWheel} disabled={wheelSpinning || wheelUsed} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black" style={{ background: wheelSpinning || wheelUsed ? "#666" : "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
              {wheelSpinning ? "DREHT..." : wheelUsed ? "MORGEN WIEDER" : "🎡 DREHEN!"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          3. BATTLE PASS / SEASON
         ══════════════════════════════════════════════════════════════════ */}
      {user && season && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.08), rgba(0,0,0,0.3))", border: "1px solid rgba(168,85,247,0.3)" }}>
            {/* Season Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg text-purple-300">🎖️ {season.season.name}</h3>
                <span className="text-xs text-gray-500">Saison {season.season.number} · Endet in {formatCountdown(season.season.endDate)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bp-glow rounded-full px-4 py-1.5 font-black text-lg" style={{
                  background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff",
                }}>
                  LVL {season.progress.level}
                </div>
                {season.progress.premium ? (
                  <span className="text-xs text-yellow-400 font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>
                    PREMIUM
                  </span>
                ) : (
                  <button onClick={buyPremium} className="casino-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))",
                    border: "1px solid rgba(255,215,0,0.4)", color: "#ffd700",
                  }}>
                    Premium kaufen (500 Pts)
                  </button>
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

            {/* Reward Track - horizontal scroll */}
            <div className="bp-track overflow-x-auto pb-2 mb-3" style={{ scrollSnapType: "x mandatory" }}>
              <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                {REWARD_LEVELS.map(level => {
                  const reached = season.progress.level >= level;
                  const claimed = season.progress.claimedLevels.includes(level);
                  const canClaim = reached && !claimed;
                  const rewards = (season.season.rewards ?? []).filter((r: SeasonReward) => r.level === level);
                  const freeRewards = rewards.filter((r: SeasonReward) => !r.premium);
                  const premiumRewards = rewards.filter((r: SeasonReward) => r.premium);
                  const rewardIcon = (r: SeasonReward) => r.type === "points" ? "💰" : r.type === "title" ? "🏷️" : r.type === "autoflip" ? "🤖" : "📦";
                  const rewardText = (r: SeasonReward) => r.type === "points" ? `${r.value} Pts` : r.type === "title" ? `"${r.value}"` : r.type === "autoflip" ? `${r.value}` : `${r.value}x Lootbox`;
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
                        <div key={i} className="text-xs mb-0.5">
                          <span>{rewardIcon(r)} {rewardText(r)}</span>
                        </div>
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
                            style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>
                            Claim
                          </button>
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

            {/* Season Leaderboard Toggle */}
            <button onClick={() => { setShowSeasonLb(!showSeasonLb); if (!showSeasonLb) fetchSeasonLeaderboard(); }}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold">
              {showSeasonLb ? "▲ Saison-Rangliste ausblenden" : "▼ Saison-Rangliste anzeigen"}
            </button>
            {showSeasonLb && seasonLeaderboard.length > 0 && (
              <div className="mt-3 space-y-1">
                {seasonLeaderboard.map((entry, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{ background: i < 3 ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.02)" }}>
                      <span className="w-6 text-center shrink-0">{medal}</span>
                      <span className={`flex-1 truncate ${i < 3 ? "font-bold text-purple-300" : "text-white"}`}>{entry.displayName}</span>
                      <span className="text-purple-400 font-bold">LVL {entry.level}</span>
                      <span className="text-gray-500">{entry.xp} XP</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Prestige + Auto-Flip */}
            {season.progress.level >= 50 && (
              <div className="mt-4 rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(255,215,0,0.3)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-yellow-300">⭐ PRESTIGE</h4>
                  {autoFlip && <span className="text-xs text-purple-400">Prestige {autoFlip.prestige}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-3">Setze den Battle Pass zurück und schalte einen Auto-Münzwurf-Bot frei. Jedes Prestige-Level macht ihn schneller!</p>
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
                        <span className="text-yellow-300 font-bold">🤖 Auto-Flipper</span>
                        <span className="text-gray-400 ml-2">alle {autoFlip.interval}s</span>
                      </div>
                      <button onClick={async () => {
                        try {
                          const res = await api.post<any>(`/viewer/${channelName}/casino/autoflip/toggle`, {}) as any;
                          if (res.data) setAutoFlip(af => af ? { ...af, active: res.data.active } : af);
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
                        ⭐ Nächstes Prestige
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

      {/* ══════════════════════════════════════════════════════════════════
          BINGO & LOTTO
         ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-2xl">🎱</span>
          <h3 className="font-black text-blue-300">BINGO</h3>
          <p className="text-xs text-gray-500">!bingo (10 Pts) · Täglich 07:00 · Bis 500 Pts</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-2xl">🍀</span>
          <h3 className="font-black text-green-300">LOTTO</h3>
          <p className="text-xs text-gray-500">!lotto (50 Pts) · Sonntag 10:00 · Bis 10.000 Pts JACKPOT</p>
        </div>
      </div>

      {/* Tickets */}
      {user && tickets && (tickets.bingo || tickets.lotto) && (
        <div className="max-w-4xl mx-auto px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.bingo && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <h4 className="font-black text-blue-300 mb-1">🎱 Dein Bingo-Ticket</h4>
              <p className="text-lg font-mono font-bold text-white">{tickets.bingo.numbers.join(" · ")}</p>
              <p className="text-xs text-gray-500 mt-1">Nächste Ziehung: 07:00</p>
            </div>
          )}
          {tickets.lotto && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <h4 className="font-black text-green-300 mb-1">🍀 Dein Lottoschein</h4>
              <p className="text-lg font-mono font-bold text-white">{tickets.lotto.numbers.join(" · ")}</p>
              <p className="text-xs text-gray-500 mt-1">Nächste Ziehung: Sonntag 10:00</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. ACHIEVEMENTS
         ══════════════════════════════════════════════════════════════════ */}
      {user && achievements.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="font-black text-lg text-yellow-400 mb-4">
              🏆 {achievementStats.unlocked}/{achievementStats.total} Achievements
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
                            <span className="text-xl shrink-0">{ach.unlocked ? "🏆" : "🔒"}</span>
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

      {/* ══════════════════════════════════════════════════════════════════
          5. HEIST
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-2xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5 heist-border" style={{
            background: "linear-gradient(180deg, rgba(127,29,29,0.15), rgba(0,0,0,0.3))",
            border: "2px solid rgba(220,38,38,0.4)",
          }}>
            <h3 className="font-black text-lg text-red-400 mb-3">🏴‍☠️ HEIST</h3>

            {heistMessage && (
              <div className="text-sm text-red-300 bg-red-500/10 rounded-lg px-3 py-2 mb-3 border border-red-500/20">
                {heistMessage}
              </div>
            )}

            {/* No active heist */}
            {(!heist || !heist.active) && (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Starte einen Heist und überfalle das Casino mit anderen Spielern!</p>
                <button onClick={createHeist} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                  🏴‍☠️ HEIST STARTEN (50 Pts)
                </button>
              </div>
            )}

            {/* Lobby phase */}
            {heist?.active && heist.phase === "lobby" && (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Heist gestartet von <span className="text-red-300 font-bold">{heist.createdBy}</span></p>
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  {heist.players?.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      {p.displayName}
                    </span>
                  ))}
                </div>
                {heist.countdown && <p className="text-sm text-yellow-400 mb-3">Startet in {heist.countdown}s...</p>}
                <button onClick={joinHeist} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #b91c1c, #7f1d1d)" }}>
                  🏴‍☠️ BEITRETEN (25 Pts)
                </button>
              </div>
            )}

            {/* Playing phase */}
            {heist?.active && heist.phase === "playing" && (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Runde {heist.round}/{heist.totalRounds} · Pot: {heist.pot} Pts</p>
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  {heist.players?.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-gray-300 border border-red-500/20">
                      {p.displayName} {p.result ? (p.result.win ? "✅" : "❌") : "⏳"}
                    </span>
                  ))}
                </div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => playHeistRound("slots")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>🎰 Slots</button>
                  <button onClick={() => playHeistRound("flip")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>🪙 Flip</button>
                  <button onClick={() => playHeistRound("scratch")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #00cc88, #009966)", color: "#000" }}>🎟️ Scratch</button>
                </div>
              </div>
            )}

            {/* Betrayal phase */}
            {heist?.active && heist.phase === "betrayal" && (
              <div className="text-center">
                <p className="text-lg text-red-300 font-black mb-2">VERRAT ODER TREUE?</p>
                <p className="text-sm text-gray-400 mb-3">Pot: {heist.pot} Pts · Entscheide dich!</p>
                {heist.countdown && <p className="text-yellow-400 text-sm mb-3">{heist.countdown}s verbleibend...</p>}
                <div className="flex justify-center gap-4">
                  <button onClick={heistFinish} className="casino-btn px-6 py-3 rounded-xl font-black text-lg text-white"
                    style={{ background: "linear-gradient(135deg, #22c55e, #166534)" }}>
                    🤝 TREU BLEIBEN
                  </button>
                  <button onClick={heistBetray} className="casino-btn px-6 py-3 rounded-xl font-black text-lg text-white"
                    style={{ background: "linear-gradient(135deg, #dc2626, #7f1d1d)" }}>
                    🗡️ VERRATEN
                  </button>
                </div>
              </div>
            )}

            {/* Finished phase */}
            {heist?.active && heist.phase === "finished" && (
              <div className="text-center">
                <p className="text-lg text-yellow-400 font-black mb-3">HEIST ABGESCHLOSSEN!</p>
                <div className="space-y-1 mb-3">
                  {heist.results?.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span className={`font-bold ${r.betrayed ? "text-red-400" : "text-white"}`}>
                        {r.displayName} {r.betrayed ? "🗡️" : "🤝"}
                      </span>
                      <span className={`font-bold ${r.payout > 0 ? "text-green-400" : "text-red-400"}`}>
                        {r.payout > 0 ? "+" : ""}{r.payout} Pts
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setHeist(null); fetchPoints(); }} className="text-xs text-gray-500 hover:text-gray-300">
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIVE FEED + LEADERBOARD
         ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-black text-lg text-yellow-400 mb-3">⚡ Live Aktivität</h3>
          {feed.length === 0 ? (
            <p className="text-gray-600 text-sm">Noch keine Aktivität...</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {feed.map((entry, i) => {
                const isWin = entry.profit > 0;
                const ago = Math.floor((Date.now() - entry.time) / 1000);
                const timeStr = ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.floor(ago/60)}m` : `${Math.floor(ago/3600)}h`;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-gray-400 w-8 text-right shrink-0">{timeStr}</span>
                    <span className="text-white font-semibold truncate">{entry.user}</span>
                    <span className="text-gray-500 truncate flex-1">{entry.detail}</span>
                    <span className={`font-bold shrink-0 ${isWin ? "text-green-400" : entry.profit < 0 ? "text-red-400" : "text-gray-500"}`}>
                      {entry.profit >= 0 ? "+" : ""}{entry.profit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-black text-lg text-yellow-400 mb-3">🏆 Top Spieler</h3>
          {leaderboard.length === 0 ? (
            <p className="text-gray-600 text-sm">Noch keine Spieler...</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5" style={{ background: i < 3 ? "rgba(255,215,0,0.05)" : "rgba(255,255,255,0.02)" }}>
                    <span className="w-8 text-center shrink-0">{medal}</span>
                    <span className={`flex-1 truncate ${i < 3 ? "font-bold text-yellow-300" : "text-white"}`}>{entry.displayName}</span>
                    <span className="font-bold text-yellow-400">{entry.points.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          V-PET + SHOP
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(255,182,193,0.06), rgba(0,0,0,0.2))", border: "1px solid rgba(255,182,193,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-pink-300">🐾 V-PET</h3>
              {pet && <span className="text-xs text-gray-500">LVL {pet.level} · {pet.totalSpent?.toLocaleString()} Pts ausgegeben</span>}
            </div>

            {!pet ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-4">Du hast noch kein Pet! Wähle dein erstes:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {!shop ? (
                    <button onClick={async () => {
                      const res = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any;
                      if (res.data) setShop(res.data);
                    }} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #f472b6, #ec4899)" }}>
                      🛒 Shop öffnen
                    </button>
                  ) : (
                    shop.pets.map((p: any) => (
                      <button key={p.id} onClick={async () => {
                        setBuyingPet(true);
                        const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy`, { petId: p.id }) as any;
                        if (res.success) { setPet(res.data); fetchPoints(); }
                        else setMessage(res.error ?? "Fehler!");
                        setBuyingPet(false);
                      }} disabled={buyingPet} className="rounded-xl p-3 text-center hover:scale-105 transition-transform" style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                        minWidth: "80px",
                      }}>
                        <div className="text-3xl mb-1">{p.emoji}</div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-yellow-400">{p.price.toLocaleString()} Pts</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Pet Display */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative text-center">
                    {pet.equipped?.aura && <div className="absolute -inset-2 text-4xl opacity-30 animate-pulse flex items-center justify-center">{pet.equipped.aura}</div>}
                    <div className="text-6xl relative">
                      {pet.equipped?.hat && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">{pet.equipped.hat}</div>}
                      {pet.equipped?.glasses && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-lg">{pet.equipped.glasses}</div>}
                      {(() => { const pd = [{id:"cat",emoji:"🐱"},{id:"dog",emoji:"🐶"},{id:"bunny",emoji:"🐰"},{id:"fox",emoji:"🦊"},{id:"panda",emoji:"🐼"},{id:"dragon",emoji:"🐉"},{id:"unicorn",emoji:"🦄"},{id:"phoenix",emoji:"🔥"},{id:"alien",emoji:"👾"},{id:"robot",emoji:"🤖"},{id:"kraken",emoji:"🦑"},{id:"void",emoji:"🕳️"}]; return pd.find(p=>p.id===pet.petId)?.emoji ?? "🐱"; })()}
                      {pet.equipped?.weapon && <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-2xl">{pet.equipped.weapon}</div>}
                      {pet.equipped?.cape && <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-xl">{pet.equipped.cape}</div>}
                    </div>
                    {pet.equipped?.food && <div className="text-lg mt-1">{pet.equipped.food}</div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-white text-lg">{pet.petName}</div>
                    <div className="text-xs text-gray-400">Level {pet.level} · {pet.xp}/{pet.level * 50} XP</div>
                    <div className="h-2 rounded-full bg-black/40 mt-1 overflow-hidden" style={{ border: "1px solid rgba(255,182,193,0.2)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(pet.xp / (pet.level * 50)) * 100}%`, background: "linear-gradient(90deg, #f472b6, #ec4899)" }} />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setShowShop(!showShop); if (!showShop && !shop) { api.get<any>(`/viewer/${channelName}/casino/pet/shop`).then((r: any) => { if (r.data) setShop(r.data); }); } }}
                        className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "linear-gradient(135deg, rgba(244,114,182,0.2), rgba(236,72,153,0.1))", border: "1px solid rgba(244,114,182,0.4)", color: "#f472b6" }}>
                        {showShop ? "Shop schließen" : "🛒 Shop"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Item Shop */}
                {showShop && shop && (
                  <div className="border-t border-pink-500/20 pt-4 space-y-4">
                    {shop.categories.map((cat: any) => (
                      <div key={cat.category}>
                        <h4 className="font-bold text-sm text-pink-300 mb-2">{cat.emoji} {cat.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {cat.tiers.map((item: any) => (
                            <div key={item.index} className={`rounded-lg p-2 text-center min-w-[70px] ${item.equipped ? "ring-2 ring-pink-500" : ""}`} style={{
                              background: item.owned ? "rgba(244,114,182,0.1)" : "rgba(255,255,255,0.02)",
                              border: `1px solid ${item.owned ? "rgba(244,114,182,0.4)" : "rgba(255,255,255,0.08)"}`,
                            }}>
                              <div className="text-xl">{item.emoji}</div>
                              <div className="text-[10px] text-gray-300">{item.name}</div>
                              {item.owned && <div className="text-[9px] text-pink-400">x{item.ownedCount}</div>}
                              <div className="mt-1 flex gap-1 justify-center">
                                {!item.equipped && item.owned && (
                                  <button onClick={async () => {
                                    await api.post<any>(`/viewer/${channelName}/casino/pet/equip`, { category: cat.category, itemIndex: item.index });
                                    const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                    const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                  }} className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30">
                                    Anlegen
                                  </button>
                                )}
                                {item.equipped && (
                                  <button onClick={async () => {
                                    await api.post<any>(`/viewer/${channelName}/casino/pet/unequip`, { category: cat.category });
                                    const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                    const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                  }} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">
                                    Ablegen
                                  </button>
                                )}
                                <button onClick={async () => {
                                  const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy-item`, { category: cat.category, itemIndex: item.index }) as any;
                                  if (res.success) {
                                    fetchPoints();
                                    const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                    const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                  } else setMessage(res.error ?? "Fehler!");
                                }} className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30">
                                  {item.price.toLocaleString()} Pts
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SKILL TREE
         ══════════════════════════════════════════════════════════════════ */}
      {user && skillData && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.05), rgba(0,0,0,0.2))", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-purple-300">🌳 SKILL TREE</h3>
              <div className="text-xs text-gray-500">Level {skillData.totalLevel} · {skillData.totalInvested.toLocaleString()} Pts investiert</div>
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
                        } else {
                          setMessage(res.error ?? "Fehler!");
                        }
                      } catch { setMessage("Fehler!"); }
                      setUpgrading(null);
                    }}
                    disabled={upgrading !== null}
                    className="casino-btn w-full py-1.5 rounded-lg text-xs font-bold text-black"
                    style={{ background: upgrading === skill.id ? "#666" : "linear-gradient(135deg, #9146ff, #6441a5)" }}
                  >
                    {upgrading === skill.id ? "..." : `⬆ ${skill.nextCost.toLocaleString()} Pts`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          6. PLAYER STATS (collapsible)
         ══════════════════════════════════════════════════════════════════ */}
      {user && playerStats && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => setStatsOpen(!statsOpen)} className="w-full flex items-center justify-between">
              <h3 className="font-black text-sm text-gray-400">📊 DEINE STATISTIKEN</h3>
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
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-white">{s.totalPlays.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Spiele gesamt</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-green-400">{winRate.toFixed(1)}%</div>
                  <div className="text-[10px] text-gray-500">Gewinnrate</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-yellow-400">{s.maxStreak}</div>
                  <div className="text-[10px] text-gray-500">Bester Streak</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-green-400">+{s.totalPointsWon.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Gewonnen</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-red-400">-{s.totalPointsLost.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Verloren</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-red-500">{s.bossesKilled}</div>
                  <div className="text-[10px] text-gray-500">Boss Kills</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-yellow-300">{s.maxDoubleAmount.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Größter Double</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-purple-400">{s.questsCompleted}</div>
                  <div className="text-[10px] text-gray-500">Quests erledigt</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-cyan-400">{s.heistsPlayed}</div>
                  <div className="text-[10px] text-gray-500">Heists gespielt</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-red-400">{s.allInsWon}/{s.allInsPlayed}</div>
                  <div className="text-[10px] text-gray-500">All-In (W/Total)</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-orange-400">{s.doublesWon}/{s.doublesPlayed}</div>
                  <div className="text-[10px] text-gray-500">Doppelungen</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-pink-400">{favGame?.name ?? "—"}</div>
                  <div className="text-[10px] text-gray-500">Lieblingsspiel</div>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SPECIALS LEGEND
         ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-black text-sm text-gray-500 mb-2">CASINO SPECIALS</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs text-gray-600">
            <span>3x Pech = +5 Mitleid</span>
            <span>🔥 5x Flip-Pech = Verfluchte Münze</span>
            <span>🐈‍⬛ 3% Schwarze Katze = Garantie-Win</span>
            <span>🎡 x2-x5 Multiplikator bei 100+ Win</span>
            <span>🚨 Jackpot-Sirene bei 777</span>
            <span>500+ Win = Geschenk an Chat</span>
            <span>📦 Mystery Box alle 20 Spins</span>
            <span>Boss Fights mit Community</span>
            <span>🎡 Tägliches Gratis-Glücksrad</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════════════════════════════ */}
      <div className="text-center pb-6 text-xs text-gray-700">
        Kein echtes Geld · Alle Instant-Games netto positiv · Verantwortungsvolles Fake-Gambling™
      </div>
    </div>
  );
}
