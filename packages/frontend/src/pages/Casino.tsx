import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { casinoSounds } from "@/lib/casino-sounds";
import { formatNumber } from "@/lib/format-number";

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
  players?: { userId: string; displayName: string; ready?: boolean; result?: any }[];
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

// ── Memory Timer sub-component ──
function MemoryTimer({ start }: { start: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(iv);
  }, [start]);
  return <span className="text-purple-400 font-bold">{(elapsed / 1000).toFixed(1)}s</span>;
}

// ── Component ──
export function CasinoPage() {
  const { user } = useAuthStore();
  const [channelInput, setChannelInput] = useState("");
  const confettiRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"play"|"minigames"|"pets"|"progress"|"social">("play");
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

  // ── Audio init ──
  useEffect(() => {
    const initAudio = () => { casinoSounds.init(); document.removeEventListener("click", initAudio); };
    document.addEventListener("click", initAudio);
    casinoSounds.setMute(soundMuted);
    return () => document.removeEventListener("click", initAudio);
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

  // ── Minigames ──
  const [activeMinigame, setActiveMinigame] = useState<"snake" | "connect4" | "memory" | null>(null);
  // Snake
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeGameOver, setSnakeGameOver] = useState(false);
  const [snakeSubmitted, setSnakeSubmitted] = useState(false);
  const [snakePoints, setSnakePoints] = useState(0);
  const snakeRef = useRef<{ dir: { x: number; y: number }; snake: { x: number; y: number }[]; apple: { x: number; y: number }; score: number; running: boolean }>({ dir: { x: 1, y: 0 }, snake: [{ x: 10, y: 10 }], apple: { x: 15, y: 10 }, score: 0, running: false });
  const snakeTimerRef = useRef<any>(null);
  const snakeCanvasRef = useRef<HTMLCanvasElement>(null);
  // Connect 4
  const [connect4, setConnect4] = useState<any>(null);
  const [connect4Bet, setConnect4Bet] = useState(10);
  const [connect4Loading, setConnect4Loading] = useState(false);
  const [connect4Msg, setConnect4Msg] = useState<string | null>(null);
  const connect4PollRef = useRef<any>(null);
  // Memory
  const [memoryCards, setMemoryCards] = useState<{ emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryStartTime, setMemoryStartTime] = useState(0);
  const [memoryComplete, setMemoryComplete] = useState(false);
  const [memoryPoints, setMemoryPoints] = useState(0);
  const memoryLockRef = useRef(false);

  // Sudoku
  const [sudokuPuzzle, setSudokuPuzzle] = useState<(number | 0)[][] | null>(null);
  const [sudokuSolution, setSudokuSolution] = useState<number[][] | null>(null);
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>([]);
  const [sudokuDiff, setSudokuDiff] = useState<"easy" | "medium" | "hard">("easy");
  const [sudokuStart, setSudokuStart] = useState(0);
  const [sudokuDone, setSudokuDone] = useState(false);
  const [sudokuMsg, setSudokuMsg] = useState<string | null>(null);
  // Roulette
  const [rouletteBet, setRouletteBet] = useState(20);
  const [rouletteBets, setRouletteBets] = useState<any[]>([]);
  const [rouletteResult, setRouletteResult] = useState<any>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteMsg, setRouletteMsg] = useState<string | null>(null);

  // Poker
  const [pokerHand, setPokerHand] = useState<any[] | null>(null);
  const [pokerSelected, setPokerSelected] = useState<Set<number>>(new Set());
  const [pokerResult, setPokerResult] = useState<any>(null);
  const [pokerBet, setPokerBet] = useState(50);
  const [pokerMsg, setPokerMsg] = useState<string | null>(null);

  // 9x9 Sudoku
  const [s9Puzzle, setS9Puzzle] = useState<(number | 0)[][] | null>(null);
  const [s9Grid, setS9Grid] = useState<number[][]>([]);
  const [s9Diff, setS9Diff] = useState<"easy" | "medium" | "hard">("easy");
  const [s9Start, setS9Start] = useState(0);
  const [s9Done, setS9Done] = useState(false);
  const [s9Msg, setS9Msg] = useState<string | null>(null);

  // Dice 21
  const [d21, setD21] = useState<{ total: number; rolls: number[]; bet: number; finished: boolean } | null>(null);
  const [d21Bet, setD21Bet] = useState(20);
  const [d21Msg, setD21Msg] = useState<string | null>(null);
  // Over/Under
  const [ouBet, setOuBet] = useState(10);
  const [ouResult, setOuResult] = useState<{ dice: number[]; total: number; win: boolean; payout: number; guess: string } | null>(null);
  const [ouMsg, setOuMsg] = useState<string | null>(null);

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
  const [petWalkAnim, setPetWalkAnim] = useState(false);

  // Tier Slots
  const [tierSlots, setTierSlots] = useState<{ tiers: { id: string; name: string; emoji: string; cost: number; requirement: number; unlocked: boolean }[]; totalInvested: number } | null>(null);
  const [tierReels, setTierReels] = useState<Record<string, string[]>>({});
  const [tierSpinning, setTierSpinning] = useState<string | null>(null);
  const [tierResult, setTierResult] = useState<Record<string, { text: string; win: boolean }>>({});

  // Lootbox Drop
  const [lootboxDropAnim, setLootboxDropAnim] = useState<{ type: string; data: any } | null>(null);

  // Auto-Flip Widget
  const [autoFlipTick, setAutoFlipTick] = useState(0);

  // Auto-flip stats are now pushed via SSE (no polling needed)

  // Bonus Sidebar
  const [bonusSidebar, setBonusSidebar] = useState(false);
  const [bonusData, setBonusData] = useState<{ lines: any[]; totals: Record<string, { label: string; total: string }>; mood: number } | null>(null);
  const [petFeedAnim, setPetFeedAnim] = useState(false);
  const [petCleanAnim, setPetCleanAnim] = useState(false);

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

  // ── NEW: Login Streak ──
  const [loginStreak, setLoginStreak] = useState<{ streak: number; lastLogin: string; totalLogins: number; longestStreak: number } | null>(null);

  // ── NEW: Tournament ──
  const [tournament, setTournament] = useState<{ weekNumber: number; startDate: string; endDate: string; daysLeft: number } | null>(null);
  const [tournamentLb, setTournamentLb] = useState<{ displayName: string; score: number; rank: number }[]>([]);
  const [showTournamentLb, setShowTournamentLb] = useState(false);

  // ── NEW: Pet Battle ──
  const [petBattle, setPetBattle] = useState<{ battle: any | null; history: any[] } | null>(null);
  const [battleBet, setBattleBet] = useState(50);

  // ── NEW: Pet Breeding ──
  const [breedData, setBreedData] = useState<{ breedCount: number; nextCost: number; cooldownLeft: number } | null>(null);
  const [breedPet1, setBreedPet1] = useState<string>("");
  const [breedPet2, setBreedPet2] = useState<string>("");
  const [breeding, setBreeding] = useState(false);

  // ── NEW: Guilds ──
  const [guilds, setGuilds] = useState<any[]>([]);
  const [myGuild, setMyGuild] = useState<any | null>(null);
  const [guildCreateName, setGuildCreateName] = useState("");
  const [guildCreateEmoji, setGuildCreateEmoji] = useState("⚔️");
  const [guildLoading, setGuildLoading] = useState(false);

  // ── NEW: Pet Rename ──
  const [renamingPet, setRenamingPet] = useState(false);
  const [petNewName, setPetNewName] = useState("");

  // ── Sound ──
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem("casino-mute") === "1");

  // ── Process specials queue ──
  const processSpecial = useCallback((special: CasinoSpecial) => {
    setActiveSpecial(special);
    casinoSounds.special();
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
              casinoSounds.questComplete();
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
          casinoSounds.achievement();
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

    // Login streak from gamble response
    if ((progression as any).loginStreak) {
      setLoginStreak((progression as any).loginStreak);
    }

    // Lootbox drop!
    if ((progression as any).lootboxDrop) {
      const drop = (progression as any).lootboxDrop;
      setLootboxDropAnim(drop);
      casinoSounds.jackpot();
      if (confettiRef.current) spawnConfetti(confettiRef.current, drop.type === "pet" ? 200 : 100, true);
      setTimeout(() => setLootboxDropAnim(null), 5000);
      // Refresh pet data
      fetchSeason();
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

  // fetchPoints auto-invoke removed — SSE init provides points

  const fetchFree = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/free`) as any;
      if (res.data) setFreePlays(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  // fetchFree auto-invoke removed — SSE init provides free plays

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

  // Fetch tier slots info
  const fetchTierSlots = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/tier-slots`) as any;
      if (res.data) setTierSlots(res.data);
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

  // Fetch heist — transform backend data to HeistState
  const fetchHeist = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/heist`) as any;
      const h = res.data;
      if (!h || !h.status) { setHeist(null); return; }

      const myRounds = h.rounds?.filter((r: any) => r.userId === user.twitchId).length ?? 0;
      const totalRoundsPerPlayer = 3;
      const now = Date.now();
      const lobbyTimeLeft = h.status === "lobby" ? Math.max(0, Math.ceil(((h.createdAt + 120000) - now) / 1000)) : 0;
      const betrayalTimeLeft = h.status === "betrayal" && h.betrayalStartedAt ? Math.max(0, Math.ceil(((h.betrayalStartedAt + 30000) - now) / 1000)) : 0;

      // Enrich players with round counts
      const rounds = h.rounds ?? [];
      const enrichedPlayers = (h.players ?? []).map((p: any) => ({
        ...p,
        roundsPlayed: rounds.filter((r: any) => r.userId === p.userId).length,
        roundResults: rounds.filter((r: any) => r.userId === p.userId).map((r: any) => ({ game: r.game, payout: r.payout })),
      }));

      setHeist({
        active: h.status !== "finished",
        phase: h.status,
        players: enrichedPlayers,
        pot: h.pot ?? 0,
        round: myRounds,
        totalRounds: totalRoundsPerPlayer,
        countdown: h.status === "lobby" ? lobbyTimeLeft : h.status === "betrayal" ? betrayalTimeLeft : undefined,
        createdBy: h.creatorName,
        results: h.finishedResults ?? [],
      });
    } catch { setHeist(null); }
  }, [user, channelName]);

  // Fetch login streak
  const fetchLoginStreak = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/login-streak`) as any;
      if (res.data) setLoginStreak(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch tournament
  const fetchTournament = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/tournament`) as any;
      if (res.data) setTournament(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  const fetchTournamentLeaderboard = useCallback(async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/tournament/leaderboard`) as any;
      if (res.data) setTournamentLb(res.data);
    } catch { /* */ }
  }, [channelName]);

  // Fetch pet battle
  const fetchPetBattle = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/battle`) as any;
      if (res.data) setPetBattle(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch breed data
  const fetchBreedData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/breed`) as any;
      if (res.data) setBreedData(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  // Fetch guilds
  const fetchGuilds = useCallback(async () => {
    if (!user) return;
    try {
      const [all, mine] = await Promise.all([
        api.get<any>(`/viewer/${channelName}/casino/guilds`),
        api.get<any>(`/viewer/${channelName}/casino/guild`),
      ]);
      if (all.data) setGuilds(all.data);
      if (mine.data) setMyGuild(mine.data);
      else setMyGuild(null);
    } catch { /* */ }
  }, [user, channelName]);

  // ── SSE: Real-time updates from server ──
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const es = new EventSource(`/api/viewer/${channelName}/casino/events?token=${encodeURIComponent(token)}`);

    es.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      if (data.feed) setFeed(data.feed);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.boss) setBoss(data.boss);
      if (data.heist) setHeist(transformHeist(data.heist));
      else setHeist(null);
      if (data.freePlays) setFreePlays(data.freePlays);
      if (data.tickets) setTickets(data.tickets);
      if (data.autoflip) setAutoFlip(data.autoflip);
      if (data.pet) setPet(data.pet);
      if (data.skills) setSkillData(data.skills);
      if (data.stats) setPlayerStats(data.stats);
      if (data.quests) setQuests(Array.isArray(data.quests) ? data.quests : []);
      if (data.achievements) {
        setAchievements(data.achievements.achievements || []);
        setAchievementStats({ unlocked: data.achievements.unlocked ?? 0, total: data.achievements.total ?? 0 });
      }
      if (data.season) setSeason(data.season);
      if (data.tournament) setTournament(data.tournament);
      if (data.guilds) setGuilds(data.guilds);
      if (data.myGuild) setMyGuild(data.myGuild);
      if (data.loginStreak) setLoginStreak(data.loginStreak);
      if (data.battle) setPetBattle(data.battle);
      if (data.breed) setBreedData(data.breed);
      if (data.points !== undefined) setPoints(data.points);
      // Fetch tier slots info after init
      fetchTierSlots();
    });

    es.addEventListener("feed", (e) => setFeed(JSON.parse(e.data)));
    es.addEventListener("leaderboard", (e) => setLeaderboard(JSON.parse(e.data)));
    es.addEventListener("boss", (e) => setBoss(JSON.parse(e.data)));
    es.addEventListener("heist", (e) => {
      const h = JSON.parse(e.data);
      if (h) setHeist(transformHeist(h));
      else setHeist(null);
    });
    es.addEventListener("points", (e) => { const d = JSON.parse(e.data); if (d.points > (points ?? 0)) casinoSounds.points(); setPoints(d.points); });
    es.addEventListener("season", (e) => setSeason(JSON.parse(e.data)));
    es.addEventListener("autoflip", (e) => { setAutoFlip(JSON.parse(e.data)); setAutoFlipTick(t => t + 1); });
    es.addEventListener("pet", (e) => setPet(JSON.parse(e.data)));
    es.addEventListener("battle", (e) => setPetBattle(JSON.parse(e.data)));
    es.addEventListener("tournament", (e) => setTournament(JSON.parse(e.data)));

    es.onerror = () => { /* EventSource auto-reconnects */ };

    return () => es.close();
  }, [user, channelName]);

  // Helper to transform raw heist data from SSE
  function transformHeist(h: any): HeistState | null {
    if (!h || !h.status) return null;
    const myRounds = h.rounds?.filter((r: any) => r.userId === user?.twitchId).length ?? 0;
    const totalRoundsPerPlayer = 3;
    const now = Date.now();
    const lobbyTimeLeft = h.status === "lobby" ? Math.max(0, Math.ceil(((h.createdAt + 120000) - now) / 1000)) : 0;
    const betrayalTimeLeft = h.status === "betrayal" && h.betrayalStartedAt ? Math.max(0, Math.ceil(((h.betrayalStartedAt + 30000) - now) / 1000)) : 0;
    const rounds = h.rounds ?? [];
    const enrichedPlayers = (h.players ?? []).map((p: any) => ({
      ...p,
      roundsPlayed: rounds.filter((r: any) => r.userId === p.userId).length,
      roundResults: rounds.filter((r: any) => r.userId === p.userId).map((r: any) => ({ game: r.game, payout: r.payout })),
    }));
    return {
      active: h.status !== "finished",
      phase: h.status,
      players: enrichedPlayers,
      pot: h.pot ?? 0,
      round: myRounds,
      totalRounds: totalRoundsPerPlayer,
      countdown: h.status === "lobby" ? lobbyTimeLeft : h.status === "betrayal" ? betrayalTimeLeft : undefined,
      createdBy: h.creatorName,
      results: h.finishedResults ?? [],
    };
  }

  // All-In cooldown removed — no timer needed

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
    casinoSounds.double();
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
          casinoSounds.bigWin();
          if (confettiRef.current && newAmount >= 200) spawnConfetti(confettiRef.current, 40);
        } else {
          setDoubleResult(`VERLOREN! ${doubleAmount} Punkte weg!`);
          showLoss(doubleAmount);
          casinoSounds.loss();
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
    casinoSounds.spin();
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
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); if (profit >= 50) casinoSounds.bigWin(); else casinoSounds.win(); } else { showLoss(-profit); casinoSounds.loss(); }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        setSlotSpinning(false); fetchPoints();
      }, 1500);
    } catch { clearInterval(iv); setSlotResult({ text: "Fehler!", win: false }); setSlotSpinning(false); }
  };

  const playTierSlots = async (tierId: string) => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    if (tierSpinning) return;
    setTierSpinning(tierId);
    setTierResult(prev => ({ ...prev, [tierId]: undefined as any }));
    setTierReels(prev => ({ ...prev, [tierId]: ["❓","❓","❓"] }));
    casinoSounds.spin();
    const symbols = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
    const iv = setInterval(() => setTierReels(prev => ({ ...prev, [tierId]: [symbols[Math.floor(Math.random()*7)]!,symbols[Math.floor(Math.random()*7)]!,symbols[Math.floor(Math.random()*7)]!] })), 80);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: tierId }) as any;
      setTimeout(() => {
        clearInterval(iv);
        if (!res.success) {
          setTierReels(prev => ({ ...prev, [tierId]: ["❌","❌","❌"] }));
          setTierResult(prev => ({ ...prev, [tierId]: { text: res.error, win: false } }));
          setTierSpinning(null);
          return;
        }
        setTierReels(prev => ({ ...prev, [tierId]: res.data.reels }));
        const profit = res.data.payout - res.data.cost;
        setTierResult(prev => ({ ...prev, [tierId]: { text: `${res.data.label} → ${formatNumber(res.data.payout)} Pts (${profit>=0?"+":""}${formatNumber(profit)})`, win: profit > 0 } }));
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); if (profit >= 50) casinoSounds.bigWin(); else casinoSounds.win(); } else { showLoss(-profit); casinoSounds.loss(); }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        setTierSpinning(null);
        fetchPoints();
        fetchTierSlots();
      }, 1500);
    } catch { clearInterval(iv); setTierResult(prev => ({ ...prev, [tierId]: { text: "Fehler!", win: false } })); setTierSpinning(null); }
  };

  const playScratch = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setScratchCards(["❓","❓","❓"]); setScratchResult(null); setDoubleActive(false);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "scratch" }) as any;
      if (!res.success) { setScratchResult({ text: res.error, win: false }); return; }
      setTimeout(() => { setScratchCards([res.data.symbols[0],"❓","❓"]); casinoSounds.reveal(); }, 400);
      setTimeout(() => { setScratchCards([res.data.symbols[0],res.data.symbols[1],"❓"]); casinoSounds.reveal(); }, 900);
      setTimeout(() => {
        setScratchCards(res.data.symbols); casinoSounds.reveal();
        const profit = res.data.payout - res.data.cost;
        setScratchResult({ text: `${res.data.label} → ${res.data.payout} Pts (${profit>=0?"+":""}${profit})${res.data.free ? " [GRATIS]" : ""}`, win: profit > 0 });
        if (res.data.freeLeft !== undefined) setFreePlays(f => f ? { ...f, scratch: res.data.freeLeft } : f);
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); casinoSounds.win(); } else { showLoss(-profit); casinoSounds.loss(); }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        fetchPoints();
      }, 1400);
    } catch { setScratchResult({ text: "Fehler!", win: false }); }
  };

  const playFlip = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setCoinFlipping(true); setCoinSide(null); setFlipResult(null);
    casinoSounds.coinFlip();
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "flip" }) as any;
      setTimeout(() => {
        setCoinFlipping(false);
        if (!res.success) { setFlipResult({ text: res.error, win: false }); return; }
        setCoinSide(res.data.result);
        setFlipResult({ text: `${res.data.win ? "GEWONNEN!" : "Verloren!"} ${res.data.payout - res.data.cost >= 0 ? "+" : ""}${res.data.payout - res.data.cost}${res.data.free ? " [GRATIS]" : ""}`, win: res.data.win });
        if (res.data.freeLeft !== undefined) setFreePlays(f => f ? { ...f, flip: res.data.freeLeft } : f);
        if (res.data.win) { showWin(1); casinoSounds.win(); } else { showLoss(1); casinoSounds.loss(); }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        fetchPoints();
      }, 1000);
    } catch { setCoinFlipping(false); setFlipResult({ text: "Fehler!", win: false }); }
  };

  // ── All-In ──
  const playAllIn = async () => {
    if (!user || allInPlaying || !points || points <= 0) return;
    setAllInPlaying(true); setAllInResult(null); setAllInShake(true);
    casinoSounds.allIn();
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "allin" }) as any;
      // Dramatic slow reveal
      setTimeout(() => {
        setAllInShake(false);
        setAllInPlaying(false);
        if (!res.success) {
          setAllInResult({ text: res.error ?? "Fehler!", win: false });
          return;
        }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        if (res.data.win) {
          setAllInResult({ text: `ALL-IN GEWONNEN! +${res.data.payout} Punkte!`, win: true });
          showWin(res.data.payout);
          casinoSounds.jackpot();
          if (confettiRef.current) spawnConfetti(confettiRef.current, 200, true);
          showMultiplier("ALL-IN WIN!");
        } else {
          setAllInResult({ text: `ALL-IN VERLOREN! ${res.data.amount} Punkte weg!`, win: false });
          showLoss(res.data.amount || 0);
          casinoSounds.loss();
        }
        fetchPoints();
      }, 2500);
    } catch { setAllInPlaying(false); setAllInShake(false); setAllInResult({ text: "Fehler!", win: false }); }
  };

  // ── Glucksrad ──
  const spinWheel = async () => {
    if (!user || wheelSpinning) return;
    setWheelSpinning(true); setWheelResult(null);
    casinoSounds.spin();
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

  // ── Minigame: Snake ──
  const startSnake = () => {
    setSnakeScore(0); setSnakeGameOver(false); setSnakeSubmitted(false); setSnakePoints(0);
    const g = snakeRef.current;
    g.snake = [{ x: 10, y: 10 }];
    g.dir = { x: 1, y: 0 };
    g.apple = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    g.score = 0; g.running = true;
    if (snakeTimerRef.current) clearInterval(snakeTimerRef.current);
    snakeTimerRef.current = setInterval(snakeTick, 120);
    drawSnake();
  };

  const snakeTick = () => {
    const g = snakeRef.current;
    if (!g.running) return;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    // Wall collision
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) { endSnake(); return; }
    // Self collision
    if (g.snake.some(s => s.x === head.x && s.y === head.y)) { endSnake(); return; }
    g.snake.unshift(head);
    if (head.x === g.apple.x && head.y === g.apple.y) {
      g.score++;
      setSnakeScore(g.score);
      // New apple not on snake
      let ax: number, ay: number;
      do { ax = Math.floor(Math.random() * 20); ay = Math.floor(Math.random() * 20); }
      while (g.snake.some(s => s.x === ax && s.y === ay));
      g.apple = { x: ax, y: ay };
    } else {
      g.snake.pop();
    }
    drawSnake();
  };

  const drawSnake = () => {
    const canvas = snakeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = snakeRef.current;
    const cell = canvas.width / 20;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke(); }
    // Apple
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(g.apple.x * cell + cell / 2, g.apple.y * cell + cell / 2, cell / 2.5, 0, Math.PI * 2); ctx.fill();
    // Snake
    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#22c55e" : "#16a34a";
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
  };

  const endSnake = () => {
    const g = snakeRef.current;
    g.running = false;
    if (snakeTimerRef.current) { clearInterval(snakeTimerRef.current); snakeTimerRef.current = null; }
    setSnakeGameOver(true);
    drawSnake();
  };

  const submitSnake = async () => {
    if (!user || snakeSubmitted) return;
    setSnakeSubmitted(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/snake/submit`, { score: snakeRef.current.score }) as any;
      if (res.success) { setSnakePoints(res.data.points); fetchPoints(); }
      else setConnect4Msg(res.error ?? "Fehler!");
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeMinigame !== "snake" || !snakeRef.current.running) return;
      const g = snakeRef.current;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": if (g.dir.y !== 1) g.dir = { x: 0, y: -1 }; break;
        case "ArrowDown": case "s": case "S": if (g.dir.y !== -1) g.dir = { x: 0, y: 1 }; break;
        case "ArrowLeft": case "a": case "A": if (g.dir.x !== 1) g.dir = { x: -1, y: 0 }; break;
        case "ArrowRight": case "d": case "D": if (g.dir.x !== -1) g.dir = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeMinigame]);

  // Cleanup snake timer
  useEffect(() => { return () => { if (snakeTimerRef.current) clearInterval(snakeTimerRef.current); }; }, []);

  // ── Minigame: Connect 4 ──
  const fetchConnect4 = async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/minigame/connect4`) as any;
      if (res.success) setConnect4(res.data);
    } catch { /* ignore */ }
  };

  const createConnect4Game = async () => {
    if (!user || connect4Loading) return;
    setConnect4Loading(true); setConnect4Msg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/connect4/create`, { bet: connect4Bet, displayName: user.displayName }) as any;
      if (res.success) { setConnect4(res.data); fetchPoints(); }
      else setConnect4Msg(res.error ?? "Fehler!");
    } catch { setConnect4Msg("Fehler!"); }
    setConnect4Loading(false);
  };

  const joinConnect4Game = async () => {
    if (!user || connect4Loading) return;
    setConnect4Loading(true); setConnect4Msg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/connect4/join`, { displayName: user.displayName }) as any;
      if (res.success) { setConnect4(res.data); fetchPoints(); }
      else setConnect4Msg(res.error ?? "Fehler!");
    } catch { setConnect4Msg("Fehler!"); }
    setConnect4Loading(false);
  };

  const playConnect4Move = async (col: number) => {
    if (!user || connect4Loading) return;
    setConnect4Loading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/connect4/play`, { col }) as any;
      if (res.success) { setConnect4(res.data); if (res.data.status === "finished") fetchPoints(); }
      else setConnect4Msg(res.error ?? "Fehler!");
    } catch { setConnect4Msg("Fehler!"); }
    setConnect4Loading(false);
  };

  // Poll Connect 4 state
  useEffect(() => {
    if (activeMinigame === "connect4" && connect4 && (connect4.status === "waiting" || connect4.status === "playing")) {
      connect4PollRef.current = setInterval(fetchConnect4, 2000);
      return () => clearInterval(connect4PollRef.current);
    } else {
      if (connect4PollRef.current) clearInterval(connect4PollRef.current);
    }
  }, [activeMinigame, connect4?.status]);

  // ── Minigame: Memory ──
  const MEMORY_EMOJIS = ["🎰", "🎲", "🃏", "💎", "🍀", "🔥", "⭐", "🎁"];

  const startMemory = () => {
    const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    setMemoryCards(pairs.map(emoji => ({ emoji, flipped: false, matched: false })));
    setMemoryFlipped([]); setMemoryMoves(0); setMemoryComplete(false); setMemoryPoints(0);
    setMemoryStartTime(Date.now());
    memoryLockRef.current = false;
  };

  const flipMemoryCard = (index: number) => {
    if (memoryLockRef.current || memoryComplete) return;
    if (memoryCards[index].flipped || memoryCards[index].matched) return;
    if (memoryFlipped.length >= 2) return;

    const newCards = [...memoryCards];
    newCards[index] = { ...newCards[index], flipped: true };
    const newFlipped = [...memoryFlipped, index];
    setMemoryCards(newCards);
    setMemoryFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const newMoves = memoryMoves + 1;
      setMemoryMoves(newMoves);
      memoryLockRef.current = true;

      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        // Match
        setTimeout(() => {
          setMemoryCards(prev => {
            const updated = [...prev];
            updated[a] = { ...updated[a], matched: true };
            updated[b] = { ...updated[b], matched: true };
            const allMatched = updated.every(c => c.matched);
            if (allMatched) {
              setMemoryComplete(true);
              submitMemory(8, Date.now() - memoryStartTime, newMoves);
            }
            return updated;
          });
          setMemoryFlipped([]);
          memoryLockRef.current = false;
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setMemoryCards(prev => {
            const updated = [...prev];
            updated[a] = { ...updated[a], flipped: false };
            updated[b] = { ...updated[b], flipped: false };
            return updated;
          });
          setMemoryFlipped([]);
          memoryLockRef.current = false;
        }, 800);
      }
    }
  };

  const submitMemory = async (pairs: number, timeMs: number, moves: number) => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/memory/submit`, { pairs, timeMs, moves }) as any;
      if (res.success) { setMemoryPoints(res.data.points); fetchPoints(); }
    } catch { /* ignore */ }
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
        @keyframes pet-walk { 0% { transform: translateX(-100px) scaleX(1); } 25% { transform: translateX(25vw) scaleX(1) translateY(-10px); } 50% { transform: translateX(50vw) scaleX(1); } 75% { transform: translateX(75vw) scaleX(1) translateY(-10px); } 100% { transform: translateX(calc(100vw + 50px)) scaleX(1); } }
        @keyframes pet-feed-chomp { 0%,100% { transform: scale(1) rotate(0); } 25% { transform: scale(1.2) rotate(-5deg); } 50% { transform: scale(0.9) rotate(5deg); } 75% { transform: scale(1.15) rotate(-3deg); } }
        @keyframes pet-feed-hearts { 0% { opacity: 1; transform: translateY(0) scale(0.5); } 100% { opacity: 0; transform: translateY(-60px) scale(1.5); } }
        @keyframes poop-wobble { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
        @keyframes poop-splat { 0% { transform: scale(0) rotate(0); opacity: 0; } 50% { transform: scale(1.3) rotate(10deg); opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes clean-wipe { 0% { transform: translateX(0) rotate(0); opacity: 1; } 50% { transform: translateX(30px) rotate(15deg); opacity: 0.8; } 100% { transform: translateX(0) rotate(0); opacity: 0; } }
        @keyframes paw-print { 0% { opacity: 0; transform: scale(0); } 30% { opacity: 0.6; transform: scale(1); } 100% { opacity: 0; transform: scale(0.8); } }
        @keyframes autoflip-spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(720deg); } }
        @keyframes autoflip-result { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
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

      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-[60]" />

      {/* ── Bonus Sidebar ── */}
      {user && (
        <>
          <button onClick={async () => {
            if (!bonusSidebar) {
              try {
                const res = await api.get<any>(`/viewer/${channelName}/casino/bonuses`) as any;
                if (res.data) setBonusData(res.data);
              } catch {}
            }
            setBonusSidebar(!bonusSidebar);
          }} className="fixed right-0 top-1/2 -translate-y-1/2 z-20 px-1.5 py-4 rounded-l-lg text-xs font-bold writing-vertical"
            style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.8), rgba(100,65,165,0.8))", color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", backdropFilter: "blur(8px)" }}>
            📊 Boni
          </button>
          {bonusSidebar && (
            <div className="fixed right-0 top-0 h-full w-80 z-20 overflow-y-auto" style={{ background: "linear-gradient(180deg, rgba(10,10,26,0.97), rgba(0,0,0,0.98))", borderLeft: "1px solid rgba(168,85,247,0.3)", backdropFilter: "blur(12px)" }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-purple-300">📊 Aktive Boni</h3>
                  <button onClick={() => setBonusSidebar(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
                </div>

                {bonusData ? (
                  <>
                    {/* Totals */}
                    <div className="space-y-1.5 mb-4">
                      {Object.entries(bonusData.totals).map(([cat, info]) => (
                        <div key={cat} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                          <span className="text-xs text-gray-300">{info.label}</span>
                          <span className="text-xs font-bold text-purple-300">{info.total}</span>
                        </div>
                      ))}
                      {bonusData.mood < 100 && (
                        <div className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <span className="text-xs text-gray-300">Pet-Stimmung</span>
                          <span className={`text-xs font-bold ${bonusData.mood > 50 ? "text-yellow-400" : "text-red-400"}`}>{bonusData.mood}% Effektivität</span>
                        </div>
                      )}
                    </div>

                    {/* Detail Lines */}
                    <h4 className="text-xs font-bold text-gray-500 mb-2">QUELLEN</h4>
                    <div className="space-y-1">
                      {bonusData.lines.map((line: any, i: number) => (
                        <div key={i} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="text-xs text-white font-medium">{line.source}</div>
                          <div className="text-[10px] text-purple-400">{line.effect}</div>
                        </div>
                      ))}
                      {bonusData.lines.length === 0 && (
                        <p className="text-xs text-gray-600">Noch keine Boni! Investiere in Skills, kaufe ein Pet oder rüste Items aus.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">Laden...</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Auto-Flip Widget (fixed bottom-left) */}
      {autoFlip?.active && (
        <div className="fixed bottom-4 left-4 z-20 rounded-2xl p-3" style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.8))",
          border: "1px solid rgba(255,215,0,0.3)",
          backdropFilter: "blur(8px)",
          minWidth: "140px",
        }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl" key={autoFlipTick} style={{ animation: "autoflip-spin 1s ease-out" }}>🪙</div>
            <div>
              <div className="text-xs font-bold text-yellow-300">Auto-Flip</div>
              <div className="text-[10px] text-gray-400">P{autoFlip.prestige} · alle {autoFlip.interval}s</div>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-green-400">{autoFlip.totalWon}W</span>
            <span className="text-red-400">{autoFlip.totalFlips - autoFlip.totalWon}L</span>
            <span className="text-gray-400">{autoFlip.totalFlips} total</span>
          </div>
          <div className="h-1 rounded-full bg-black/40 mt-1 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${autoFlip.totalFlips > 0 ? (autoFlip.totalWon / autoFlip.totalFlips) * 100 : 50}%`,
              background: "linear-gradient(90deg, #4ade80, #fbbf24)",
            }} />
          </div>
        </div>
      )}

      {/* Sound mute/unmute button */}
      <button
        onClick={() => { const next = !soundMuted; setSoundMuted(next); casinoSounds.setMute(next); if (!next) casinoSounds.toggle(); }}
        className={`fixed ${autoFlip?.active ? "bottom-28" : "bottom-4"} left-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110`}
        style={{ background: "rgba(20,20,40,0.85)", border: "1px solid rgba(145,71,255,0.4)", color: soundMuted ? "#666" : "#c084fc" }}
        title={soundMuted ? "Sound einschalten" : "Sound ausschalten"}
      >
        {soundMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
      </button>

      {/* Siren flash overlay */}
      {sirenActive && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{ animation: "siren-flash 0.3s ease-in-out infinite" }} />
      )}

      {/* Pet Walk Animation */}
      {petWalkAnim && pet && (
        <div className="fixed bottom-20 left-0 pointer-events-none z-50" style={{ animation: "pet-walk 3s ease-in-out forwards" }}>
          <div className="text-6xl">{(() => { const e: Record<string,string> = {cat:"🐱",dog:"🐶",bunny:"🐰",fox:"🦊",panda:"🐼",dragon:"🐉",unicorn:"🦄",phoenix:"🔥",alien:"👾",robot:"🤖",kraken:"🦑",void:"🕳️"}; return e[pet.activePetId] ?? "🐱"; })()}</div>
          <div className="text-sm absolute -bottom-4 left-0" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.3s" }}>🐾</div>
          <div className="text-sm absolute -bottom-4 left-6" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.6s" }}>🐾</div>
          <div className="text-sm absolute -bottom-4 left-12" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.9s" }}>🐾</div>
        </div>
      )}

      {/* Pet Feed Animation */}
      {petFeedAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div style={{ animation: "pet-feed-chomp 0.4s ease-in-out 4" }}>
            <div className="text-7xl">😋🍖</div>
          </div>
          <div className="absolute text-3xl" style={{ animation: "pet-feed-hearts 2s ease-out forwards" }}>❤️❤️❤️</div>
        </div>
      )}

      {/* Pet Clean Animation */}
      {petCleanAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-7xl" style={{ animation: "clean-wipe 0.5s ease-in-out 3" }}>🧹✨</div>
        </div>
      )}

      {/* Lootbox Drop Animation */}
      {lootboxDropAnim && (
        <div className="fixed inset-0 flex items-center justify-center z-[55] pointer-events-none">
          <div className="text-center" style={{ animation: "mystery-open 5s ease-out forwards" }}>
            {lootboxDropAnim.type === "pet" ? (
              <>
                <div className="text-8xl mb-4" style={{ animation: "multiplier-pop 3s ease-out", textShadow: "0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4)" }}>
                  {lootboxDropAnim.data.emoji}
                </div>
                <div className="text-3xl font-black text-yellow-300 mb-2" style={{ textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
                  LEGENDÄRES PET!
                </div>
                <div className="text-xl font-bold text-white">{lootboxDropAnim.data.name}</div>
                <div className="text-sm text-purple-300 mt-1">Bonus: {lootboxDropAnim.data.bonus} +{(lootboxDropAnim.data.perLevel * 100).toFixed(1)}%/LVL</div>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4" style={{ animation: "multiplier-pop 3s ease-out", textShadow: "0 0 30px rgba(168,85,247,0.8)" }}>
                  {lootboxDropAnim.data.emoji}
                </div>
                <div className="text-2xl font-black text-purple-300 mb-2" style={{ textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
                  EPISCHES ITEM!
                </div>
                <div className="text-lg font-bold text-white">{lootboxDropAnim.data.name}</div>
                <div className="text-sm text-purple-400 mt-1">+{lootboxDropAnim.data.bonusValue} Bonus</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cat walk */}
      {catWalk && (
        <div className="fixed top-1/2 left-0 pointer-events-none z-50 text-8xl" style={{ animation: "cat-walk 3s linear forwards" }}>
          🐈‍⬛✨
        </div>
      )}

      {/* Multiplier popup */}
      {multiplierAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="multiplier-anim text-7xl font-black" style={{
            color: "#ffd700", textShadow: "0 0 30px #ffd700, 0 0 60px #ff6600, 0 0 90px #ff0000",
          }}>{multiplierAnim}</div>
        </div>
      )}

      {/* Quest Bonus floating text */}
      {questBonusAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="quest-bonus-anim text-4xl font-black text-green-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.8)" }}>
            {questBonusAnim}
          </div>
        </div>
      )}

      {/* Achievement unlock popup */}
      {newAchievementPopup && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[55]">
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
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[55]">
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
                {points !== null ? `${formatNumber(points)} PTS` : "..."}
              </div>
              <input value={channelInput} onChange={(e) => setChannelInput(e.target.value)} placeholder="Channel" className="bg-black/40 border border-yellow-500/20 rounded-lg px-2 py-1 text-xs text-center w-28" />
              {loginStreak && loginStreak.streak > 0 && (
                <div className="rounded-full px-3 py-1.5 font-black text-sm flex items-center gap-1" style={{
                  background: "linear-gradient(135deg, rgba(255,69,0,0.25), rgba(255,140,0,0.15))",
                  border: "1px solid rgba(255,69,0,0.5)",
                  color: "#ff6b35",
                  animation: "streak-pulse 2s ease-in-out infinite",
                }}>
                  <span style={{ animation: "fire-flicker 1s ease-in-out infinite", display: "inline-block" }}>🔥</span>
                  {loginStreak.streak}
                </div>
              )}
            </div>
            {loginStreak && loginStreak.streak > 0 && (
              <div className="flex justify-center gap-3 text-[10px] mt-1">
                <span className="text-orange-400">Tage in Folge: {loginStreak.streak}</span>
                <span className="text-gray-600">Gesamt: {loginStreak.totalLogins} Logins</span>
                <span className="text-orange-600">Rekord: {loginStreak.longestStreak}</span>
              </div>
            )}
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

      {/* ── TAB NAVIGATION ── */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-purple-500/20 mb-4">
        <div className="max-w-4xl mx-auto flex">
          {([
            { id: "play" as const, label: "\uD83C\uDFB0 Spielen", color: "#ffd700" },
            { id: "minigames" as const, label: "\uD83C\uDFAE Minigames", color: "#4ade80" },
            { id: "pets" as const, label: "\uD83D\uDC3E Pets", color: "#f472b6" },
            { id: "progress" as const, label: "\uD83C\uDFC6 Fortschritt", color: "#a78bfa" },
            { id: "social" as const, label: "\uD83D\uDC65 Social", color: "#60a5fa" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id ? "border-b-2" : "text-gray-500 hover:text-gray-300"}`}
              style={activeTab === tab.id ? { color: tab.color, borderColor: tab.color } : {}}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "play" && (<>
      {/* ══════════════════════════════════════════════════════════════════
          GAME MACHINES (3 existing + All-In below)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-0">
        {/* SLOT MACHINE */}
        <div className="slot-machine rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5,#9146ff)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-3 -right-3 text-3xl z-10" style={{ animation: "poop-wobble 1s ease-in-out infinite" }}>💩</div>}
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
        <div className="rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#00cc88,#009966,#00cc88)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-2 left-1/2 text-2xl z-10" style={{ animation: "poop-wobble 1.2s ease-in-out infinite" }}>💩</div>}
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
        <div className="rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#ffd700,#ff8c00,#ffd700)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-3 -left-2 text-2xl z-10" style={{ animation: "poop-wobble 0.8s ease-in-out infinite", animationDelay: "0.3s" }}>💩</div>}
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
            <p className="text-3xl font-black text-white mb-3">
              {points !== null && points > 0 ? `${formatNumber(points)} PUNKTE` : "---"}
            </p>
            {allInResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${allInResult.win ? "text-green-400 bg-green-500/10 border border-green-500/30" : "text-red-400 bg-red-500/10 border border-red-500/30"}`}>
                {allInResult.text}
              </div>
            )}
            <div className="flex justify-center gap-3 mb-2">
              <button onClick={playAllIn} disabled={allInPlaying || !points || points <= 0}
                className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                style={{ background: allInPlaying ? "#666" : "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                {allInPlaying ? "..." : `💀 90% ALL-IN (${points ? formatNumber(Math.floor(points * 0.9)) : 0})`}
              </button>
              <button onClick={async () => {
                if (!user || allInPlaying || !points || points <= 0) return;
                setAllInPlaying(true); setAllInResult(null); setAllInShake(true);
                try {
                  const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "deadlyallin" }) as any;
                  setTimeout(() => {
                    setAllInShake(false); setAllInPlaying(false);
                    if (!res.success) { setAllInResult({ text: res.error ?? "Fehler!", win: false }); return; }
                    if (res.data.specials?.length) enqueueSpecials(res.data.specials);
                    processProgression(res.data.progression);
                    if (res.data.win) {
                      setAllInResult({ text: `DEADLY WIN! x3! +${formatNumber(res.data.payout)}!`, win: true });
                      showWin(res.data.payout);
                      if (confettiRef.current) spawnConfetti(confettiRef.current, 300, true);
                      showMultiplier("DEADLY WIN x3!");
                    } else {
                      setAllInResult({ text: `☠️ ALLES WEG! ${formatNumber(res.data.amount)} Punkte verloren!`, win: false });
                      showLoss(res.data.amount || 0);
                    }
                    fetchPoints();
                  }, 2500);
                } catch { setAllInPlaying(false); setAllInShake(false); }
              }} disabled={allInPlaying || !points || points <= 0}
                className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                style={{ background: allInPlaying ? "#666" : "linear-gradient(135deg, #000, #4a0000, #000)", border: "2px solid rgba(220,38,38,0.8)" }}>
                {allInPlaying ? "..." : `☠️ DEADLY (${points ? formatNumber(points) : 0})`}
              </button>
            </div>
            <div className="flex justify-center gap-4 text-[10px] text-gray-600">
              <span>90%: 40% Chance · 2.5x</span>
              <span>|</span>
              <span>Deadly: 35% Chance · 3x · ALLES oder NICHTS</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PREMIUM SLOTS (Tiered)
         ══════════════════════════════════════════════════════════════════ */}
      {user && tierSlots && (
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <h2 className="text-center text-2xl font-black mb-4" style={{ background: "linear-gradient(90deg, #ffd700, #ff6b6b, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PREMIUM SLOTS
          </h2>
          <p className="text-center text-xs text-gray-500 mb-4">Investiere in Skills & Pets um Premium-Maschinen freizuschalten</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tierSlots.tiers.map((tier: any, idx: number) => {
              const reels = tierReels[tier.id] || ["❓","❓","❓"];
              const result = tierResult[tier.id];
              const spinning = tierSpinning === tier.id;
              const locked = !tier.unlocked;
              const colors = ["#60a5fa","#ffd700","#a78bfa","#f472b6","#22d3ee","#4ade80","#f97316","#e879f9","#fbbf24","#6ee7b7"];
              const c = colors[idx % colors.length]!;
              const fmt = (n: number) => n >= 1e9 ? `${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);
              return (
                <div key={tier.id} className="rounded-2xl p-[2px]" style={{ background: `linear-gradient(135deg, ${c}, ${c}88, ${c})`, opacity: locked ? 0.5 : 1 }}>
                  <div className="rounded-2xl p-4" style={{ background: "linear-gradient(180deg,#1a1a2e,#0d0d1a)" }}>
                    <h3 className="text-center text-lg font-black mb-1" style={{ color: c }}>{tier.emoji} {tier.name}</h3>
                    <p className="text-center text-xs text-gray-500 mb-1">{fmt(tier.cost)} Pts · 777 = {fmt(tier.jackpot ?? 0)}</p>
                    {locked ? (
                      <div className="text-center py-4">
                        <div className="text-3xl mb-2">🔒</div>
                        <p className="text-xs text-gray-400">Investiere {fmt(tier.requirement)}</p>
                        <p className="text-[10px] text-gray-600 mt-1">Aktuell: {fmt(tierSlots.totalInvested)}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center gap-1 mb-3">
                          {reels.map((sym, i) => (
                            <div key={i} className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl" style={{
                              background: "linear-gradient(180deg,#1a1a1a,#0a0a0a)",
                              border: "2px solid rgba(145,71,255,0.3)",
                              boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)",
                              transition: "transform 0.1s",
                              transform: spinning ? "scaleY(0.95)" : "scaleY(1)",
                            }}>{sym}</div>
                          ))}
                        </div>
                        {result && <div className={`text-center mb-2 text-xs font-bold rounded-lg py-1.5 px-2 ${resultClass(result)}`}>{result.text}</div>}
                        <button onClick={() => playTierSlots(tier.id)} disabled={spinning || !user}
                          className="casino-btn w-full py-2 rounded-xl font-black text-sm text-black"
                          style={{ background: spinning ? "#666" : `linear-gradient(135deg, ${c}, ${c}88)` }}>
                          {spinning ? "SPINNING..." : `${tier.emoji} SPIN!`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          MINIGAMES
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "minigames" && (<>
      {user && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <h3 className="font-black text-lg text-purple-300 mb-3">🎮 MINIGAMES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Snake */}
            <button onClick={() => { setActiveMinigame("snake"); setTimeout(startSnake, 100); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="text-4xl mb-2">🐍</div>
              <div className="font-black text-green-400">Snake</div>
              <div className="text-xs text-gray-500 mt-1">1 Pt pro Apfel · Max 50</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>Spielen</div>
            </button>
            {/* Connect 4 */}
            <button onClick={() => { setActiveMinigame("connect4"); fetchConnect4(); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="text-4xl mb-2">🔴</div>
              <div className="font-black text-red-400">4 Gewinnt</div>
              <div className="text-xs text-gray-500 mt-1">Fordere jemanden heraus! Ab 5 Pts</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>Spielen</div>
            </button>
            {/* Memory */}
            <button onClick={() => { setActiveMinigame("memory"); startMemory(); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(168,85,247,0.3)" }}>
              <div className="text-4xl mb-2">🧠</div>
              <div className="font-black text-purple-400">Memory</div>
              <div className="text-xs text-gray-500 mt-1">Finde alle Paare! Bis zu 26 Pts</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc" }}>Spielen</div>
            </button>
            {/* Dice 21 */}
            <button onClick={() => setActiveMinigame("dice21" as any)} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(251,146,60,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(251,146,60,0.3)" }}>
              <div className="text-4xl mb-2">🎲</div>
              <div className="font-black text-orange-400">Würfel 21</div>
              <div className="text-xs text-gray-500 mt-1">Triff 21! Bis x3</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(251,146,60,0.2)", color: "#fb923c" }}>Spielen</div>
            </button>
            {/* Sudoku */}
            <button onClick={() => {
              setActiveMinigame("sudoku" as any);
              setSudokuDone(false); setSudokuMsg(null);
              api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${sudokuDiff}`).then((r: any) => {
                if (r.data) {
                  setSudokuPuzzle(r.data.puzzle);
                  setSudokuSolution(r.data.solution);
                  setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row]));
                  setSudokuStart(Date.now());
                }
              });
            }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(59,130,246,0.3)" }}>
              <div className="text-4xl mb-2">🔢</div>
              <div className="font-black text-blue-400">Sudoku</div>
              <div className="text-xs text-gray-500 mt-1">4x4 · Bis zu 75 Pts</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>Spielen</div>
            </button>
            {/* 9x9 Sudoku */}
            <button onClick={() => {
              setActiveMinigame("sudoku9" as any); setS9Done(false); setS9Msg(null);
              api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=${s9Diff}`).then((r: any) => {
                if (r.data) { setS9Puzzle(r.data.puzzle); setS9Grid(r.data.puzzle.map((row: number[]) => [...row])); setS9Start(Date.now()); }
              });
            }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(234,179,8,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(234,179,8,0.3)" }}>
              <div className="text-4xl mb-2">🧩</div>
              <div className="font-black text-yellow-400">Sudoku 9x9</div>
              <div className="text-xs text-gray-500 mt-1">Bis zu 15K Pts!</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(234,179,8,0.2)", color: "#eab308" }}>Spielen</div>
            </button>
            {/* Roulette */}
            <button onClick={() => { setActiveMinigame("roulette" as any); setRouletteResult(null); setRouletteBets([]); setRouletteMsg(null); }}
              className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="text-4xl mb-2">🎰</div>
              <div className="font-black text-green-400">Roulette</div>
              <div className="text-xs text-gray-500 mt-1">Nummer x36 · Farbe x2</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>Spielen</div>
            </button>
            {/* Poker */}
            <button onClick={() => { setActiveMinigame("poker" as any); setPokerHand(null); setPokerResult(null); setPokerMsg(null); setPokerSelected(new Set()); }}
              className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(220,38,38,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(220,38,38,0.3)" }}>
              <div className="text-4xl mb-2">🃏</div>
              <div className="font-black text-red-400">Poker</div>
              <div className="text-xs text-gray-500 mt-1">5-Card Draw vs Haus</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(220,38,38,0.2)", color: "#f87171" }}>Spielen</div>
            </button>
            {/* Over/Under */}
            <button onClick={() => setActiveMinigame("overunder" as any)} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,211,238,0.3)" }}>
              <div className="text-4xl mb-2">🎯</div>
              <div className="font-black text-cyan-400">Drüber/Drunter</div>
              <div className="text-xs text-gray-500 mt-1">Über/Unter 7? x2!</div>
              <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,211,238,0.2)", color: "#22d3ee" }}>Spielen</div>
            </button>
          </div>
        </div>
      )}
      </>)}

      {/* ── Snake Modal ── */}
      {activeMinigame === "snake" && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 35, background: "rgba(0,0,0,0.85)" }}>
          <div className="relative rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: "linear-gradient(180deg, #1a1a2e, #0a0a14)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <button onClick={() => { setActiveMinigame(null); if (snakeTimerRef.current) clearInterval(snakeTimerRef.current); snakeRef.current.running = false; }} className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl font-bold">✕</button>
            <h3 className="font-black text-xl text-green-400 text-center mb-1">🐍 Snake</h3>
            <div className="text-center text-sm text-gray-400 mb-3">Score: <span className="text-green-400 font-bold">{snakeScore}</span></div>
            <div className="flex justify-center mb-3">
              <canvas ref={snakeCanvasRef} width={400} height={400} className="rounded-xl" style={{ width: "min(400px, 80vw)", height: "min(400px, 80vw)", background: "#0a0a0a", border: "1px solid rgba(34,197,94,0.2)" }} />
            </div>
            {/* Mobile controls */}
            <div className="flex justify-center gap-1 mb-2 md:hidden">
              <div className="grid grid-cols-3 gap-1" style={{ width: 120 }}>
                <div />
                <button onClick={() => { if (snakeRef.current.dir.y !== 1) snakeRef.current.dir = { x: 0, y: -1 }; }} className="bg-gray-800 rounded p-2 text-center text-white font-bold">▲</button>
                <div />
                <button onClick={() => { if (snakeRef.current.dir.x !== 1) snakeRef.current.dir = { x: -1, y: 0 }; }} className="bg-gray-800 rounded p-2 text-center text-white font-bold">◀</button>
                <button onClick={() => { if (snakeRef.current.dir.y !== -1) snakeRef.current.dir = { x: 0, y: 1 }; }} className="bg-gray-800 rounded p-2 text-center text-white font-bold">▼</button>
                <button onClick={() => { if (snakeRef.current.dir.x !== -1) snakeRef.current.dir = { x: 1, y: 0 }; }} className="bg-gray-800 rounded p-2 text-center text-white font-bold">▶</button>
              </div>
            </div>
            {snakeGameOver && (
              <div className="text-center space-y-2">
                <div className="text-lg font-bold text-red-400">Game Over!</div>
                <div className="text-sm text-gray-400">Score: <span className="text-green-400 font-bold">{snakeScore}</span> Äpfel</div>
                {snakeSubmitted ? (
                  <div className="text-sm text-green-400 font-bold">+{snakePoints} Punkte erhalten!</div>
                ) : (
                  <button onClick={submitSnake} className="px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>Punkte einlösen</button>
                )}
                <button onClick={startSnake} className="px-6 py-2 rounded-xl font-bold text-sm text-white ml-2" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>Nochmal</button>
              </div>
            )}
            {!snakeGameOver && <div className="text-center text-xs text-gray-600">Pfeiltasten / WASD zum Steuern</div>}
          </div>
        </div>
      )}

      {/* ── Connect 4 Modal ── */}
      {activeMinigame === "connect4" && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 35, background: "rgba(0,0,0,0.85)" }}>
          <div className="relative rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: "linear-gradient(180deg, #1a1a2e, #0a0a14)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <button onClick={() => { setActiveMinigame(null); if (connect4PollRef.current) clearInterval(connect4PollRef.current); }} className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl font-bold">✕</button>
            <h3 className="font-black text-xl text-red-400 text-center mb-3">🔴 4 Gewinnt</h3>
            {connect4Msg && <div className="text-center text-sm text-yellow-400 mb-2">{connect4Msg}</div>}

            {/* No active game — create */}
            {(!connect4 || connect4.status === "finished") && (
              <div className="text-center space-y-3">
                {connect4?.status === "finished" && (
                  <div className="mb-3">
                    <div className={`text-lg font-bold ${connect4.winner === "draw" ? "text-yellow-400" : connect4.winner === user?.twitchId ? "text-green-400" : "text-red-400"}`}>
                      {connect4.winner === "draw" ? "Unentschieden! Einsätze zurück." : connect4.winner === user?.twitchId ? `Gewonnen! +${connect4.bet * 2} Pts!` : "Verloren!"}
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-400">Einsatz wählen:</div>
                <div className="flex items-center justify-center gap-2">
                  <input type="number" min={5} value={connect4Bet} onChange={(e) => setConnect4Bet(Math.max(5, parseInt(e.target.value) || 5))} className="w-20 px-3 py-2 rounded-lg bg-gray-800 text-white text-center border border-gray-700 text-sm" />
                  <span className="text-xs text-gray-500">Pts</span>
                </div>
                <button onClick={createConnect4Game} disabled={connect4Loading} className="px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: connect4Loading ? "#666" : "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  Herausforderung erstellen
                </button>
              </div>
            )}

            {/* Waiting for opponent */}
            {connect4?.status === "waiting" && (
              <div className="text-center space-y-3">
                <div className="text-sm text-gray-400">Einsatz: <span className="text-yellow-400 font-bold">{connect4.bet} Pts</span></div>
                {connect4.player1.userId === user?.twitchId ? (
                  <div className="text-yellow-400 animate-pulse">Warte auf Gegner...</div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">{connect4.player1.displayName} fordert heraus!</div>
                    <button onClick={joinConnect4Game} disabled={connect4Loading} className="px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: connect4Loading ? "#666" : "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                      Annehmen ({connect4.bet} Pts)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Active game board */}
            {connect4?.status === "playing" && connect4.board && (
              <div className="space-y-2">
                <div className="text-center text-sm mb-2">
                  <span className={connect4.currentTurn === 1 ? "text-red-400 font-bold" : "text-gray-500"}>{connect4.player1.displayName}</span>
                  <span className="text-gray-600 mx-2">vs</span>
                  <span className={connect4.currentTurn === 2 ? "text-yellow-400 font-bold" : "text-gray-500"}>{connect4.player2?.displayName}</span>
                </div>
                <div className="text-center text-xs text-gray-500 mb-1">
                  {((connect4.currentTurn === 1 && connect4.player1.userId === user?.twitchId) || (connect4.currentTurn === 2 && connect4.player2?.userId === user?.twitchId)) ? "Dein Zug!" : "Gegner ist dran..."}
                </div>
                {/* Column buttons */}
                <div className="flex justify-center gap-1 mb-1">
                  {Array.from({ length: 7 }).map((_, c) => (
                    <button key={c} onClick={() => playConnect4Move(c)} className="w-10 h-6 rounded text-xs font-bold hover:bg-gray-700 transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>▼</button>
                  ))}
                </div>
                {/* Board */}
                <div className="flex justify-center">
                  <div className="rounded-xl p-2" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                    {connect4.board.map((row: number[], r: number) => (
                      <div key={r} className="flex gap-1">
                        {row.map((cell: number, c: number) => (
                          <div key={c} className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                            background: cell === 0 ? "rgba(0,0,0,0.4)" : cell === 1 ? "#ef4444" : "#eab308",
                            border: cell === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                            boxShadow: cell !== 0 ? `0 0 8px ${cell === 1 ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.4)"}` : "none",
                          }} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Memory Modal ── */}
      {activeMinigame === "memory" && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 35, background: "rgba(0,0,0,0.85)" }}>
          <div className="relative rounded-2xl p-6 w-full max-w-md mx-4" style={{ background: "linear-gradient(180deg, #1a1a2e, #0a0a14)", border: "1px solid rgba(168,85,247,0.3)" }}>
            <button onClick={() => setActiveMinigame(null)} className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl font-bold">✕</button>
            <h3 className="font-black text-xl text-purple-400 text-center mb-1">🧠 Memory</h3>
            <div className="text-center text-sm text-gray-400 mb-3">
              Züge: <span className="text-purple-400 font-bold">{memoryMoves}</span>
              {memoryStartTime > 0 && !memoryComplete && <span className="ml-3">Zeit: <MemoryTimer start={memoryStartTime} /></span>}
              {memoryComplete && <span className="ml-3">Zeit: <span className="text-purple-400 font-bold">{((Date.now() - memoryStartTime) / 1000).toFixed(1)}s</span></span>}
            </div>
            {/* Card grid */}
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto mb-4">
              {memoryCards.map((card, i) => (
                <button key={i} onClick={() => flipMemoryCard(i)} className="aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 font-bold" style={{
                  background: card.matched ? "rgba(34,197,94,0.2)" : card.flipped ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                  border: card.matched ? "1px solid rgba(34,197,94,0.4)" : card.flipped ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  transform: card.flipped || card.matched ? "rotateY(0deg)" : "rotateY(0deg)",
                  cursor: card.flipped || card.matched || memoryComplete ? "default" : "pointer",
                }}>
                  {card.flipped || card.matched ? card.emoji : "❓"}
                </button>
              ))}
            </div>
            {memoryComplete && (
              <div className="text-center space-y-2">
                <div className="text-lg font-bold text-green-400">Alle Paare gefunden!</div>
                {memoryPoints > 0 && <div className="text-sm text-purple-400 font-bold">+{memoryPoints} Punkte erhalten!</div>}
                <button onClick={startMemory} className="px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)" }}>Nochmal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sudoku Modal */}
      {activeMinigame === ("sudoku" as any) && sudokuPuzzle && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #0a0a1a, #000)", border: "2px solid rgba(59,130,246,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-blue-400">🔢 Sudoku 4x4</h3>
              <button onClick={() => { setActiveMinigame(null); setSudokuPuzzle(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {/* Difficulty selector */}
            {!sudokuDone && (
              <div className="flex justify-center gap-2 mb-3">
                {(["easy", "medium", "hard"] as const).map(d => (
                  <button key={d} onClick={() => {
                    setSudokuDiff(d); setSudokuDone(false); setSudokuMsg(null);
                    api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${d}`).then((r: any) => {
                      if (r.data) { setSudokuPuzzle(r.data.puzzle); setSudokuSolution(r.data.solution); setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row])); setSudokuStart(Date.now()); }
                    });
                  }} className={`text-xs px-3 py-1 rounded-full font-bold ${sudokuDiff === d ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-300"}`}>
                    {d === "easy" ? "Leicht (10)" : d === "medium" ? "Mittel (25)" : "Schwer (50)"}
                  </button>
                ))}
              </div>
            )}
            {sudokuMsg && <p className={`text-sm mb-2 font-bold ${sudokuMsg.includes("+") ? "text-green-400" : sudokuMsg.includes("Falsch") ? "text-red-400" : "text-blue-400"}`}>{sudokuMsg}</p>}
            {/* Grid */}
            <div className="inline-grid gap-0.5 mx-auto mb-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {sudokuGrid.map((row, r) => row.map((val, c) => {
                const isOriginal = sudokuPuzzle![r]![c] !== 0;
                return (
                  <div key={`${r}-${c}`} className={`w-12 h-12 flex items-center justify-center text-lg font-black rounded-lg ${isOriginal ? "bg-blue-500/20 text-blue-300" : val > 0 ? "bg-white/10 text-white" : "bg-white/5 text-gray-600"}`}
                    style={{ border: `2px solid ${isOriginal ? "rgba(59,130,246,0.4)" : val > 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)"}`,
                      borderRight: c === 1 ? "3px solid rgba(59,130,246,0.5)" : undefined,
                      borderBottom: r === 1 ? "3px solid rgba(59,130,246,0.5)" : undefined,
                    }}>
                    {isOriginal ? val : (
                      <select value={val || ""} onChange={e => {
                        const newGrid = sudokuGrid.map(row => [...row]);
                        newGrid[r]![c] = parseInt(e.target.value) || 0;
                        setSudokuGrid(newGrid);
                      }} className="w-full h-full bg-transparent text-center text-lg font-black appearance-none cursor-pointer" style={{ color: val > 0 ? "#fff" : "#666" }}>
                        <option value="">-</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    )}
                  </div>
                );
              }))}
            </div>
            {!sudokuDone ? (
              <button onClick={async () => {
                // Check if all filled
                const allFilled = sudokuGrid.every(row => row.every(v => v > 0));
                if (!allFilled) { setSudokuMsg("Fülle alle Felder aus!"); return; }
                // Validate
                // Validate: rows, cols, boxes (accepts any valid solution)
                const sz = sudokuGrid.length; const bx = sz === 9 ? 3 : 2; let ok = true;
                for (let r = 0; r < sz && ok; r++) { if (new Set(sudokuGrid[r]).size !== sz) ok = false; }
                for (let c = 0; c < sz && ok; c++) { if (new Set(sudokuGrid.map(row => row[c])).size !== sz) ok = false; }
                for (let br = 0; br < sz && ok; br += bx) for (let bc = 0; bc < sz && ok; bc += bx) {
                  const s = new Set<number>(); for (let r = br; r < br + bx; r++) for (let c = bc; c < bc + bx; c++) s.add(sudokuGrid[r]![c]!); if (s.size !== sz) ok = false;
                }
                if (!ok) { setSudokuMsg("❌ Falsch! Versuche es nochmal."); casinoSounds.loss(); return; }
                // Submit
                const timeMs = Date.now() - sudokuStart;
                const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku/submit`, { difficulty: sudokuDiff, timeMs }) as any;
                if (res.success) {
                  setSudokuDone(true);
                  setSudokuMsg(`✅ Gelöst in ${(timeMs/1000).toFixed(1)}s! +${res.data.points} Pts!`);
                  casinoSounds.questComplete(); fetchPoints();
                } else { setSudokuMsg(res.error ?? "Fehler!"); }
              }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black" style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}>
                ✅ Prüfen
              </button>
            ) : (
              <button onClick={() => {
                setSudokuDone(false); setSudokuMsg(null);
                api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${sudokuDiff}`).then((r: any) => {
                  if (r.data) { setSudokuPuzzle(r.data.puzzle); setSudokuSolution(r.data.solution); setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row])); setSudokuStart(Date.now()); }
                });
              }} className="casino-btn px-8 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}>
                🔄 Nochmal
              </button>
            )}
          </div>
        </div>
      )}

      {/* 9x9 Sudoku Modal */}
      {activeMinigame === ("sudoku9" as any) && s9Puzzle && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-4 text-center max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, #0a0a1a, #000)", border: "2px solid rgba(234,179,8,0.4)" }}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-lg text-yellow-400">🧩 Sudoku 9x9</h3>
              <button onClick={() => { setActiveMinigame(null); setS9Puzzle(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex justify-center gap-2 mb-2">
              {(["easy", "medium", "hard"] as const).map(d => (
                <button key={d} onClick={() => {
                  setS9Diff(d); setS9Done(false); setS9Msg(null);
                  api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=${d}`).then((r: any) => {
                    if (r.data) { setS9Puzzle(r.data.puzzle); setS9Grid(r.data.puzzle.map((row: number[]) => [...row])); setS9Start(Date.now()); }
                  });
                }} className={`text-[10px] px-2 py-1 rounded-full font-bold ${s9Diff === d ? "bg-yellow-500 text-black" : "bg-yellow-500/20 text-yellow-300"}`}>
                  {d === "easy" ? "Leicht (2.5K)" : d === "medium" ? "Mittel (5K)" : "Schwer (10K)"}
                </button>
              ))}
            </div>
            {s9Msg && <p className={`text-sm mb-2 font-bold ${s9Msg.includes("+") ? "text-green-400" : s9Msg.includes("Falsch") ? "text-red-400" : "text-yellow-400"}`}>{s9Msg}</p>}
            <div className="inline-grid gap-[1px] mx-auto mb-2" style={{ gridTemplateColumns: "repeat(9, 1fr)" }}>
              {s9Grid.map((row, r) => row.map((val, c) => {
                const isOrig = s9Puzzle![r]![c] !== 0;
                return (
                  <div key={`${r}-${c}`} className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded ${isOrig ? "bg-yellow-500/20 text-yellow-300" : val > 0 ? "bg-white/10 text-white" : "bg-white/5 text-gray-600"}`}
                    style={{
                      border: `1px solid ${isOrig ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.08)"}`,
                      borderRight: (c === 2 || c === 5) ? "2px solid rgba(234,179,8,0.5)" : undefined,
                      borderBottom: (r === 2 || r === 5) ? "2px solid rgba(234,179,8,0.5)" : undefined,
                    }}>
                    {isOrig ? val : (
                      <select value={val || ""} onChange={e => {
                        const g = s9Grid.map(row => [...row]);
                        g[r]![c] = parseInt(e.target.value) || 0;
                        setS9Grid(g);
                      }} className="w-full h-full bg-transparent text-center text-sm font-bold appearance-none cursor-pointer" style={{ color: val > 0 ? "#fff" : "#666" }}>
                        <option value="">-</option>
                        {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    )}
                  </div>
                );
              }))}
            </div>
            {!s9Done ? (
              <button onClick={async () => {
                if (s9Grid.some(row => row.some(v => !v || v < 1 || v > 9))) { setS9Msg("Fülle alle Felder!"); return; }
                // Validate locally
                let ok = true;
                for (let r = 0; r < 9 && ok; r++) { if (new Set(s9Grid[r]).size !== 9) ok = false; }
                for (let c = 0; c < 9 && ok; c++) { if (new Set(s9Grid.map(row => row[c])).size !== 9) ok = false; }
                for (let br = 0; br < 9 && ok; br += 3) for (let bc = 0; bc < 9 && ok; bc += 3) {
                  const s = new Set<number>(); for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) s.add(s9Grid[r]![c]!); if (s.size !== 9) ok = false;
                }
                if (!ok) { setS9Msg("❌ Falsch!"); casinoSounds.loss(); return; }
                const timeMs = Date.now() - s9Start;
                const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku9/submit`, { submitted: s9Grid, difficulty: s9Diff, timeMs }) as any;
                if (res.success) { setS9Done(true); setS9Msg(`✅ Gelöst in ${(timeMs/1000).toFixed(0)}s! +${formatNumber(res.data.points)} Pts!`); casinoSounds.jackpot(); fetchPoints(); }
                else setS9Msg(res.error ?? "Fehler!");
              }} className="casino-btn px-6 py-2 rounded-xl font-black text-black" style={{ background: "linear-gradient(135deg, #eab308, #ca8a04)" }}>
                ✅ Prüfen
              </button>
            ) : (
              <button onClick={() => {
                setS9Done(false); setS9Msg(null);
                api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=${s9Diff}`).then((r: any) => {
                  if (r.data) { setS9Puzzle(r.data.puzzle); setS9Grid(r.data.puzzle.map((row: number[]) => [...row])); setS9Start(Date.now()); }
                });
              }} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.4)" }}>
                🔄 Nochmal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Roulette Modal */}
      {activeMinigame === ("roulette" as any) && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-5 text-center max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, #0a1a0a, #000)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-green-400">🎰 Roulette</h3>
              <button onClick={() => setActiveMinigame(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {rouletteMsg && <p className={`text-sm mb-2 font-bold ${rouletteMsg.includes("+") ? "text-green-400" : "text-red-400"}`}>{rouletteMsg}</p>}

            {rouletteResult && (
              <div className="mb-3">
                <div className={`text-5xl font-black mb-1 ${rouletteResult.color === "red" ? "text-red-500" : rouletteResult.color === "black" ? "text-white" : "text-green-500"}`}>
                  {rouletteResult.result}
                </div>
                <div className="text-lg">{rouletteResult.color === "red" ? "🔴 Rot" : rouletteResult.color === "black" ? "⚫ Schwarz" : "🟢 Grün (0)"}</div>
              </div>
            )}

            {/* Bet amount */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-gray-500 text-xs">Pro Wette:</span>
              <input type="number" min={5} value={rouletteBet} onChange={e => setRouletteBet(Math.max(5, +e.target.value))} className="w-20 bg-black/40 border border-green-500/30 rounded-lg px-2 py-1 text-center text-white text-sm" />
            </div>

            {/* Active bets */}
            {rouletteBets.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mb-2">
                {rouletteBets.map((b, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    {b.type === "number" ? `#${b.value}` : b.type === "dozen" ? `D${b.value}` : b.type === "column" ? `C${b.value}` : b.type}
                    <button onClick={() => setRouletteBets(rouletteBets.filter((_, j) => j !== i))} className="ml-1 text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Bet buttons */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-center gap-1">
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "red" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white">🔴 Rot x2</button>
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "black" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-white border border-gray-600">⚫ Schwarz x2</button>
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "even" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/30 text-blue-300">Gerade x2</button>
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "odd" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600/30 text-purple-300">Ungerade x2</button>
              </div>
              <div className="flex justify-center gap-1">
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "low" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600/30 text-cyan-300">1-18 x2</button>
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "high" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600/30 text-orange-300">19-36 x2</button>
                {[1,2,3].map(d => (
                  <button key={d} onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "dozen", value: d }])} className="px-2 py-1.5 rounded-lg text-xs font-bold bg-yellow-600/30 text-yellow-300">D{d} x3</button>
                ))}
              </div>
              {/* Number bet */}
              <div className="flex justify-center gap-1 items-center">
                <span className="text-xs text-gray-500">Nummer:</span>
                <input type="number" min={0} max={36} defaultValue={7} id="roulette-num" className="w-14 bg-black/40 border border-green-500/30 rounded-lg px-1 py-1 text-center text-white text-xs" />
                <button onClick={() => {
                  const num = parseInt((document.getElementById("roulette-num") as HTMLInputElement).value);
                  if (num >= 0 && num <= 36 && rouletteBets.length < 5) setRouletteBets([...rouletteBets, { type: "number", value: num }]);
                }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white">x36</button>
              </div>
            </div>

            {/* Spin */}
            <button onClick={async () => {
              if (rouletteBets.length === 0) { setRouletteMsg("Platziere mindestens 1 Wette!"); return; }
              setRouletteSpinning(true); setRouletteResult(null); setRouletteMsg(null);
              casinoSounds.spin();
              const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/roulette`, { betAmount: rouletteBet, bets: rouletteBets }) as any;
              setTimeout(() => {
                setRouletteSpinning(false);
                if (!res.success) { setRouletteMsg(res.error ?? "Fehler!"); return; }
                setRouletteResult(res.data);
                const p = res.data.totalProfit;
                setRouletteMsg(p >= 0 ? `+${formatNumber(res.data.totalPayout)} Pts!` : `${formatNumber(p)} Pts`);
                if (p > 0) casinoSounds.win(); else casinoSounds.loss();
                setRouletteBets([]);
                fetchPoints();
              }, 1500);
            }} disabled={rouletteSpinning || rouletteBets.length === 0}
              className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black w-full"
              style={{ background: rouletteSpinning ? "#666" : "linear-gradient(135deg, #4ade80, #22c55e)" }}>
              {rouletteSpinning ? "DREHT..." : `🎰 DREHEN (${formatNumber(rouletteBet * rouletteBets.length)} Pts)`}
            </button>
            <p className="text-[10px] text-gray-600 mt-2">Max 5 Wetten gleichzeitig · 0 = Grün (Haus)</p>
          </div>
        </div>
      )}

      {/* Poker Modal */}
      {activeMinigame === ("poker" as any) && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-md w-full mx-4" style={{ background: "linear-gradient(180deg, #1a0a0a, #000)", border: "2px solid rgba(220,38,38,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-red-400">🃏 Poker vs Haus</h3>
              <button onClick={() => { setActiveMinigame(null); setPokerHand(null); setPokerResult(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {pokerMsg && <p className={`text-sm mb-2 font-bold ${pokerMsg.includes("Gewonnen") || pokerMsg.includes("+") ? "text-green-400" : pokerMsg.includes("verliert") || pokerMsg.includes("Haus") ? "text-red-400" : "text-yellow-400"}`}>{pokerMsg}</p>}

            {!pokerHand && !pokerResult ? (
              <div>
                <p className="text-gray-400 text-sm mb-3">5-Card Draw Poker gegen das Haus. Bis zu 3 Karten tauschen!</p>
                <div className="text-xs text-gray-600 mb-3 grid grid-cols-2 gap-1">
                  <span>Royal Flush: x101</span><span>Straight Flush: x51</span>
                  <span>Vierling: x26</span><span>Full House: x10</span>
                  <span>Flush: x7</span><span>Straße: x5</span>
                  <span>Drilling: x4</span><span>Zwei Paare: x3</span>
                  <span>Ein Paar: x2</span><span>Höchste Karte: Haus muss schlagen</span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-gray-500 text-sm">Einsatz:</span>
                  <input type="number" min={10} value={pokerBet} onChange={e => setPokerBet(Math.max(10, +e.target.value))} className="w-24 bg-black/40 border border-red-500/30 rounded-lg px-2 py-1 text-center text-white" />
                </div>
                <button onClick={async () => {
                  const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/poker/start`, { bet: pokerBet }) as any;
                  if (res.success) { setPokerHand(res.data.playerHand); setPokerSelected(new Set()); setPokerMsg(null); casinoSounds.reveal(); }
                  else setPokerMsg(res.error ?? "Fehler!");
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                  🃏 Austeilen ({formatNumber(pokerBet)} Pts)
                </button>
              </div>
            ) : pokerHand && !pokerResult ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">Klicke Karten zum Tauschen (max 3):</p>
                <div className="flex justify-center gap-2 mb-4">
                  {pokerHand.map((c: any, i: number) => (
                    <button key={i} onClick={() => {
                      const s = new Set(pokerSelected);
                      if (s.has(i)) s.delete(i); else if (s.size < 3) s.add(i);
                      setPokerSelected(s);
                    }} className={`w-14 h-20 rounded-lg flex flex-col items-center justify-center text-lg font-black transition-all ${pokerSelected.has(i) ? "ring-2 ring-yellow-400 scale-95 opacity-50" : ""}`}
                      style={{
                        background: (c.suit === "♥" || c.suit === "♦") ? "linear-gradient(180deg, #fff, #fee)" : "linear-gradient(180deg, #fff, #eef)",
                        color: (c.suit === "♥" || c.suit === "♦") ? "#dc2626" : "#1a1a1a",
                      }}>
                      <span className="text-sm">{c.rank}</span>
                      <span className="text-lg">{c.suit}</span>
                    </button>
                  ))}
                </div>
                {pokerSelected.size > 0 && <p className="text-xs text-yellow-400 mb-2">{pokerSelected.size} Karte(n) zum Tauschen markiert</p>}
                <button onClick={async () => {
                  casinoSounds.reveal();
                  const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/poker/draw`, { discardIndices: [...pokerSelected] }) as any;
                  if (res.success) {
                    setPokerResult(res.data);
                    setPokerHand(null);
                    if (res.data.playerWins) { setPokerMsg(`✅ Gewonnen! x${res.data.multiplier} → +${formatNumber(res.data.payout)} Pts!`); casinoSounds.bigWin(); }
                    else { setPokerMsg(`❌ Haus gewinnt!`); casinoSounds.loss(); }
                    fetchPoints();
                  } else setPokerMsg(res.error ?? "Fehler!");
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-black" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                  {pokerSelected.size > 0 ? `🔄 ${pokerSelected.size} Tauschen` : "✋ Behalten"}
                </button>
              </div>
            ) : pokerResult ? (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Deine Hand:</p>
                    <div className="flex justify-center gap-1">
                      {pokerResult.playerHand.map((c: any, i: number) => (
                        <div key={i} className="w-10 h-14 rounded flex flex-col items-center justify-center text-xs font-bold"
                          style={{ background: "#fff", color: (c.suit === "♥" || c.suit === "♦") ? "#dc2626" : "#1a1a1a" }}>
                          <span>{c.rank}</span><span>{c.suit}</span>
                        </div>
                      ))}
                    </div>
                    <p className={`text-sm font-bold mt-1 ${pokerResult.playerWins ? "text-green-400" : "text-gray-400"}`}>{pokerResult.playerRank}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Haus:</p>
                    <div className="flex justify-center gap-1">
                      {pokerResult.houseHand.map((c: any, i: number) => (
                        <div key={i} className="w-10 h-14 rounded flex flex-col items-center justify-center text-xs font-bold"
                          style={{ background: "#fff", color: (c.suit === "♥" || c.suit === "♦") ? "#dc2626" : "#1a1a1a" }}>
                          <span>{c.rank}</span><span>{c.suit}</span>
                        </div>
                      ))}
                    </div>
                    <p className={`text-sm font-bold mt-1 ${!pokerResult.playerWins ? "text-red-400" : "text-gray-400"}`}>{pokerResult.houseRank}</p>
                  </div>
                </div>
                <button onClick={() => { setPokerHand(null); setPokerResult(null); setPokerMsg(null); setPokerSelected(new Set()); }}
                  className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)" }}>
                  🔄 Nochmal
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Dice 21 Modal */}
      {activeMinigame === ("dice21" as any) && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #1a0f00, #000)", border: "2px solid rgba(251,146,60,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-orange-400">🎲 Würfel 21</h3>
              <button onClick={() => { setActiveMinigame(null); setD21(null); setD21Msg(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {d21Msg && <p className={`text-sm mb-2 font-bold ${d21Msg.includes("+") || d21Msg.includes("Gewonnen") ? "text-green-400" : d21Msg.includes("BUST") || d21Msg.includes("verloren") || d21Msg.includes("Haus") ? "text-red-400" : "text-yellow-400"}`}>{d21Msg}</p>}
            {!d21 || d21.finished ? (
              <div>
                <p className="text-gray-400 text-sm mb-3">Würfle gegen das Haus! Näher an 21 gewinnt.</p>
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  <p>Du würfelst → dann würfelt das Haus (stoppt bei 15+)</p>
                  <p>Gewinn: x2 · Genau 21: x3! · Gleichstand: Haus gewinnt</p>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-gray-500 text-sm">Einsatz:</span>
                  <input type="number" min={5} value={d21Bet} onChange={e => setD21Bet(Math.max(5, +e.target.value))} className="w-20 bg-black/40 border border-orange-500/30 rounded-lg px-2 py-1 text-center text-white" />
                </div>
                <button onClick={async () => {
                  const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/start`, { bet: d21Bet }) as any;
                  if (res.success) { setD21({ total: res.data.total, rolls: res.data.rolls, bet: d21Bet, finished: false }); setD21Msg(null); casinoSounds.coinFlip(); }
                  else setD21Msg(res.error ?? "Fehler!");
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
                  🎲 Würfeln! ({formatNumber(d21Bet)} Pts)
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">Deine Würfel:</p>
                <div className="flex justify-center gap-2 mb-2">
                  {d21.rolls.map((r, i) => (
                    <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.4)" }}>
                      {r}
                    </div>
                  ))}
                </div>
                <p className={`text-4xl font-black mb-3 ${d21.total > 18 ? "text-orange-400" : d21.total > 14 ? "text-yellow-400" : "text-white"}`}>{d21.total} <span className="text-lg text-gray-500">/ 21</span></p>
                <div className="flex justify-center gap-3">
                  <button onClick={async () => {
                    casinoSounds.coinFlip();
                    const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/hit`, {}) as any;
                    if (res.success) {
                      if (res.data.bust) {
                        setD21({ ...d21, total: res.data.total, rolls: res.data.rolls, finished: true });
                        setD21Msg(`💥 BUST! ${res.data.total} > 21 — Einsatz verloren!`);
                        casinoSounds.loss(); fetchPoints();
                      } else if (res.data.payout) {
                        setD21({ ...d21, total: 21, rolls: res.data.rolls, finished: true });
                        setD21Msg(`🎯 BLACKJACK! 21! x3 → +${formatNumber(res.data.payout)} Pts!`);
                        casinoSounds.jackpot(); fetchPoints();
                      } else {
                        setD21({ ...d21, total: res.data.total, rolls: res.data.rolls });
                      }
                    } else setD21Msg(res.error ?? "Fehler!");
                  }} className="casino-btn px-6 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
                    🎲 NOCH EINS
                  </button>
                  <button onClick={async () => {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/stand`, {}) as any;
                    if (res.success) {
                      setD21({ ...d21, finished: true });
                      const d = res.data;
                      if (d.playerWins) {
                        setD21Msg(`✅ Gewonnen! Du: ${d.playerTotal} vs Haus: ${d.houseTotal}${d.houseBust ? " (BUST)" : ""} → x${d.multiplier} → +${formatNumber(d.payout)} Pts!`);
                        casinoSounds.bigWin();
                      } else {
                        setD21Msg(`❌ Haus gewinnt! Du: ${d.playerTotal} vs Haus: ${d.houseTotal}${d.houseBust ? " (BUST)" : ""}`);
                        casinoSounds.loss();
                      }
                      fetchPoints();
                    } else setD21Msg(res.error ?? "Fehler!");
                  }} className="casino-btn px-6 py-3 rounded-xl font-black text-black" style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}>
                    ✋ STOPP (Haus würfelt)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Over/Under Modal */}
      {activeMinigame === ("overunder" as any) && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #001a1a, #000)", border: "2px solid rgba(34,211,238,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-cyan-400">🎯 Drüber / Drunter</h3>
              <button onClick={() => { setActiveMinigame(null); setOuResult(null); setOuMsg(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-gray-400 text-xs mb-3">2 Würfel (2-12) — ist die Summe über oder unter 7?</p>
            {ouMsg && <p className={`text-sm mb-2 font-bold ${ouMsg.includes("+") ? "text-green-400" : "text-red-400"}`}>{ouMsg}</p>}
            {ouResult && (
              <div className="mb-3">
                <div className="flex justify-center gap-3 mb-2">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: "rgba(34,211,238,0.2)", border: "1px solid rgba(34,211,238,0.4)" }}>{ouResult.dice[0]}</div>
                  <div className="text-2xl font-black text-gray-500 self-center">+</div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: "rgba(34,211,238,0.2)", border: "1px solid rgba(34,211,238,0.4)" }}>{ouResult.dice[1]}</div>
                  <div className="text-2xl font-black text-cyan-300 self-center">= {ouResult.total}</div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-gray-500 text-sm">Einsatz:</span>
              <input type="number" min={1} value={ouBet} onChange={e => setOuBet(Math.max(1, +e.target.value))} className="w-20 bg-black/40 border border-cyan-500/30 rounded-lg px-2 py-1 text-center text-white" />
            </div>
            <div className="flex justify-center gap-2">
              {([["under", "⬇️ DRUNTER", "x2"], ["seven", "7️⃣ GENAU 7", "x5"], ["over", "⬆️ DRÜBER", "x2"]] as const).map(([guess, label, mult]) => (
                <button key={guess} onClick={async () => {
                  casinoSounds.coinFlip();
                  const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/overunder`, { bet: ouBet, guess }) as any;
                  if (res.success) {
                    setOuResult(res.data);
                    if (res.data.win) { setOuMsg(`${res.data.guess} ✅ +${res.data.payout} Pts!`); casinoSounds.win(); }
                    else { setOuMsg(`${res.data.guess} ❌ -${ouBet} Pts`); casinoSounds.loss(); }
                    fetchPoints();
                  } else setOuMsg(res.error ?? "Fehler!");
                }} className="casino-btn px-4 py-3 rounded-xl font-bold text-sm text-black flex-1" style={{
                  background: guess === "seven" ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "linear-gradient(135deg, #22d3ee, #0891b2)",
                }}>
                  <div>{label}</div>
                  <div className="text-[10px] opacity-70">{mult}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Unter 7: x2 · Über 7: x2 · Genau 7: x5 · 7 bei Drüber/Drunter: verloren</p>
          </div>
        </div>
      )}

      {activeTab === "progress" && (<>
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
      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          DOUBLE OR NOTHING
         ══════════════════════════════════════════════════════════════════ */}
      {doubleActive && doubleAmount > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="double-glow rounded-2xl p-5 text-center max-w-lg w-full mx-4" style={{ background: "linear-gradient(180deg, rgba(20,10,0,0.95), rgba(10,5,0,0.98))", border: "2px solid rgba(255,215,0,0.4)" }}>
            <h3 className="text-2xl font-black text-yellow-400 mb-1">DOPPELT ODER NICHTS</h3>
            <p className="text-4xl font-black text-white mb-3">{formatNumber(doubleAmount)} PTS</p>
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

      {activeTab === "play" && (<>
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
      </>)}

      {activeTab === "pets" && (<>
      {/* ══════════════════════════════════════════════════════════════════
          PET BATTLES
         ══════════════════════════════════════════════════════════════════ */}
      {user && pet && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(251,146,60,0.08), rgba(220,38,38,0.05))",
            border: "1px solid rgba(251,146,60,0.3)",
          }}>
            <h3 className="font-black text-lg text-orange-400 mb-3">⚔️ PET BATTLE</h3>

            {!petBattle?.battle ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Fordere andere Spieler mit deinem Pet heraus!</p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <label className="text-xs text-gray-500">Einsatz:</label>
                  <input type="number" value={battleBet} onChange={e => setBattleBet(Math.max(10, Number(e.target.value)))}
                    className="bg-black/40 border border-orange-500/30 rounded-lg px-3 py-1.5 text-sm text-center w-24 text-white" min={10} />
                  <span className="text-xs text-gray-500">Pts</span>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/battle`, { bet: battleBet }) as any;
                    if (res.success) { fetchPetBattle(); fetchPoints(); }
                    else setMessage(res.error ?? "Fehler!");
                  } catch { setMessage("Fehler!"); }
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}>
                  ⚔️ HERAUSFORDERN
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-6 mb-3">
                  <div className="text-center">
                    <div className="text-3xl mb-1">⚔️</div>
                    <div className="text-sm font-bold text-orange-300">{petBattle.battle.challengerName}</div>
                    <div className="text-xs text-gray-500">Power: {petBattle.battle.challengerPetPower}</div>
                  </div>
                  <div className="text-yellow-400 font-black text-lg">{petBattle.battle.bet} Pts</div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">❓</div>
                    <div className="text-sm text-gray-500">Wartet...</div>
                  </div>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/battle/accept`, {}) as any;
                    if (res.success) {
                      fetchPetBattle(); fetchPoints();
                      if (res.data?.winner && confettiRef.current) spawnConfetti(confettiRef.current, 60);
                    } else setMessage(res.error ?? "Fehler!");
                  } catch { setMessage("Fehler!"); }
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                  ⚔️ ANNEHMEN
                </button>
              </div>
            )}

            {/* Battle History */}
            {petBattle?.history && petBattle.history.length > 0 && (
              <div className="mt-4 border-t border-orange-500/20 pt-3">
                <h4 className="text-xs font-bold text-gray-500 mb-2">LETZTE KÄMPFE</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {petBattle.history.slice(0, 5).map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-gray-300">{h.challengerName} vs {h.opponentName}</span>
                      <span className={`font-bold ${h.winnerName === user?.displayName ? "text-green-400" : "text-red-400"}`}>
                        {h.winnerName} +{h.bet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </>)}

      {activeTab === "progress" && (<>
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
      {user && (
        <div className="max-w-4xl mx-auto px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets?.bingo ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <h4 className="font-black text-blue-300 mb-1">🎱 Dein Bingo-Ticket</h4>
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
              <p className="text-xs text-gray-500 mt-1">Nächste Ziehung: 07:00 · !bingo (10 Pts)</p>
            </div>
          ) : (
            <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(59,130,246,0.05)", border: "1px dashed rgba(59,130,246,0.2)" }}>
              <h4 className="font-black text-blue-300/50 mb-1">🎱 Bingo</h4>
              <p className="text-xs text-gray-600">Kein Ticket · Schreibe !bingo im Chat (10 Pts)</p>
            </div>
          )}
          {tickets?.lotto ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <h4 className="font-black text-green-300 mb-1">🍀 Dein Lottoschein</h4>
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
              <p className="text-xs text-gray-500 mt-1">Nächste Ziehung: Sonntag 10:00 · !lotto (50 Pts)</p>
            </div>
          ) : (
            <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(34,197,94,0.05)", border: "1px dashed rgba(34,197,94,0.2)" }}>
              <h4 className="font-black text-green-300/50 mb-1">🍀 Lotto</h4>
              <p className="text-xs text-gray-600">Kein Schein · Schreibe !lotto im Chat (50 Pts)</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TOURNAMENT
         ══════════════════════════════════════════════════════════════════ */}
      {user && tournament && (
        <div className="max-w-2xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(99,102,241,0.08), rgba(59,130,246,0.05))",
            border: "1px solid rgba(99,102,241,0.3)",
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg text-indigo-300">🏟️ WOCHENTURNIER</h3>
              <span className="text-xs px-2 py-1 rounded-full font-bold" style={{
                background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8",
              }}>Woche {tournament.weekNumber}</span>
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-300">{tournament.daysLeft}</div>
                <div className="text-[10px] text-gray-500">Tage übrig</div>
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
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
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

      </>)}

      {activeTab === "social" && (<>
      {/* ══════════════════════════════════════════════════════════════════
          GUILDS
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-2xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(34,197,94,0.06), rgba(0,0,0,0.2))",
            border: "1px solid rgba(34,197,94,0.25)",
          }}>
            <h3 className="font-black text-lg text-green-400 mb-3">🏰 GILDEN</h3>

            {myGuild ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{myGuild.emoji}</span>
                  <div className="flex-1">
                    <div className="font-black text-white text-lg">{myGuild.name}</div>
                    <div className="text-xs text-gray-400">Anführer: {myGuild.leaderName} · {myGuild.members?.length || 0} Mitglieder · {formatNumber(myGuild.totalXp ?? 0)} XP</div>
                  </div>
                </div>
                {myGuild.members && myGuild.members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {myGuild.members.map((m: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                        {m.displayName || m}
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={async () => {
                  setGuildLoading(true);
                  try {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/guild/leave`, {}) as any;
                    if (res.success) fetchGuilds();
                    else setMessage(res.error ?? "Fehler!");
                  } catch { setMessage("Fehler!"); }
                  setGuildLoading(false);
                }} disabled={guildLoading} className="casino-btn px-4 py-2 rounded-lg text-xs font-bold" style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171",
                }}>
                  Gilde verlassen
                </button>
              </div>
            ) : (
              <div>
                {/* Guild List */}
                {guilds.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {guilds.map((g: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-2xl">{g.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white truncate">{g.name}</div>
                          <div className="text-[10px] text-gray-500">{g.members?.length || 0} Mitglieder · {formatNumber(g.totalXp ?? 0)} XP</div>
                        </div>
                        <button onClick={async () => {
                          setGuildLoading(true);
                          try {
                            const res = await api.post<any>(`/viewer/${channelName}/casino/guild/join`, { guildId: g.guildId }) as any;
                            if (res.success) fetchGuilds();
                            else setMessage(res.error ?? "Fehler!");
                          } catch { setMessage("Fehler!"); }
                          setGuildLoading(false);
                        }} disabled={guildLoading} className="casino-btn px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{
                          background: "linear-gradient(135deg, #4ade80, #22c55e)",
                        }}>
                          Beitreten
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create Guild */}
                <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <h4 className="text-xs font-bold text-green-400 mb-2">Neue Gilde gründen (1.000 Pts)</h4>
                  <div className="flex gap-2">
                    <input value={guildCreateEmoji} onChange={e => setGuildCreateEmoji(e.target.value)}
                      className="bg-black/40 border border-green-500/30 rounded-lg px-2 py-1.5 text-center w-12 text-lg" maxLength={2} />
                    <input value={guildCreateName} onChange={e => setGuildCreateName(e.target.value)} placeholder="Gildenname"
                      className="bg-black/40 border border-green-500/30 rounded-lg px-3 py-1.5 text-sm flex-1 text-white" maxLength={20} />
                    <button onClick={async () => {
                      if (!guildCreateName.trim()) return;
                      setGuildLoading(true);
                      try {
                        const res = await api.post<any>(`/viewer/${channelName}/casino/guild/create`, { name: guildCreateName.trim(), emoji: guildCreateEmoji }) as any;
                        if (res.success) { fetchGuilds(); fetchPoints(); setGuildCreateName(""); }
                        else setMessage(res.error ?? "Fehler!");
                      } catch { setMessage("Fehler!"); }
                      setGuildLoading(false);
                    }} disabled={guildLoading || !guildCreateName.trim()} className="casino-btn px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{
                      background: guildLoading ? "#666" : "linear-gradient(135deg, #4ade80, #22c55e)",
                    }}>
                      Gründen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </>)}

      {activeTab === "pets" && (<>
      {/* ══════════════════════════════════════════════════════════════════
          V-PET + SHOP + BREED + RENAME
         ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(255,182,193,0.06), rgba(0,0,0,0.2))", border: "1px solid rgba(255,182,193,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-pink-300">🐾 V-PET</h3>
              {pet && <span className="text-xs text-gray-500">LVL {pet.level} · {formatNumber(pet.totalSpent ?? 0)} Pts ausgegeben</span>}
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
                        <div className="text-[10px] text-yellow-400">{formatNumber(p.price)} Pts</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (() => {
                const PET_EMOJIS: Record<string,string> = {cat:"🐱",dog:"🐶",bunny:"🐰",fox:"🦊",panda:"🐼",dragon:"🐉",unicorn:"🦄",phoenix:"🔥",alien:"👾",robot:"🤖",kraken:"🦑",void:"🕳️"};
                const activePet = pet.pets?.find((p:any) => p.petId === pet.activePetId);
                return activePet ? (
              <div>
                {/* Active Pet Display */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative text-center">
                    {pet.equipped?.aura && <div className="absolute -inset-2 text-4xl opacity-30 animate-pulse flex items-center justify-center">{pet.equipped.aura}</div>}
                    <div className="text-6xl relative">
                      {pet.equipped?.hat && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">{pet.equipped.hat}</div>}
                      {pet.equipped?.glasses && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-lg">{pet.equipped.glasses}</div>}
                      {PET_EMOJIS[activePet.petId] ?? "🐱"}
                      {pet.equipped?.weapon && <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-2xl">{pet.equipped.weapon}</div>}
                      {pet.equipped?.cape && <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-xl">{pet.equipped.cape}</div>}
                    </div>
                    {pet.equipped?.food && <div className="text-lg mt-1">{pet.equipped.food}</div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-white text-lg flex items-center gap-2">
                      {renamingPet ? (
                        <div className="flex items-center gap-1">
                          <input value={petNewName} onChange={e => setPetNewName(e.target.value)}
                            className="bg-black/40 border border-pink-500/40 rounded px-2 py-0.5 text-sm text-white w-28" maxLength={16}
                            onKeyDown={async e => {
                              if (e.key === "Enter" && petNewName.trim()) {
                                const res = await api.post<any>(`/viewer/${channelName}/casino/pet/rename`, { name: petNewName.trim() }) as any;
                                if (res.success) { const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data); }
                                else setMessage(res.error ?? "Fehler!");
                                setRenamingPet(false);
                              }
                              if (e.key === "Escape") setRenamingPet(false);
                            }}
                            autoFocus />
                          <button onClick={async () => {
                            if (petNewName.trim()) {
                              const res = await api.post<any>(`/viewer/${channelName}/casino/pet/rename`, { name: petNewName.trim() }) as any;
                              if (res.success) { const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data); }
                              else setMessage(res.error ?? "Fehler!");
                            }
                            setRenamingPet(false);
                          }} className="text-green-400 text-xs hover:text-green-300">✓</button>
                          <button onClick={() => setRenamingPet(false)} className="text-red-400 text-xs hover:text-red-300">✕</button>
                        </div>
                      ) : (
                        <>
                          {activePet.petName}
                          <button onClick={() => { setPetNewName(activePet.petName); setRenamingPet(true); }}
                            className="text-pink-400 hover:text-pink-300 text-sm" title="Umbenennen">✏️</button>
                        </>
                      )}
                      <span className="text-xs text-pink-400 font-normal">(aktiv)</span>
                    </div>
                    <div className="text-xs text-gray-400">Level {activePet.level} · {activePet.xp}/{Math.floor(50 * Math.pow(1.5, activePet.level - 1))} XP</div>
                    <div className="h-2 rounded-full bg-black/40 mt-1 overflow-hidden" style={{ border: "1px solid rgba(255,182,193,0.2)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(activePet.xp / (Math.floor(50 * Math.pow(1.5, activePet.level - 1)))) * 100}%`, background: "linear-gradient(90deg, #f472b6, #ec4899)" }} />
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button onClick={() => { setShowShop(!showShop); if (!showShop && !shop) { api.get<any>(`/viewer/${channelName}/casino/pet/shop`).then((r: any) => { if (r.data) setShop(r.data); }); } }}
                        className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "linear-gradient(135deg, rgba(244,114,182,0.2), rgba(236,72,153,0.1))", border: "1px solid rgba(244,114,182,0.4)", color: "#f472b6" }}>
                        {showShop ? "Shop schließen" : "🛒 Shop"}
                      </button>
                      <button onClick={async () => {
                        const res = await api.post<any>(`/viewer/${channelName}/casino/pet/walk`, {}) as any;
                        if (res.success) {
                          casinoSounds.walk();
                          setPetWalkAnim(true); setTimeout(() => setPetWalkAnim(false), 3000);
                          const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                        } else setMessage(res.error ?? "Fehler!");
                      }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80" }}>
                        🐾 Gassi
                      </button>
                      <button onClick={async () => {
                        const res = await api.post<any>(`/viewer/${channelName}/casino/pet/feed`, {}) as any;
                        if (res.success) {
                          casinoSounds.feed();
                          setPetFeedAnim(true); setTimeout(() => setPetFeedAnim(false), 2000);
                          const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                        } else setMessage(res.error ?? "Fehler!");
                      }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.4)", color: "#fb923c" }}>
                        🍖 Füttern
                      </button>
                      {pet.careState?.needsPoop && (
                        <button onClick={async () => {
                          casinoSounds.poop();
                          setPetCleanAnim(true); setTimeout(() => setPetCleanAnim(false), 1500);
                          await api.post<any>(`/viewer/${channelName}/casino/pet/clean`, {});
                          const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                        }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold animate-bounce" style={{ background: "rgba(139,92,46,0.3)", border: "1px solid rgba(139,92,46,0.6)", color: "#d4a574" }}>
                          💩 Aufräumen!
                        </button>
                      )}
                    </div>
                    {/* Mood & Care bars */}
                    {pet.careState && (
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <div className="flex-1">
                          <div className="flex justify-between text-gray-500"><span>😊 Glück</span><span>{pet.careState.happiness}%</span></div>
                          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.happiness}%`, background: pet.careState.happiness > 50 ? "#4ade80" : pet.careState.happiness > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-gray-500"><span>🍖 Hunger</span><span>{pet.careState.hunger}%</span></div>
                          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.hunger}%`, background: pet.careState.hunger > 50 ? "#fb923c" : pet.careState.hunger > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-gray-500"><span>✨ Sauber</span><span>{pet.careState.cleanliness}%</span></div>
                          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.cleanliness}%`, background: pet.careState.cleanliness > 50 ? "#60a5fa" : pet.careState.cleanliness > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                        </div>
                        <div className="shrink-0 text-center">
                          <span className="text-gray-500">Stimmung</span>
                          <div className={`font-bold ${(pet.mood ?? 100) > 70 ? "text-green-400" : (pet.mood ?? 100) > 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {pet.mood ?? 100}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owned Pets Row (switch active + sell) */}
                {pet.pets.length > 1 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {pet.pets.map((p: any) => (
                      <div key={p.petId} className="relative">
                        <button onClick={async () => {
                          await api.post<any>(`/viewer/${channelName}/casino/pet/activate`, { petId: p.petId });
                          const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                        }} className={`rounded-lg px-3 py-2 text-center transition-all ${p.petId === pet.activePetId ? "ring-2 ring-pink-500 bg-pink-500/10" : "bg-white/3 hover:bg-white/5"}`}
                          style={{ border: `1px solid ${p.petId === pet.activePetId ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.08)"}` }}>
                          <div className="text-2xl">{PET_EMOJIS[p.petId] ?? "🐱"}</div>
                          <div className="text-[10px] text-gray-400">LVL {p.level}</div>
                        </button>
                        {p.petId !== pet.activePetId && pet.pets.length > 1 && (
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`${p.petName ?? p.petId} verkaufen?`)) return;
                            const res = await api.post<any>(`/viewer/${channelName}/casino/pet/sell`, { petId: p.petId }) as any;
                            if (res.success) {
                              setMessage(`Verkauft! +${res.data.points} Pts`);
                              const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                              fetchPoints();
                            } else setMessage(res.error ?? "Fehler!");
                          }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center hover:bg-red-500" title="Verkaufen">
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pet Breeding */}
                {pet.pets.length >= 2 && (
                  <div className="border-t border-pink-500/20 pt-4 mb-4">
                    <h4 className="font-bold text-sm text-pink-300 mb-2">💕 PET ZUCHT</h4>
                    <div className="rounded-xl p-3" style={{ background: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.15)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <select value={breedPet1} onChange={e => setBreedPet1(e.target.value)}
                          className="bg-black/40 border border-pink-500/30 rounded-lg px-2 py-1.5 text-xs text-white flex-1">
                          <option value="">Pet 1 wählen...</option>
                          {pet.pets.map((p: any) => (
                            <option key={p.petId} value={p.petId}>{PET_EMOJIS[p.petId] ?? "🐱"} {p.petName} (LVL {p.level})</option>
                          ))}
                        </select>
                        <span className="text-pink-400 text-lg">💕</span>
                        <select value={breedPet2} onChange={e => setBreedPet2(e.target.value)}
                          className="bg-black/40 border border-pink-500/30 rounded-lg px-2 py-1.5 text-xs text-white flex-1">
                          <option value="">Pet 2 wählen...</option>
                          {pet.pets.filter((p: any) => p.petId !== breedPet1).map((p: any) => (
                            <option key={p.petId} value={p.petId}>{PET_EMOJIS[p.petId] ?? "🐱"} {p.petName} (LVL {p.level})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {breedData ? (
                            <>
                              <span>Kosten: <span className="text-yellow-400 font-bold">{formatNumber(breedData.nextCost)} Pts</span></span>
                              <span className="ml-3">Züchtungen: {breedData.breedCount}</span>
                              {breedData.cooldownLeft > 0 && <span className="ml-3 text-red-400">Cooldown: {Math.ceil(breedData.cooldownLeft / 60)}m</span>}
                            </>
                          ) : <span>Laden...</span>}
                        </div>
                        <button onClick={async () => {
                          if (!breedPet1 || !breedPet2 || breeding) return;
                          setBreeding(true);
                          try {
                            const res = await api.post<any>(`/viewer/${channelName}/casino/breed`, { pet1Id: breedPet1, pet2Id: breedPet2 }) as any;
                            if (res.success) {
                              if (confettiRef.current) spawnConfetti(confettiRef.current, 60);
                              const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                              fetchBreedData(); fetchPoints();
                              setBreedPet1(""); setBreedPet2("");
                            } else setMessage(res.error ?? "Fehler!");
                          } catch { setMessage("Fehler!"); }
                          setBreeding(false);
                        }} disabled={!breedPet1 || !breedPet2 || breeding || (breedData?.cooldownLeft ?? 0) > 0}
                          className="casino-btn px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{
                            background: breeding || !breedPet1 || !breedPet2 ? "#666" : "linear-gradient(135deg, #f472b6, #ec4899)",
                          }}>
                          {breeding ? "..." : "💕 Züchten"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Item Shop */}
                {showShop && shop && (
                  <div className="border-t border-pink-500/20 pt-4 space-y-4">
                    {/* Buy More Pets */}
                    {shop.pets.some((p: any) => !p.owned) && (
                      <div>
                        <h4 className="font-bold text-sm text-pink-300 mb-2">🐾 Weitere Pets kaufen</h4>
                        <div className="flex flex-wrap gap-2">
                          {shop.pets.filter((p: any) => !p.owned).map((p: any) => (
                            <button key={p.id} onClick={async () => {
                              setBuyingPet(true);
                              const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy`, { petId: p.id }) as any;
                              if (res.success) {
                                const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                fetchPoints();
                              } else setMessage(res.error ?? "Fehler!");
                              setBuyingPet(false);
                            }} disabled={buyingPet} className="rounded-lg p-2 text-center hover:scale-105 transition-transform" style={{
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", minWidth: "75px",
                            }}>
                              <div className="text-2xl">{p.emoji}</div>
                              <div className="text-[10px] text-gray-300">{p.name}</div>
                              <div className="text-[9px] text-yellow-400">{formatNumber(p.price)}</div>
                              <div className="text-[8px] text-purple-400">{p.bonusDesc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Owned Pets */}
                    {shop.pets.some((p: any) => p.owned) && (
                      <div>
                        <h4 className="font-bold text-sm text-pink-300 mb-2">✅ Deine Pets</h4>
                        <div className="flex flex-wrap gap-2">
                          {shop.pets.filter((p: any) => p.owned).map((p: any) => (
                            <div key={p.id} className={`rounded-lg p-2 text-center ${p.active ? "ring-2 ring-pink-500" : ""}`} style={{
                              background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", minWidth: "75px",
                            }}>
                              <div className="text-2xl">{p.emoji}</div>
                              <div className="text-[10px] text-white">{p.name}</div>
                              <div className="text-[9px] text-purple-400">LVL {p.level}</div>
                              {p.active ? <div className="text-[8px] text-green-400">Aktiv</div> : (
                                <div className="flex gap-1">
                                  <button onClick={async () => {
                                    await api.post<any>(`/viewer/${channelName}/casino/pet/activate`, { petId: p.id });
                                    const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                    const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                  }} className="text-[8px] text-pink-300 hover:text-pink-200">Aktivieren</button>
                                  <button onClick={async () => {
                                    if (!confirm(`${p.name} verkaufen?`)) return;
                                    const res = await api.post<any>(`/viewer/${channelName}/casino/pet/sell`, { petId: p.id }) as any;
                                    if (res.success) {
                                      setMessage(`${p.name} verkauft! +${res.data.points} Pts`);
                                      const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                      const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                      fetchPoints();
                                    } else setMessage(res.error ?? "Fehler!");
                                  }} className="text-[8px] text-red-400 hover:text-red-300">Verkaufen</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Item Categories */}
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
                              <div className="text-[9px] text-purple-400">{item.bonusDesc}: +{item.scaledBonus}</div>
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
                                  {formatNumber(item.price)} Pts
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
            ) : null;
              })()}
          </div>
        </div>
      )}

      </>)}

      {activeTab === "progress" && (<>
      {/* ══════════════════════════════════════════════════════════════════
          SKILL TREE
         ══════════════════════════════════════════════════════════════════ */}
      {user && skillData && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.05), rgba(0,0,0,0.2))", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-purple-300">🌳 SKILL TREE</h3>
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
                    {upgrading === skill.id ? "..." : `⬆ ${formatNumber(skill.nextCost)} Pts`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PLAYER STATS (collapsible)
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
                  <div className="text-xl font-black text-white">{formatNumber(s.totalPlays)}</div>
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
                  <div className="text-xl font-black text-green-400">+{formatNumber(s.totalPointsWon)}</div>
                  <div className="text-[10px] text-gray-500">Gewonnen</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-red-400">-{formatNumber(s.totalPointsLost)}</div>
                  <div className="text-[10px] text-gray-500">Verloren</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-red-500">{s.bossesKilled}</div>
                  <div className="text-[10px] text-gray-500">Boss Kills</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xl font-black text-yellow-300">{formatNumber(s.maxDoubleAmount)}</div>
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

      </>)}

      {activeTab === "social" && (<>
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
            {(!heist || (!heist.active && heist.phase !== "finished")) && (
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
                  {heist.players?.map((p: any, i: number) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-full border ${p.userId === user?.twitchId ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
                      {p.displayName} {p.userId === user?.twitchId ? "(Du)" : ""}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">{heist.players?.length ?? 0}/5 Spieler · Pot: {heist.pot} Pts</p>
                {heist.countdown !== undefined && heist.countdown > 0 && <p className="text-sm text-yellow-400 mb-3">Startet in ~{Math.ceil(heist.countdown / 10) * 10}s...</p>}
                {!heist.players?.some((p: any) => p.userId === user?.twitchId) ? (
                  <button onClick={joinHeist} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                    style={{ background: "linear-gradient(135deg, #b91c1c, #7f1d1d)" }}>
                    🏴‍☠️ BEITRETEN (25 Pts)
                  </button>
                ) : (
                  <p className="text-sm text-green-400 font-bold">✅ Du bist dabei! Warte auf andere Spieler...</p>
                )}
              </div>
            )}

            {/* Playing phase */}
            {heist?.active && heist.phase === "playing" && (
              <div>
                <p className="text-sm text-gray-400 mb-3 text-center">Pot: <span className="text-yellow-400 font-bold">{heist.pot} Pts</span></p>
                {/* Player round status */}
                <div className="space-y-2 mb-4">
                  {heist.players?.map((p: any, i: number) => {
                    const isMe = p.userId === user?.twitchId;
                    const done = (p.roundsPlayed ?? 0) >= 3;
                    return (
                      <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isMe ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-white/3"}`}>
                        <span className={`font-bold text-sm ${isMe ? "text-yellow-300" : "text-white"}`}>{p.displayName}{isMe ? " (Du)" : ""}</span>
                        <div className="flex gap-1 flex-1">
                          {[0, 1, 2].map(r => {
                            const result = p.roundResults?.[r];
                            return (
                              <div key={r} className={`flex-1 h-6 rounded flex items-center justify-center text-xs font-bold ${result ? (result.payout > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400") : "bg-white/5 text-gray-600"}`}>
                                {result ? `${result.payout}` : `R${r + 1}`}
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-xs text-gray-500">{p.roundsPlayed ?? 0}/3</span>
                        {done && <span className="text-green-400 text-xs">✅</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Play buttons (only if my rounds not done) */}
                {(heist.round ?? 0) < 3 ? (
                  <div className="flex justify-center gap-2">
                    <button onClick={() => playHeistRound("slots")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>🎰 Slots</button>
                    <button onClick={() => playHeistRound("flip")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>🪙 Flip</button>
                    <button onClick={() => playHeistRound("scratch")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #00cc88, #009966)", color: "#000" }}>🎟️ Scratch</button>
                  </div>
                ) : (
                  <p className="text-center text-sm text-green-400 font-bold">✅ Deine Runden fertig! Warte auf andere...</p>
                )}
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
            {heist && heist.phase === "finished" && (
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

      </>)}

      {activeTab === "play" && (<>
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
                    <span className={`flex-1 truncate ${i < 3 ? "font-bold text-yellow-300" : "text-white"}`}>
                      {entry.displayName}
                      {(entry as any).prestige > 0 && <span className="ml-1 text-[10px] text-purple-400">P{(entry as any).prestige}</span>}
                    </span>
                    <span className="font-bold text-yellow-400">{formatNumber(entry.points)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

      </>)}

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════════════════════════════ */}
      <div className="text-center pb-6 space-y-2">
        <a href="/casino-guide.html" className="inline-block px-6 py-2 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, rgba(145,71,255,0.2), rgba(100,65,165,0.1))", border: "1px solid rgba(145,71,255,0.4)", color: "#c084fc" }}>
          📖 Casino Guide — Alle Features erklärt
        </a>
        <div className="text-xs text-gray-700">
          Kein echtes Geld · Verantwortungsvolles Fake-Gambling™
        </div>
      </div>
    </div>
  );
}
