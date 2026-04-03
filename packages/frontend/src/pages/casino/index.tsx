import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { casinoSounds } from "@/lib/casino-sounds";
import { casinoMusic } from "@/lib/casino-music";
import { formatNumber } from "@/lib/format-number";

import type { CasinoSpecial, Quest, Achievement, PlayerStats, SeasonData, HeistState, Progression } from "./types";
import { CasinoHeader } from "./CasinoHeader";
import { TabBar } from "./TabBar";
import { PlayTab } from "./PlayTab";
import { MinigamesTab } from "./MinigamesTab";
import { PetsTab } from "./PetsTab";
import { ProgressTab } from "./ProgressTab";
import { SocialTab } from "./SocialTab";
import { StoryTab } from "./StoryTab";
import { CasinoOverlays } from "./CasinoOverlays";
import { BonusSidebar } from "./BonusSidebar";
import { AutoFlipWidget } from "./AutoFlipWidget";
import { ParticleBackground } from "./ParticleBackground";
import { ToastSystem, useToasts } from "./ToastSystem";

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

const CSS_ANIMATIONS = `
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
@keyframes reel-spin { 0% { transform: translateY(0); } 100% { transform: translateY(-100%); } }
@keyframes reel-bounce { 0% { transform: translateY(10px); } 40% { transform: translateY(-6px); } 70% { transform: translateY(3px); } 100% { transform: translateY(0); } }
@keyframes win-line-pulse { 0%,100% { box-shadow: 0 0 10px rgba(255,215,0,0.4), inset 0 0 10px rgba(255,215,0,0.1); border-color: rgba(255,215,0,0.6); } 50% { box-shadow: 0 0 30px rgba(255,215,0,0.8), inset 0 0 20px rgba(255,215,0,0.2); border-color: rgba(255,215,0,1); } }
.reel-bounce { animation: reel-bounce 0.3s ease-out; }
.win-line-pulse { animation: win-line-pulse 0.6s ease-in-out infinite; border: 2px solid #ffd700 !important; }
@keyframes vn-typewriter-cursor { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
.vn-cursor { animation: vn-typewriter-cursor 0.8s step-end infinite; }
@keyframes run-stage-enter { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
.run-stage-enter { animation: run-stage-enter 0.4s ease-out; }
@keyframes challenge-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.challenge-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.1) 50%, transparent 100%); background-size: 200% 100%; animation: challenge-shimmer 3s ease-in-out infinite; }
@keyframes boss-hp-drain { 0% { filter: brightness(1.5); } 100% { filter: brightness(1); } }
.boss-hp-drain { animation: boss-hp-drain 0.5s ease-out; }
@keyframes combo-fire-glow { 0%,100% { box-shadow: 0 0 10px rgba(255,100,0,0.3), 0 0 20px rgba(255,0,0,0.15); } 50% { box-shadow: 0 0 20px rgba(255,100,0,0.6), 0 0 40px rgba(255,0,0,0.3), 0 0 60px rgba(255,50,0,0.15); } }
.combo-fire { animation: combo-fire-glow 0.8s ease-in-out infinite; }
@keyframes jackpot-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
@keyframes toast-slide-in { 0% { transform: translateX(120%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes points-count { 0% { transform: scale(1.15); } 100% { transform: scale(1); } }
.points-counting { animation: points-count 0.3s ease-out; }
`;

export function CasinoPage() {
  const { user } = useAuthStore();
  const [channelInput, setChannelInput] = useState("");
  const confettiRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"play"|"minigames"|"pets"|"progress"|"social"|"story">("play");
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
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem("casino-mute") === "1");
  useEffect(() => {
    const initAudio = () => { casinoSounds.init(); document.removeEventListener("click", initAudio); };
    document.addEventListener("click", initAudio);
    casinoSounds.setMute(soundMuted);
    return () => document.removeEventListener("click", initAudio);
  }, []);

  const handleSoundToggle = (muted: boolean) => {
    setSoundMuted(muted);
    casinoSounds.setMute(muted);
    localStorage.setItem("casino-mute", muted ? "1" : "0");
    if (!muted) casinoSounds.toggle();
  };

  const [points, setPoints] = useState<number | null>(null);

  // Animated points counter — smoothly count up/down
  useEffect(() => {
    if (points === null) return;
    const target = points;
    const current = displayPointsRef.current;
    if (current === target) { setDisplayPoints(target); return; }
    const diff = target - current;
    const steps = Math.min(20, Math.abs(diff));
    const stepSize = diff / steps;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step >= steps) {
        displayPointsRef.current = target;
        setDisplayPoints(target);
        clearInterval(iv);
      } else {
        const v = Math.round(current + stepSize * step);
        displayPointsRef.current = v;
        setDisplayPoints(v);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [points]);

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
  // Streak & Stats
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
  // Specials
  const [activeSpecial, setActiveSpecial] = useState<CasinoSpecial | null>(null);
  const specialsQueueRef = useRef<CasinoSpecial[]>([]);
  const [sirenActive, setSirenActive] = useState(false);
  const [cursedCoin, setCursedCoin] = useState(false);
  const [catWalk, setCatWalk] = useState(false);
  // Glucksrad
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [wheelUsed, setWheelUsed] = useState(false);
  // Boss
  const [boss, setBoss] = useState<{ active: boolean; name?: string; hp?: number; maxHp?: number; participants?: number } | null>(null);
  // Quests
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questBonusAnim, setQuestBonusAnim] = useState<string | null>(null);
  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<{ unlocked: number; total: number }>({ unlocked: 0, total: 0 });
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [newAchievementPopup, setNewAchievementPopup] = useState<{ name: string; reward: number } | null>(null);
  // Season
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<{ displayName: string; xp: number; level: number }[]>([]);
  const [showSeasonLb, setShowSeasonLb] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  // Auto-Flip
  const [autoFlip, setAutoFlip] = useState<{ active: boolean; prestige: number; interval: number; totalFlips: number; totalWon: number } | null>(null);
  const [autoFlipTick, setAutoFlipTick] = useState(0);
  // Skills
  const [skillData, setSkillData] = useState<{ skills: any; details: any[]; totalLevel: number; totalInvested: number } | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  // Pet
  const [pet, setPet] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [showShop, setShowShop] = useState(false);
  const [buyingPet, setBuyingPet] = useState(false);
  const [petWalkAnim, setPetWalkAnim] = useState(false);
  const [renamingPet, setRenamingPet] = useState(false);
  const [petNewName, setPetNewName] = useState("");
  // Tier Slots
  const [tierSlots, setTierSlots] = useState<{ tiers: any[]; totalInvested: number } | null>(null);
  const [tierReels, setTierReels] = useState<Record<string, string[]>>({});
  const [tierSpinning, setTierSpinning] = useState<string | null>(null);
  const [tierResult, setTierResult] = useState<Record<string, { text: string; win: boolean }>>({});
  // Lootbox
  const [lootboxDropAnim, setLootboxDropAnim] = useState<{ type: string; data: any } | null>(null);
  // Bonus Sidebar
  const [bonusSidebar, setBonusSidebar] = useState(false);
  const [bonusData, setBonusData] = useState<{ lines: any[]; totals: Record<string, { label: string; total: string }>; mood: number } | null>(null);
  const [petFeedAnim, setPetFeedAnim] = useState(false);
  const [petCleanAnim, setPetCleanAnim] = useState(false);
  // All-In
  const [allInPlaying, setAllInPlaying] = useState(false);
  const [allInResult, setAllInResult] = useState<{ text: string; win: boolean } | null>(null);
  const [allInShake, setAllInShake] = useState(false);
  // Heist
  const [heist, setHeist] = useState<HeistState | null>(null);
  const [heistMessage, setHeistMessage] = useState<string | null>(null);
  // Stats
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  // Login Streak
  const [loginStreak, setLoginStreak] = useState<{ streak: number; lastLogin: string; totalLogins: number; longestStreak: number } | null>(null);
  // Tournament
  const [tournament, setTournament] = useState<{ weekNumber: number; startDate: string; endDate: string; daysLeft: number } | null>(null);
  const [tournamentLb, setTournamentLb] = useState<{ displayName: string; score: number; rank: number }[]>([]);
  const [showTournamentLb, setShowTournamentLb] = useState(false);
  // Pet Battle
  const [petBattle, setPetBattle] = useState<{ battle: any | null; history: any[] } | null>(null);
  const [battleBet, setBattleBet] = useState(50);
  // Pet Breeding
  const [breedData, setBreedData] = useState<{ breedCount: number; nextCost: number; cooldownLeft: number } | null>(null);
  const [breedPet1, setBreedPet1] = useState<string>("");
  const [breedPet2, setBreedPet2] = useState<string>("");
  const [breeding, setBreeding] = useState(false);
  // Guilds
  const [guilds, setGuilds] = useState<any[]>([]);
  const [myGuild, setMyGuild] = useState<any | null>(null);
  const [guildCreateName, setGuildCreateName] = useState("");
  const [guildCreateEmoji, setGuildCreateEmoji] = useState("⚔️");
  const [guildLoading, setGuildLoading] = useState(false);
  // Daily Challenge + Casino Run + Guild War
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [weeklyRanking, setWeeklyRanking] = useState<any[]>([]);
  const [guildQuests, setGuildQuests] = useState<any[]>([]);
  const [guildBoss, setGuildBoss] = useState<any>(null);

  // GOTY: Jackpot, Combo, Lucky Hour
  const [jackpot, setJackpot] = useState<{ amount: number; lastWinner: any } | null>(null);
  const [combo, setCombo] = useState<{ chain: number; maxChain: number; multiplier: number } | null>(null);
  const [luckyHour, setLuckyHour] = useState<any>(null);
  const [ambientOn, setAmbientOn] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();

  // Animated points counter
  const [displayPoints, setDisplayPoints] = useState<number>(0);
  const displayPointsRef = useRef(0);

  // Adaptive music system toggle
  useEffect(() => {
    if (ambientOn && !soundMuted) {
      casinoMusic.start();
    } else {
      casinoMusic.stop();
    }
    return () => { casinoMusic.stop(); };
  }, [ambientOn, soundMuted]);

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

  // ── Fetches ──
  const fetchPoints = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/profile/${user.twitchId}`) as any;
      if (res.data) setPoints(res.data.points);
    } catch { /* */ }
  }, [user, channelName]);

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

  const fetchSeason = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/season`) as any;
      if (res.data) setSeason(res.data);
      const af = await api.get<any>(`/viewer/${channelName}/casino/autoflip`) as any;
      if (af.data) setAutoFlip(af.data);
      const sk = await api.get<any>(`/viewer/${channelName}/casino/skills`) as any;
      if (sk.data) setSkillData(sk.data);
      const pt = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any;
      setPet(pt.data);
    } catch { /* */ }
  }, [user, channelName]);

  const fetchTierSlots = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/tier-slots`) as any;
      if (res.data) setTierSlots(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  const fetchHeist = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/heist`) as any;
      const h = res.data;
      if (!h || !h.status) { setHeist(null); return; }
      setHeist(transformHeist(h));
    } catch { setHeist(null); }
  }, [user, channelName]);

  const fetchPetBattle = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/battle`) as any;
      if (res.data) setPetBattle(res.data);
    } catch { /* */ }
  }, [user, channelName]);

  const fetchBreedData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/breed`) as any;
      if (res.data) setBreedData(res.data);
    } catch { /* */ }
  }, [user, channelName]);

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

  const fetchSeasonLeaderboard = async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/season/leaderboard`) as any;
      if (res.data) setSeasonLeaderboard(res.data);
    } catch { /* */ }
  };

  const fetchTournamentLeaderboard = useCallback(async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/tournament/leaderboard`) as any;
      if (res.data) setTournamentLb(res.data);
    } catch { /* */ }
  }, [channelName]);

  // ── Process progression ──
  const processProgression = useCallback((progression: Progression | undefined) => {
    if (!progression) return;
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
    if (progression.newAchievements?.length) {
      for (let i = 0; i < progression.newAchievements.length; i++) {
        const ach = progression.newAchievements[i]!;
        setTimeout(() => {
          setNewAchievementPopup({ name: ach.name, reward: ach.reward });
          casinoSounds.achievement();
          if (confettiRef.current) spawnConfetti(confettiRef.current, 50, true);
          addToast({ type: "achievement", title: "Achievement!", message: `${ach.name} — +${ach.reward} Pts`, emoji: "🏆" });
          setTimeout(() => setNewAchievementPopup(null), 3000);
        }, i * 3500);
      }
      fetchAchievements();
    }
    if (progression.levelUp) {
      addToast({ type: "levelup", title: `Level ${progression.newLevel}!`, message: "Du bist aufgestiegen!", emoji: "⬆️", duration: 5000 });
    }
    if (progression.xpGained && season) {
      setSeason(prev => {
        if (!prev) return prev;
        const newXp = prev.progress.xp + progression.xpGained;
        const newLevel = progression.levelUp ? progression.newLevel : prev.progress.level;
        return { ...prev, progress: { ...prev.progress, xp: newXp, level: newLevel } };
      });
    }
    if (progression.stats) setPlayerStats(progression.stats);
    if ((progression as any).loginStreak) setLoginStreak((progression as any).loginStreak);
    if ((progression as any).lootboxDrop) {
      const drop = (progression as any).lootboxDrop;
      setLootboxDropAnim(drop);
      casinoSounds.jackpot();
      if (confettiRef.current) spawnConfetti(confettiRef.current, drop.type === "pet" ? 200 : 100, true);
      setTimeout(() => setLootboxDropAnim(null), 5000);
      fetchSeason();
    }
    // GOTY: Jackpot win
    if ((progression as any).jackpotWin?.won) {
      const jp = (progression as any).jackpotWin;
      addToast({ type: "jackpot", title: "JACKPOT!!!", message: `Du hast ${formatNumber(jp.amount)} Punkte gewonnen!`, emoji: "💰", duration: 8000 });
      casinoSounds.jackpot();
      if (confettiRef.current) spawnConfetti(confettiRef.current, 300, true);
      setJackpot(prev => prev ? { ...prev, amount: 100 } : prev);
    }
    // GOTY: Combo update
    if ((progression as any).combo) {
      const c = (progression as any).combo;
      setCombo(c);
      if (c.chain === 5) addToast({ type: "combo", title: "5er COMBO!", message: `+${Math.round((c.multiplier - 1) * 100)}% Bonus aktiv!`, emoji: "🔥" });
      if (c.chain === 10) addToast({ type: "combo", title: "10er COMBO!!", message: "Maximaler Bonus! Du bist on fire!", emoji: "🔥🔥", duration: 5000 });
    }
    // GOTY: Lucky Hour
    if ((progression as any).luckyHour?.active) {
      const lh = (progression as any).luckyHour;
      if (!luckyHour?.active) {
        addToast({ type: "luckyhour", title: lh.label, message: `Lucky Hour gestartet! ${Math.ceil((lh.endsAt - Date.now()) / 60000)} Minuten!`, emoji: lh.emoji, duration: 6000 });
      }
      setLuckyHour(lh);
    }
  }, [season]);

  // Helper to transform raw heist data
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

  // ── SSE ──
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
      if (data.dailyChallenge) setDailyChallenge(data.dailyChallenge);
      if (data.weeklyRanking) setWeeklyRanking(data.weeklyRanking);
      if (data.guildQuests) setGuildQuests(data.guildQuests);
      if (data.guildBoss !== undefined) setGuildBoss(data.guildBoss);
      if (data.jackpot) setJackpot(data.jackpot);
      if (data.combo) setCombo(data.combo);
      if (data.luckyHour) setLuckyHour(data.luckyHour);
      fetchTierSlots();
      // Welcome back toast
      if (data.loginStreak?.streak > 1) {
        setTimeout(() => addToast({
          type: "info", title: `Willkommen zurück!`,
          message: `${data.loginStreak.streak} Tage in Folge! 🔥`,
          emoji: "👋", duration: 4000,
        }), 1500);
      }
      if (data.jackpot?.amount > 1000) {
        setTimeout(() => addToast({
          type: "jackpot", title: "Jackpot wächst!",
          message: `${formatNumber(data.jackpot.amount)} Pts im Pot!`,
          emoji: "💰", duration: 5000,
        }), 3000);
      }
    });
    es.addEventListener("feed", (e) => setFeed(JSON.parse(e.data)));
    es.addEventListener("leaderboard", (e) => setLeaderboard(JSON.parse(e.data)));
    es.addEventListener("boss", (e) => setBoss(JSON.parse(e.data)));
    es.addEventListener("heist", (e) => { const h = JSON.parse(e.data); if (h) setHeist(transformHeist(h)); else setHeist(null); });
    es.addEventListener("points", (e) => { const d = JSON.parse(e.data); if (d.points > (points ?? 0)) casinoSounds.points(); setPoints(d.points); });
    es.addEventListener("season", (e) => setSeason(JSON.parse(e.data)));
    es.addEventListener("autoflip", (e) => { setAutoFlip(JSON.parse(e.data)); setAutoFlipTick(t => t + 1); });
    es.addEventListener("pet", (e) => setPet(JSON.parse(e.data)));
    es.addEventListener("battle", (e) => setPetBattle(JSON.parse(e.data)));
    es.addEventListener("tournament", (e) => setTournament(JSON.parse(e.data)));
    es.onerror = () => {};
    return () => es.close();
  }, [user, channelName]);

  // ── Win/Loss helpers (GOTY enhanced) ──
  const [screenFlash, setScreenFlash] = useState<"win" | "loss" | "mega" | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  const showWin = (profit: number) => {
    setStreak(s => { const n = s + 1; if (n > maxStreak) setMaxStreak(n); return n; });
    setTotalWon(t => t + profit);
    casinoMusic.onGameResult(true, profit);
    if (profit >= 100 && confettiRef.current) spawnConfetti(confettiRef.current, Math.min(profit, 200));
    if (profit >= 500) {
      showMultiplier("MEGA WIN!");
      setScreenFlash("mega"); setTimeout(() => setScreenFlash(null), 800);
      setScreenShake(true); setTimeout(() => setScreenShake(false), 500);
    } else if (profit >= 200) {
      showMultiplier("MEGA WIN!");
      setScreenFlash("win"); setTimeout(() => setScreenFlash(null), 600);
      setScreenShake(true); setTimeout(() => setScreenShake(false), 400);
    } else if (profit >= 50) {
      showMultiplier("BIG WIN!");
      setScreenFlash("win"); setTimeout(() => setScreenFlash(null), 400);
    } else if (profit >= 10) {
      showMultiplier("WIN!");
    }
  };
  const showLoss = (loss: number) => {
    setStreak(0); setTotalLost(t => t + loss);
    casinoMusic.onGameResult(false, 0);
    if (loss >= 100) {
      setScreenFlash("loss"); setTimeout(() => setScreenFlash(null), 300);
    }
  };
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
        if (!res.success) { setTierReels(prev => ({ ...prev, [tierId]: ["❌","❌","❌"] })); setTierResult(prev => ({ ...prev, [tierId]: { text: res.error, win: false } })); setTierSpinning(null); return; }
        setTierReels(prev => ({ ...prev, [tierId]: res.data.reels }));
        const profit = res.data.payout - res.data.cost;
        setTierResult(prev => ({ ...prev, [tierId]: { text: `${res.data.label} → ${formatNumber(res.data.payout)} Pts (${profit>=0?"+":""}${formatNumber(profit)})`, win: profit > 0 } }));
        if (profit > 0) { showWin(profit); startDouble(res.data.payout); if (profit >= 50) casinoSounds.bigWin(); else casinoSounds.win(); } else { showLoss(-profit); casinoSounds.loss(); }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        setTierSpinning(null); fetchPoints(); fetchTierSlots();
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

  const playAllIn = async () => {
    if (!user || allInPlaying || !points || points <= 0) return;
    setAllInPlaying(true); setAllInResult(null); setAllInShake(true);
    casinoSounds.allIn();
    casinoMusic.onAllInStart();
    const stopHeartbeat = casinoMusic.startHeartbeat();
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "allin" }) as any;
      setTimeout(() => {
        stopHeartbeat();
        setAllInShake(false); setAllInPlaying(false);
        if (!res.success) { setAllInResult({ text: res.error ?? "Fehler!", win: false }); casinoMusic.onAllInEnd(false); return; }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        if (res.data.win) {
          setAllInResult({ text: `ALL-IN GEWONNEN! +${res.data.payout} Punkte!`, win: true });
          showWin(res.data.payout);
          casinoSounds.jackpot();
          casinoMusic.onAllInEnd(true);
          if (confettiRef.current) spawnConfetti(confettiRef.current, 200, true);
          showMultiplier("ALL-IN WIN!");
        } else {
          setAllInResult({ text: `ALL-IN VERLOREN! ${res.data.amount} Punkte weg!`, win: false });
          showLoss(res.data.amount || 0);
          casinoSounds.loss();
          casinoMusic.onAllInEnd(false);
        }
        fetchPoints();
      }, 2500);
    } catch { setAllInPlaying(false); setAllInShake(false); setAllInResult({ text: "Fehler!", win: false }); stopHeartbeat(); casinoMusic.onAllInEnd(false); }
  };

  const playDeadlyAllIn = async () => {
    if (!user || allInPlaying || !points || points <= 0) return;
    setAllInPlaying(true); setAllInResult(null); setAllInShake(true);
    casinoMusic.onAllInStart();
    const stopHeartbeat = casinoMusic.startHeartbeat();
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "deadlyallin" }) as any;
      setTimeout(() => {
        stopHeartbeat();
        setAllInShake(false); setAllInPlaying(false);
        if (!res.success) { setAllInResult({ text: res.error ?? "Fehler!", win: false }); casinoMusic.onAllInEnd(false); return; }
        if (res.data.specials?.length) enqueueSpecials(res.data.specials);
        processProgression(res.data.progression);
        if (res.data.win) {
          setAllInResult({ text: `DEADLY WIN! x3! +${formatNumber(res.data.payout)}!`, win: true });
          showWin(res.data.payout);
          casinoMusic.onAllInEnd(true);
          if (confettiRef.current) spawnConfetti(confettiRef.current, 300, true);
          showMultiplier("DEADLY WIN x3!");
        } else {
          setAllInResult({ text: `☠️ ALLES WEG! ${formatNumber(res.data.amount)} Punkte verloren!`, win: false });
          showLoss(res.data.amount || 0);
          casinoMusic.onAllInEnd(false);
        }
        fetchPoints();
      }, 2500);
    } catch { setAllInPlaying(false); setAllInShake(false); stopHeartbeat(); casinoMusic.onAllInEnd(false); }
  };

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

  // ── Season actions ──
  const buyPremium = async () => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/season/premium`, {}) as any;
      if (res.success) { setSeason(prev => prev ? { ...prev, progress: { ...prev.progress, premium: true } } : prev); fetchPoints(); }
      else setMessage(res.error ?? "Fehler!");
    } catch { setMessage("Fehler!"); }
  };

  const claimLevel = async (level: number) => {
    if (!user || claimingLevel !== null) return;
    setClaimingLevel(level);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/season/claim`, { level }) as any;
      if (res.success) {
        setSeason(prev => { if (!prev) return prev; return { ...prev, progress: { ...prev.progress, claimedLevels: [...prev.progress.claimedLevels, level] } }; });
        fetchPoints();
        if (confettiRef.current) spawnConfetti(confettiRef.current, 30);
      }
    } catch { /* */ }
    setClaimingLevel(null);
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

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className={`min-h-screen text-white overflow-hidden relative ${allInShake || screenShake ? "allin-shake" : ""}`} style={{
      background: (() => {
        const hour = new Date().getHours();
        // Dynamic casino atmosphere based on time of day
        if (hour >= 6 && hour < 12) return "radial-gradient(ellipse at center top, #1a0533 0%, #0a0a1a 40%, #000 100%)"; // Morning: classic purple
        if (hour >= 12 && hour < 18) return "radial-gradient(ellipse at center top, #1a1033 0%, #0d0a1a 40%, #000 100%)"; // Afternoon: warm
        if (hour >= 18 && hour < 22) return "radial-gradient(ellipse at center top, #200a3a 0%, #0a0520 30%, #050208 100%)"; // Evening: deep purple
        return "radial-gradient(ellipse at center top, #0a0020 0%, #050010 30%, #000005 100%)"; // Night: ultra dark
      })(),
    }}>
      {/* Screen flash overlay */}
      {screenFlash && (
        <div className="fixed inset-0 pointer-events-none z-[80] transition-opacity" style={{
          background: screenFlash === "mega" ? "rgba(255,215,0,0.15)"
            : screenFlash === "win" ? "rgba(74,222,128,0.1)"
            : "rgba(239,68,68,0.08)",
          animation: "boss-hp-drain 0.5s ease-out forwards",
        }} />
      )}
      <style>{CSS_ANIMATIONS}</style>

      {/* GOTY: Particle Background */}
      <ParticleBackground />

      {/* GOTY: Toast Notification System */}
      <ToastSystem toasts={toasts} removeToast={removeToast} />

      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-[60]" />

      {/* Adaptive Music Toggle */}
      <button
        onClick={() => setAmbientOn(a => !a)}
        className={`fixed ${(autoFlip as any)?.active ? "bottom-40" : "bottom-16"} left-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110`}
        style={{
          background: ambientOn ? "rgba(168,85,247,0.3)" : "rgba(20,20,40,0.85)",
          border: `1px solid ${ambientOn ? "rgba(168,85,247,0.6)" : "rgba(100,100,100,0.4)"}`,
          color: ambientOn ? "#c084fc" : "#666",
          boxShadow: ambientOn ? "0 0 15px rgba(168,85,247,0.3)" : "none",
        }}
        title={ambientOn ? "Adaptive Musik aus" : "Adaptive Musik an"}
      >
        {ambientOn ? "🎵" : "🎶"}
      </button>

      <CasinoOverlays
        sirenActive={sirenActive} petWalkAnim={petWalkAnim} pet={pet}
        petFeedAnim={petFeedAnim} petCleanAnim={petCleanAnim}
        lootboxDropAnim={lootboxDropAnim} catWalk={catWalk}
        multiplierAnim={multiplierAnim} questBonusAnim={questBonusAnim}
        newAchievementPopup={newAchievementPopup} activeSpecial={activeSpecial}
      />

      <BonusSidebar
        user={user} channelName={channelName}
        bonusSidebar={bonusSidebar} setBonusSidebar={setBonusSidebar}
        bonusData={bonusData} setBonusData={setBonusData}
      />

      <AutoFlipWidget
        autoFlip={autoFlip} autoFlipTick={autoFlipTick}
        soundMuted={soundMuted} setSoundMuted={handleSoundToggle}
      />

      <CasinoHeader
        user={user} points={displayPoints} channelInput={channelInput} setChannelInput={setChannelInput}
        loginStreak={loginStreak} streak={streak} maxStreak={maxStreak}
        totalWon={totalWon} totalLost={totalLost} message={message}
      />

      {/* GOTY: Lucky Hour Banner */}
      {luckyHour?.active && (
        <div className="max-w-4xl mx-auto px-6 pb-2">
          <div className="rounded-xl px-4 py-2 text-center" style={{
            background: "linear-gradient(90deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15), rgba(34,211,238,0.15))",
            border: "1px solid rgba(34,211,238,0.4)",
            animation: "challenge-shimmer 2s ease-in-out infinite",
          }}>
            <span className="text-lg mr-2">{luckyHour.emoji}</span>
            <span className="font-black text-cyan-300">{luckyHour.label}</span>
            <span className="text-xs text-gray-400 ml-2">
              Endet in {Math.max(0, Math.ceil((luckyHour.endsAt - Date.now()) / 60000))}min
            </span>
          </div>
        </div>
      )}

      {/* GOTY: Jackpot Ticker + Combo Chain */}
      <div className="max-w-4xl mx-auto px-6 pb-2 flex items-center justify-center gap-4">
        {jackpot && (
          <div className="rounded-xl px-4 py-2 flex items-center gap-2" style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,100,0,0.05))",
            border: "1px solid rgba(255,215,0,0.3)",
          }}>
            <span className="text-lg">💰</span>
            <div>
              <div className="text-[10px] text-gray-500 leading-none">COMMUNITY JACKPOT</div>
              <div className="text-lg font-black text-yellow-300 leading-none">{formatNumber(jackpot.amount)} PTS</div>
            </div>
            {jackpot.lastWinner && (
              <div className="text-[10px] text-gray-500 ml-2">
                Letzter: {jackpot.lastWinner.displayName} ({formatNumber(jackpot.lastWinner.amount)})
              </div>
            )}
          </div>
        )}
        {combo && combo.chain > 0 && (
          <div className={`rounded-xl px-4 py-2 flex items-center gap-2 ${combo.chain >= 5 ? "combo-fire" : ""}`} style={{
            background: combo.chain >= 10 ? "linear-gradient(135deg, rgba(255,0,0,0.2), rgba(255,100,0,0.15))"
              : combo.chain >= 5 ? "linear-gradient(135deg, rgba(255,100,0,0.15), rgba(255,200,0,0.1))"
              : "linear-gradient(135deg, rgba(255,200,0,0.1), rgba(255,255,255,0.03))",
            border: `1px solid ${combo.chain >= 10 ? "rgba(255,0,0,0.5)" : combo.chain >= 5 ? "rgba(255,100,0,0.4)" : "rgba(255,200,0,0.3)"}`,
            animation: combo.chain >= 5 ? "streak-pulse 0.5s ease-in-out infinite" : undefined,
          }}>
            <span className="text-lg">{combo.chain >= 10 ? "🔥🔥" : combo.chain >= 5 ? "🔥" : "⚡"}</span>
            <div>
              <div className="text-[10px] text-gray-500 leading-none">COMBO</div>
              <div className="text-lg font-black leading-none" style={{ color: combo.chain >= 10 ? "#ff4444" : combo.chain >= 5 ? "#ff8c00" : "#fbbf24" }}>
                x{combo.chain}
              </div>
            </div>
            {combo.multiplier > 1 && (
              <span className="text-xs text-green-400 font-bold">+{Math.round((combo.multiplier - 1) * 100)}%</span>
            )}
          </div>
        )}
      </div>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "play" && (
        <PlayTab
          user={user} points={points} freePlays={freePlays}
          slotReels={slotReels} slotSpinning={slotSpinning} slotResult={slotResult}
          scratchCards={scratchCards} scratchResult={scratchResult}
          coinSide={coinSide} coinFlipping={coinFlipping} flipResult={flipResult}
          cursedCoin={cursedCoin} pet={pet}
          allInPlaying={allInPlaying} allInResult={allInResult} allInShake={allInShake}
          tierSlots={tierSlots} tierReels={tierReels} tierSpinning={tierSpinning} tierResult={tierResult}
          wheelSpinning={wheelSpinning} wheelResult={wheelResult} wheelUsed={wheelUsed}
          boss={boss} feed={feed} leaderboard={leaderboard}
          playSlots={playSlots} playScratch={playScratch} playFlip={playFlip}
          playAllIn={playAllIn} playDeadlyAllIn={playDeadlyAllIn}
          playTierSlots={playTierSlots} spinWheel={spinWheel} resultClass={resultClass}
        />
      )}

      {activeTab === "minigames" && (
        <MinigamesTab user={user} channelName={channelName} fetchPoints={fetchPoints} />
      )}

      {activeTab === "pets" && (
        <PetsTab
          user={user} channelName={channelName} pet={pet} setPet={setPet}
          shop={shop} setShop={setShop} showShop={showShop} setShowShop={setShowShop}
          buyingPet={buyingPet} setBuyingPet={setBuyingPet}
          renamingPet={renamingPet} setRenamingPet={setRenamingPet}
          petNewName={petNewName} setPetNewName={setPetNewName}
          breedData={breedData} breedPet1={breedPet1} setBreedPet1={setBreedPet1}
          breedPet2={breedPet2} setBreedPet2={setBreedPet2}
          breeding={breeding} setBreeding={setBreeding}
          petBattle={petBattle} battleBet={battleBet} setBattleBet={setBattleBet}
          message={message} setMessage={setMessage}
          fetchPoints={fetchPoints} fetchPetBattle={fetchPetBattle} fetchBreedData={fetchBreedData}
          setPetWalkAnim={setPetWalkAnim} setPetFeedAnim={setPetFeedAnim} setPetCleanAnim={setPetCleanAnim}
          confettiRef={confettiRef} spawnConfetti={spawnConfetti}
        />
      )}

      {activeTab === "progress" && (
        <ProgressTab
          user={user} channelName={channelName}
          quests={quests} achievements={achievements} achievementStats={achievementStats}
          openCategories={openCategories} toggleCategory={toggleCategory}
          season={season} seasonLeaderboard={seasonLeaderboard}
          showSeasonLb={showSeasonLb} setShowSeasonLb={setShowSeasonLb}
          claimingLevel={claimingLevel} autoFlip={autoFlip}
          setAutoFlip={setAutoFlip as any} skillData={skillData} setSkillData={setSkillData}
          upgrading={upgrading} setUpgrading={setUpgrading}
          playerStats={playerStats} statsOpen={statsOpen} setStatsOpen={setStatsOpen}
          tickets={tickets} tournament={tournament}
          tournamentLb={tournamentLb} showTournamentLb={showTournamentLb} setShowTournamentLb={setShowTournamentLb}
          setSeason={setSeason} setMessage={setMessage}
          fetchPoints={fetchPoints} fetchSeason={fetchSeason}
          fetchSeasonLeaderboard={fetchSeasonLeaderboard} fetchTournamentLeaderboard={fetchTournamentLeaderboard}
          claimLevel={claimLevel} buyPremium={buyPremium}
          confettiRef={confettiRef} spawnConfetti={spawnConfetti}
          dailyChallenge={dailyChallenge}
        />
      )}

      {activeTab === "social" && (
        <SocialTab
          user={user} channelName={channelName}
          guilds={guilds} myGuild={myGuild}
          guildCreateName={guildCreateName} setGuildCreateName={setGuildCreateName}
          guildCreateEmoji={guildCreateEmoji} setGuildCreateEmoji={setGuildCreateEmoji}
          guildLoading={guildLoading} setGuildLoading={setGuildLoading}
          heist={heist} heistMessage={heistMessage} setHeist={setHeist}
          weeklyRanking={weeklyRanking} guildQuests={guildQuests} guildBoss={guildBoss}
          setMessage={setMessage} fetchGuilds={fetchGuilds} fetchPoints={fetchPoints} fetchHeist={fetchHeist}
          createHeist={createHeist} joinHeist={joinHeist}
          playHeistRound={playHeistRound} heistBetray={heistBetray} heistFinish={heistFinish}
        />
      )}

      {/* ── Double or Nothing Overlay ── */}
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
                {doubleFlipping ? "..." : "\uD83C\uDFB2 DOPPELN!"}
              </button>
              <button onClick={cashOut} disabled={doubleFlipping} className="casino-btn rounded-xl px-8 py-3 font-black text-lg text-black" style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)" }}>
                {"\uD83D\uDCB0"} EINSACKEN
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">48% Chance zu verdoppeln · 52% alles weg</p>
          </div>
        </div>
      )}

      {activeTab === "story" && (
        <StoryTab user={user} channelName={channelName} />
      )}

      {/* ── Session Stats Bar ── */}
      {user && (totalWon > 0 || totalLost > 0) && (
        <div className="max-w-4xl mx-auto px-6 pb-4">
          <div className="rounded-2xl p-4" style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="text-center mb-2">
              <span className="text-xs text-gray-500">SESSION STATS</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-black text-green-400">+{formatNumber(totalWon)}</div>
                <div className="text-[10px] text-gray-600">Gewonnen</div>
              </div>
              <div>
                <div className="text-lg font-black text-red-400">-{formatNumber(totalLost)}</div>
                <div className="text-[10px] text-gray-600">Verloren</div>
              </div>
              <div>
                <div className={`text-lg font-black ${totalWon - totalLost >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalWon - totalLost >= 0 ? "+" : ""}{formatNumber(totalWon - totalLost)}
                </div>
                <div className="text-[10px] text-gray-600">Netto</div>
              </div>
              <div>
                <div className="text-lg font-black text-yellow-400">{maxStreak}</div>
                <div className="text-[10px] text-gray-600">Best Streak</div>
              </div>
            </div>
            {/* Mini profit chart */}
            <div className="mt-3 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div className="h-full bg-green-500/60 transition-all" style={{ width: `${totalWon + totalLost > 0 ? (totalWon / (totalWon + totalLost)) * 100 : 50}%` }} />
              <div className="h-full bg-red-500/60 transition-all flex-1" />
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>Win Rate: {totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0}%</span>
              <span>Loss Rate: {totalWon + totalLost > 0 ? Math.round((totalLost / (totalWon + totalLost)) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-center pb-6 space-y-2 relative z-10">
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
