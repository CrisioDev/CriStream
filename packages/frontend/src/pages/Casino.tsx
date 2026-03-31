import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

interface CasinoSpecial {
  type: string;
  points?: number;
  message: string;
  animationData?: Record<string, any>;
}

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
        if (res.data.win) {
          const newAmount = doubleAmount * 2;
          setDoubleResult(`✅ VERDOPPELT! ${newAmount} Punkte!`);
          setDoubleAmount(newAmount);
          showWin(doubleAmount);
          if (confettiRef.current && newAmount >= 200) spawnConfetti(confettiRef.current, 40);
        } else {
          setDoubleResult(`❌ VERLOREN! ${doubleAmount} Punkte weg!`);
          showLoss(doubleAmount);
          setDoubleAmount(0); setDoubleActive(false);
        }
        fetchPoints();
      }, 800);
    } catch { setDoubleFlipping(false); setDoubleResult("Fehler!"); setDoubleActive(false); }
  };

  const cashOut = () => { setDoubleActive(false); setDoubleResult(`💰 Eingesackt: ${doubleAmount} Punkte!`); setDoubleAmount(0); fetchPoints(); };

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
        fetchPoints();
      }, 1000);
    } catch { setCoinFlipping(false); setFlipResult({ text: "Fehler!", win: false }); }
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
        setWheelResult(`🎡 +${res.data.points} Punkte!`);
        setWheelUsed(true);
        if (confettiRef.current && res.data.points >= 50) spawnConfetti(confettiRef.current, 60);
        fetchPoints();
      }, 2000);
    } catch { setWheelSpinning(false); setWheelResult("Fehler!"); }
  };

  const resultClass = (r: { win: boolean } | null) => !r ? "" : r.win
    ? "text-green-400 bg-green-500/10 border border-green-500/30"
    : "text-red-400 bg-red-500/10 border border-red-500/30";

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{
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

      {/* Active Special Overlay */}
      {activeSpecial && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-45">
          {activeSpecial.type === "mitleid" && (
            <div className="text-3xl font-black text-blue-400" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(96,165,250,0.8)" }}>
              😢 +5 Mitleids-Punkte!
            </div>
          )}
          {activeSpecial.type === "ragequit" && (
            <div className="px-8 py-4 rounded-2xl font-black text-2xl text-yellow-300" style={{ animation: "special-slide 3s ease-out forwards", background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,100,0,0.1))", border: "2px solid rgba(255,215,0,0.5)", textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
              🎁 WILLKOMMEN ZURUCK! +25
            </div>
          )}
          {activeSpecial.type === "beinahe_jackpot" && (
            <div className="text-4xl font-black text-orange-400" style={{ animation: "near-miss-shake 0.5s ease-in-out 3", textShadow: "0 0 20px rgba(251,146,60,0.8)" }}>
              😱 SO KNAPP!
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
              🌟 GOLDENER REGEN! 🌟
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
                🎁 GESCHENK AN CHAT! 🎁
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
              ⚔️ -{activeSpecial.animationData?.damage} HP!
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

      {/* Marquee */}
      <div className="bg-black/50 border-b border-yellow-500/20 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap text-sm" style={{ animation: "marquee-scroll 25s linear infinite" }}>
          <span className="text-yellow-400 mx-8">🎰 WILLKOMMEN IM CRISTREAM CASINO 🎰</span>
          <span className="text-green-400 mx-8">💰 DAS HAUS VERLIERT IMMER 💰</span>
          <span className="text-purple-400 mx-8">🃏 VERANTWORTUNGSVOLLES FAKE-GAMBLING™ 🃏</span>
          <span className="text-pink-400 mx-8">⚠️ KEINE ECHTEN VERLUSTE ⚠️</span>
          <span className="text-blue-400 mx-8">🔥 SPECIALS, BOSS FIGHTS & MYSTERY BOXEN 🔥</span>
        </div>
      </div>

      {/* Header + Points */}
      <div className="text-center pt-8 pb-2">
        <h1 className="text-6xl md:text-7xl font-black tracking-wider neon-text" style={{ fontFamily: "'Impact','Arial Black',sans-serif", color: "#ffd700", letterSpacing: "0.1em" }}>
          ★ CASINO ★
        </h1>
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

      {/* Double or Nothing */}
      {doubleActive && doubleAmount > 0 && (
        <div className="max-w-lg mx-auto px-6 py-4 mb-4">
          <div className="double-glow rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(255,215,0,0.1), rgba(255,100,0,0.05))", border: "2px solid rgba(255,215,0,0.4)" }}>
            <h3 className="text-2xl font-black text-yellow-400 mb-1">⚡ DOPPELT ODER NICHTS ⚡</h3>
            <p className="text-4xl font-black text-white mb-3">{doubleAmount.toLocaleString()} PTS</p>
            {doubleResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${doubleResult.includes("✅") ? "text-green-400 bg-green-500/10" : doubleResult.includes("❌") ? "text-red-400 bg-red-500/10" : "text-yellow-400"}`}>
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

      {/* Boss Fight */}
      {boss?.active && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.1), rgba(0,0,0,0.3))", border: "2px solid rgba(239,68,68,0.4)" }}>
            <h3 className="text-2xl font-black text-red-400 mb-2">⚔️ BOSS FIGHT ⚔️</h3>
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
            <p className="text-xs text-gray-400">👥 {boss.participants} Kämpfer · Jeder Gewinn schadet dem Boss!</p>
            <p className="text-xs text-yellow-400 mt-1">Boss besiegt = +50 Bonus für alle Teilnehmer!</p>
          </div>
        </div>
      )}

      {/* Game Machines */}
      <div className="max-w-6xl mx-auto px-6 pb-8 grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Glucksrad */}
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

      {/* Bingo & Lotto */}
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

      {/* Live Feed + Leaderboard */}
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

      {/* Specials Legend */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-black text-sm text-gray-500 mb-2">🎁 CASINO SPECIALS</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs text-gray-600">
            <span>😢 3x Pech → +5 Mitleid</span>
            <span>🔥 5x Flip-Pech → Verfluchte Münze</span>
            <span>🐈‍⬛ 3% Schwarze Katze → Garantie-Win</span>
            <span>🎡 x2-x5 Multiplikator bei 100+ Win</span>
            <span>🚨 Jackpot-Sirene bei 777</span>
            <span>🎁 500+ Win → Geschenk an Chat</span>
            <span>📦 Mystery Box alle 20 Spins</span>
            <span>⚔️ Boss Fights mit Community</span>
            <span>🎡 Tägliches Gratis-Glücksrad</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-xs text-gray-700">
        ⚠️ Kein echtes Geld · Alle Instant-Games netto positiv · Verantwortungsvolles Fake-Gambling™ ⚠️
      </div>
    </div>
  );
}
