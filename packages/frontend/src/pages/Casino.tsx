import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

// Confetti particles
function spawnConfetti(container: HTMLDivElement) {
  const colors = ["#ffd700", "#ff6b6b", "#4ade80", "#60a5fa", "#f472b6", "#a78bfa"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;width:${4 + Math.random() * 8}px;height:${4 + Math.random() * 8}px;background:${colors[Math.floor(Math.random() * colors.length)]};left:${Math.random() * 100}%;top:-10px;border-radius:${Math.random() > 0.5 ? "50%" : "2px"};pointer-events:none;z-index:100;animation:confetti-fall ${1.5 + Math.random() * 2}s ease-out forwards;opacity:0.9;`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

export function CasinoPage() {
  const { user } = useAuthStore();
  const [channelInput, setChannelInput] = useState("");
  const confettiRef = useRef<HTMLDivElement>(null);

  // Slot state
  const [slotReels, setSlotReels] = useState(["❓", "❓", "❓"]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<string | null>(null);

  // Scratch state
  const [scratchCards, setScratchCards] = useState(["❓", "❓", "❓"]);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [scratchResult, setScratchResult] = useState<string | null>(null);

  // Flip state
  const [coinSide, setCoinSide] = useState<string | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<string | null>(null);

  // General
  const [message, setMessage] = useState<string | null>(null);
  const channelName = channelInput || "TheCrisio";

  const showWin = (big: boolean) => {
    if (big && confettiRef.current) spawnConfetti(confettiRef.current);
  };

  const playSlots = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setSlotSpinning(true);
    setSlotResult(null);

    // Spin animation
    const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
    const interval = setInterval(() => {
      setSlotReels([
        symbols[Math.floor(Math.random() * symbols.length)]!,
        symbols[Math.floor(Math.random() * symbols.length)]!,
        symbols[Math.floor(Math.random() * symbols.length)]!,
      ]);
    }, 80);

    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "slots" }) as any;
      setTimeout(() => {
        clearInterval(interval);
        if (!res.success) {
          setSlotReels(["❌", "❌", "❌"]);
          setSlotResult(res.error ?? "Fehler!");
          setSlotSpinning(false);
          return;
        }
        setSlotReels(res.data.reels);
        const profit = res.data.payout - res.data.cost;
        setSlotResult(`${res.data.label} → ${res.data.payout} Pts (${profit >= 0 ? "+" : ""}${profit})`);
        if (profit > 0) showWin(profit >= 100);
        setSlotSpinning(false);
      }, 1500);
    } catch {
      clearInterval(interval);
      setSlotResult("Fehler!");
      setSlotSpinning(false);
    }
  };

  const playScratch = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setScratchCards(["❓", "❓", "❓"]);
    setScratchRevealed(false);
    setScratchResult(null);

    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "scratch" }) as any;
      if (!res.success) { setScratchResult(res.error ?? "Fehler!"); return; }

      // Reveal one by one
      setTimeout(() => setScratchCards([res.data.symbols[0], "❓", "❓"]), 400);
      setTimeout(() => setScratchCards([res.data.symbols[0], res.data.symbols[1], "❓"]), 900);
      setTimeout(() => {
        setScratchCards(res.data.symbols);
        setScratchRevealed(true);
        const profit = res.data.payout - res.data.cost;
        setScratchResult(`${res.data.label} → ${res.data.payout} Pts (${profit >= 0 ? "+" : ""}${profit})`);
        if (profit > 0) showWin(profit >= 100);
      }, 1400);
    } catch { setScratchResult("Fehler!"); }
  };

  const playFlip = async () => {
    if (!user) { setMessage("Erst einloggen!"); return; }
    setCoinFlipping(true);
    setCoinSide(null);
    setFlipResult(null);

    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "flip" }) as any;
      setTimeout(() => {
        setCoinFlipping(false);
        if (!res.success) { setFlipResult(res.error ?? "Fehler!"); return; }
        setCoinSide(res.data.result);
        setFlipResult(res.data.win ? "GEWONNEN! +1" : "Verloren! -1");
        if (res.data.win) showWin(false);
      }, 1000);
    } catch {
      setCoinFlipping(false);
      setFlipResult("Fehler!");
    }
  };

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{
      background: "radial-gradient(ellipse at center top, #1a0533 0%, #0a0a1a 40%, #000 100%)",
    }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes neon-pulse { 0%,100% { text-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 40px #ff8c00, 0 0 80px #ff6600; } 50% { text-shadow: 0 0 5px #ffd700, 0 0 10px #ffd700, 0 0 20px #ff8c00, 0 0 40px #ff6600; } }
        @keyframes slot-glow { 0%,100% { box-shadow: 0 0 15px rgba(145,71,255,0.5), inset 0 0 15px rgba(145,71,255,0.1); } 50% { box-shadow: 0 0 30px rgba(145,71,255,0.8), inset 0 0 30px rgba(145,71,255,0.2); } }
        @keyframes coin-flip { 0% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(1800deg) scale(1.3); } 100% { transform: rotateY(3600deg) scale(1); } }
        @keyframes scratch-reveal { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes marquee-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes jackpot-flash { 0%,100% { color: #ffd700; } 25% { color: #ff6b6b; } 50% { color: #4ade80; } 75% { color: #60a5fa; } }
        .neon-text { animation: neon-pulse 2s ease-in-out infinite; }
        .slot-machine { animation: slot-glow 2s ease-in-out infinite; }
        .coin-anim { animation: coin-flip 1s ease-in-out; }
        .scratch-pop { animation: scratch-reveal 0.4s ease-out; }
        .float-anim { animation: float 3s ease-in-out infinite; }
        .casino-btn { transition: all 0.2s; cursor: pointer; }
        .casino-btn:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 8px 25px rgba(255,215,0,0.3); }
        .casino-btn:active { transform: scale(0.98); }
        .casino-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
      `}</style>

      {/* Confetti container */}
      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-50" />

      {/* Marquee */}
      <div className="bg-black/50 border-b border-yellow-500/20 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap text-sm" style={{ animation: "marquee-scroll 20s linear infinite" }}>
          <span className="text-yellow-400 mx-8">🎰 WILLKOMMEN IM CRISTREAM CASINO 🎰</span>
          <span className="text-green-400 mx-8">💰 ALLE SPIELE SIND NETTO POSITIV FÜR DICH 💰</span>
          <span className="text-purple-400 mx-8">🃏 VERANTWORTUNGSVOLLES FAKE-GAMBLING SEIT 2026 🃏</span>
          <span className="text-pink-400 mx-8">⚠️ KEINE ECHTEN VERLUSTE MÖGLICH ⚠️</span>
          <span className="text-blue-400 mx-8">🏆 DAS HAUS VERLIERT IMMER 🏆</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center pt-12 pb-4">
        <h1 className="text-6xl md:text-7xl font-black tracking-wider neon-text" style={{
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          color: "#ffd700",
          letterSpacing: "0.1em",
        }}>
          ★ CASINO ★
        </h1>
        <p className="text-xl text-yellow-300/60 mt-2 italic">"Das Haus verliert immer"</p>
        {!user && (
          <a href="/api/auth/twitch/viewer" className="inline-block mt-4 casino-btn rounded-full px-8 py-3 font-bold text-lg" style={{
            background: "linear-gradient(135deg, #9146ff, #6441a5)",
            boxShadow: "0 4px 15px rgba(145,71,255,0.4)",
          }}>
            🎮 Login mit Twitch zum Spielen
          </a>
        )}
        {user && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-gray-400">Spieler:</span>
            <span className="text-yellow-400 font-bold">{user.displayName}</span>
            <span className="text-gray-600">|</span>
            <input
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="Channel: TheCrisio"
              className="bg-black/40 border border-yellow-500/20 rounded-lg px-3 py-1 text-xs text-center w-40"
            />
          </div>
        )}
        {message && <p className="text-red-400 mt-2 text-sm">{message}</p>}
      </div>

      {/* Game Machines */}
      <div className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">

        {/* ═══ SLOT MACHINE ═══ */}
        <div className="slot-machine rounded-3xl p-1" style={{
          background: "linear-gradient(135deg, #9146ff, #6441a5, #9146ff)",
        }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)" }}>
            <h2 className="text-center text-2xl font-black text-purple-300 mb-4">🎰 SLOT MACHINE</h2>
            <p className="text-center text-xs text-gray-500 mb-4">25 Punkte pro Spin</p>

            {/* Reels */}
            <div className="flex justify-center gap-2 mb-4">
              {slotReels.map((sym, i) => (
                <div key={i} className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-bold" style={{
                  background: "linear-gradient(180deg, #1a1a1a, #0a0a0a)",
                  border: "2px solid rgba(145,71,255,0.4)",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
                  transition: "transform 0.1s",
                  transform: slotSpinning ? "scaleY(0.95)" : "scaleY(1)",
                }}>
                  {sym}
                </div>
              ))}
            </div>

            {/* Result */}
            {slotResult && (
              <div className={`text-center mb-4 text-sm font-bold rounded-lg py-2 px-3 ${slotResult.includes("+") ? "text-green-400 bg-green-500/10 border border-green-500/30" : slotResult.includes("-") ? "text-red-400 bg-red-500/10 border border-red-500/30" : "text-yellow-400"}`}>
                {slotResult}
              </div>
            )}

            <button onClick={playSlots} disabled={slotSpinning || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{
              background: slotSpinning ? "#666" : "linear-gradient(135deg, #ffd700, #ff8c00)",
            }}>
              {slotSpinning ? "SPINNING..." : "🎰 SPIN!"}
            </button>

            {/* Paytable mini */}
            <div className="mt-4 text-xs space-y-1">
              <div className="flex justify-between text-gray-500"><span>7️⃣7️⃣7️⃣</span><span className="text-yellow-400">777 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>💎💎💎</span><span className="text-purple-400">300 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>Triple</span><span>40-150 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>Doppelt</span><span>30 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>EV</span><span className="text-green-400 font-bold">+16%</span></div>
            </div>
          </div>
        </div>

        {/* ═══ RUBBELLOS ═══ */}
        <div className="rounded-3xl p-1" style={{
          background: "linear-gradient(135deg, #00cc88, #009966, #00cc88)",
        }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg, #0a1a15 0%, #0d0d1a 100%)" }}>
            <h2 className="text-center text-2xl font-black text-emerald-300 mb-4">🎟️ RUBBELLOS</h2>
            <p className="text-center text-xs text-gray-500 mb-4">50 Punkte pro Los</p>

            {/* Scratch cards */}
            <div className="flex justify-center gap-3 mb-4">
              {scratchCards.map((sym, i) => (
                <div key={i} className={`w-20 h-24 rounded-xl flex items-center justify-center text-3xl font-bold cursor-default ${sym !== "❓" ? "scratch-pop" : ""}`} style={{
                  background: sym === "❓"
                    ? "repeating-linear-gradient(45deg, #1a3a2a, #1a3a2a 10px, #1f4535 10px, #1f4535 20px)"
                    : "linear-gradient(180deg, #0a2a1a, #050f0a)",
                  border: `2px solid ${sym === "❓" ? "rgba(0,204,136,0.3)" : "rgba(0,204,136,0.6)"}`,
                  boxShadow: sym !== "❓" ? "0 0 20px rgba(0,204,136,0.3)" : "none",
                }}>
                  {sym}
                </div>
              ))}
            </div>

            {scratchResult && (
              <div className={`text-center mb-4 text-sm font-bold rounded-lg py-2 px-3 ${scratchResult.includes("+") ? "text-green-400 bg-green-500/10 border border-green-500/30" : scratchResult.includes("-") ? "text-red-400 bg-red-500/10 border border-red-500/30" : "text-yellow-400"}`}>
                {scratchResult}
              </div>
            )}

            <button onClick={playScratch} disabled={!user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{
              background: "linear-gradient(135deg, #00cc88, #009966)",
            }}>
              🎟️ KRATZEN!
            </button>

            <div className="mt-4 text-xs space-y-1">
              <div className="flex justify-between text-gray-500"><span>🌟🌟🌟</span><span className="text-yellow-400">1000 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>💎💎💎</span><span className="text-purple-400">500 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>Triple</span><span>75-250 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>Zweier</span><span>45 Pts</span></div>
              <div className="flex justify-between text-gray-500"><span>EV</span><span className="text-green-400 font-bold">+8%</span></div>
            </div>
          </div>
        </div>

        {/* ═══ MÜNZWURF ═══ */}
        <div className="rounded-3xl p-1" style={{
          background: "linear-gradient(135deg, #ffd700, #ff8c00, #ffd700)",
        }}>
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg, #1a1508 0%, #0d0d1a 100%)" }}>
            <h2 className="text-center text-2xl font-black text-yellow-300 mb-4">🪙 MÜNZWURF</h2>
            <p className="text-center text-xs text-gray-500 mb-4">1 Punkt pro Wurf</p>

            {/* Coin */}
            <div className="flex justify-center mb-4">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-black ${coinFlipping ? "coin-anim" : "float-anim"}`} style={{
                background: coinSide ? "radial-gradient(circle, #ffd700, #b8860b)" : "radial-gradient(circle, #444, #222)",
                border: "4px solid #ffd700",
                boxShadow: coinSide ? "0 0 30px rgba(255,215,0,0.5)" : "0 0 10px rgba(255,215,0,0.2)",
                perspective: "1000px",
              }}>
                {coinFlipping ? "🪙" : coinSide === "Kopf" ? "👑" : coinSide === "Zahl" ? "🔢" : "?"}
              </div>
            </div>

            {coinSide && !coinFlipping && (
              <div className="text-center text-lg font-bold mb-2 text-yellow-300">{coinSide}!</div>
            )}

            {flipResult && (
              <div className={`text-center mb-4 text-sm font-bold rounded-lg py-2 px-3 ${flipResult.includes("GEWONNEN") ? "text-green-400 bg-green-500/10 border border-green-500/30" : "text-red-400 bg-red-500/10 border border-red-500/30"}`}>
                {flipResult}
              </div>
            )}

            <button onClick={playFlip} disabled={coinFlipping || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{
              background: coinFlipping ? "#666" : "linear-gradient(135deg, #ffd700, #ff8c00)",
            }}>
              {coinFlipping ? "FLIEGT..." : "🪙 WERFEN!"}
            </button>

            <div className="mt-4 text-xs space-y-1">
              <div className="flex justify-between text-gray-500"><span>Gewonnen</span><span className="text-green-400">55%</span></div>
              <div className="flex justify-between text-gray-500"><span>Verloren</span><span className="text-red-400">45%</span></div>
              <div className="flex justify-between text-gray-500"><span>EV</span><span className="text-green-400 font-bold">+10%</span></div>
              <div className="flex justify-between text-gray-500"><span>Cooldown</span><span>keiner!</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bingo & Lotto */}
      <div className="max-w-4xl mx-auto px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-3xl mb-2">🎱</div>
          <h3 className="font-black text-lg text-blue-300">TÄGLICHES BINGO</h3>
          <p className="text-xs text-gray-500 mt-1">!bingo (10 Pts) · Ziehung 07:00</p>
          <p className="text-xs text-gray-500">5 aus 30 · 3 Treffer: 25 | 4: 100 | 5: 500 Pts</p>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-3xl mb-2">🍀</div>
          <h3 className="font-black text-lg text-green-300">WÖCHENTLICHES LOTTO</h3>
          <p className="text-xs text-gray-500 mt-1">!lotto (50 Pts) · Ziehung Sonntag 10:00</p>
          <p className="text-xs text-gray-500">6 aus 49 · 3R: 100 | 4R: 500 | 5R: 2500 | 6R: 10.000 Pts</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center pb-8">
        <p className="text-xs text-gray-700">
          ⚠️ Kein echtes Geld. Keine echten Verluste. Das Haus verliert statistisch immer. Verantwortungsvolles Fake-Gambling™ ⚠️
        </p>
        <p className="text-xs text-gray-800 mt-1">
          <a href="/status" className="hover:text-gray-600">CriStream</a> · <a href="https://ko-fi.com/thecrisio" className="hover:text-gray-600">Ko-fi</a>
        </p>
      </div>
    </div>
  );
}
