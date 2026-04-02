import { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/lib/format-number";
import { casinoSounds } from "@/lib/casino-sounds";

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🔔"];

/** Animated slot reel — vertical scroll with staggered stop */
function SlotReel({ finalSymbol, spinning, stopDelay, onStopped }: {
  finalSymbol: string; spinning: boolean; stopDelay: number;
  onStopped?: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "stopping" | "done">("idle");
  const [symbols, setSymbols] = useState<string[]>([finalSymbol]);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<any>(null);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    if (spinning) {
      setPhase("spinning");
      // Generate random symbols for the reel strip
      const strip = Array.from({ length: 8 }, () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!);
      setSymbols(strip);
      let pos = 0;
      intervalRef.current = setInterval(() => {
        pos = (pos + 1) % strip.length;
        setOffset(pos);
        setSymbols(prev => {
          const next = [...prev];
          next[pos % next.length] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!;
          return next;
        });
      }, 60);

      // Schedule stop
      const stopTimer = setTimeout(() => {
        clearInterval(intervalRef.current);
        setPhase("stopping");
        setSymbols([finalSymbol]);
        setOffset(0);
        casinoSounds.reelStop();
        setTimeout(() => {
          setPhase("done");
          onStopped?.();
        }, 300);
      }, stopDelay);

      return () => { clearInterval(intervalRef.current); clearTimeout(stopTimer); cancelAnimationFrame(frameRef.current); };
    } else {
      setPhase("idle");
      setSymbols([finalSymbol]);
      setOffset(0);
    }
  }, [spinning, stopDelay, finalSymbol]);

  return (
    <div className="w-20 h-20 rounded-xl overflow-hidden relative" style={{
      background: "linear-gradient(180deg,#1a1a1a,#0a0a0a)",
      border: "2px solid rgba(145,71,255,0.4)",
      boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
    }}>
      {phase === "spinning" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
          animation: "reel-spin 0.18s linear infinite",
        }}>
          {symbols.map((s, i) => (
            <div key={i} className="text-4xl leading-[80px] flex-shrink-0">{s}</div>
          ))}
        </div>
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-4xl ${phase === "stopping" ? "reel-bounce" : ""}`}>
          {symbols[0]}
        </div>
      )}
    </div>
  );
}

/** Row of 3 animated slot reels with win-line detection */
function SlotReelRow({ reels, spinning }: { reels: string[]; spinning: boolean }) {
  const [stoppedCount, setStoppedCount] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const isWinLine = allDone && reels[0] === reels[1] && reels[1] === reels[2] && reels[0] !== "❓";

  useEffect(() => {
    if (spinning) { setStoppedCount(0); setAllDone(false); }
  }, [spinning]);

  useEffect(() => {
    if (stoppedCount >= 3) {
      setAllDone(true);
      if (reels[0] === reels[1] && reels[1] === reels[2] && reels[0] !== "❓") {
        casinoSounds.winLine();
      }
    }
  }, [stoppedCount, reels]);

  return (
    <div className={`flex justify-center gap-2 mb-4 ${isWinLine ? "win-line-pulse rounded-xl p-1" : ""}`}>
      {reels.map((sym, i) => (
        <SlotReel
          key={i}
          finalSymbol={sym}
          spinning={spinning}
          stopDelay={800 + i * 300}
          onStopped={() => setStoppedCount(c => c + 1)}
        />
      ))}
    </div>
  );
}

interface PlayTabProps {
  user: any;
  points: number | null;
  freePlays: { flip: number; slots: number; scratch: number } | null;
  slotReels: string[];
  slotSpinning: boolean;
  slotResult: { text: string; win: boolean } | null;
  scratchCards: string[];
  scratchResult: { text: string; win: boolean } | null;
  coinSide: string | null;
  coinFlipping: boolean;
  flipResult: { text: string; win: boolean } | null;
  cursedCoin: boolean;
  pet: any;
  // All-In
  allInPlaying: boolean;
  allInResult: { text: string; win: boolean } | null;
  allInShake: boolean;
  // Tier Slots
  tierSlots: { tiers: any[]; totalInvested: number } | null;
  tierReels: Record<string, string[]>;
  tierSpinning: string | null;
  tierResult: Record<string, { text: string; win: boolean }>;
  // Glucksrad
  wheelSpinning: boolean;
  wheelResult: string | null;
  wheelUsed: boolean;
  // Boss
  boss: { active: boolean; name?: string; hp?: number; maxHp?: number; participants?: number } | null;
  // Feed & Leaderboard
  feed: any[];
  leaderboard: { displayName: string; points: number }[];
  // Handlers
  playSlots: () => void;
  playScratch: () => void;
  playFlip: () => void;
  playAllIn: () => void;
  playDeadlyAllIn: () => void;
  playTierSlots: (tierId: string) => void;
  spinWheel: () => void;
  resultClass: (r: { win: boolean } | null) => string;
}

export function PlayTab(props: PlayTabProps) {
  const {
    user, points, freePlays, slotReels, slotSpinning, slotResult,
    scratchCards, scratchResult, coinSide, coinFlipping, flipResult, cursedCoin, pet,
    allInPlaying, allInResult, allInShake,
    tierSlots, tierReels, tierSpinning, tierResult,
    wheelSpinning, wheelResult, wheelUsed,
    boss, feed, leaderboard,
    playSlots, playScratch, playFlip, playAllIn, playDeadlyAllIn,
    playTierSlots, spinWheel, resultClass,
  } = props;

  return (
    <>
      {/* ── GAME MACHINES ── */}
      <div className="max-w-6xl mx-auto px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-0">
        {/* SLOT MACHINE */}
        <div className="slot-machine rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5,#9146ff)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-3 -right-3 text-3xl z-10" style={{ animation: "poop-wobble 1s ease-in-out infinite" }}>{"\uD83D\uDCA9"}</div>}
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#1a1a2e,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-purple-300 mb-1">{"\uD83C\uDFB0"} SLOTS</h2>
            <p className="text-center text-xs text-gray-500 mb-1">20 Punkte + Specials</p>
            {freePlays && <p className="text-center text-xs mb-4">{freePlays.slots > 0 ? <span className="text-green-400 font-bold">{freePlays.slots} Gratis-Spins</span> : <span className="text-gray-600">Gratis aufgebraucht</span>}</p>}
            <SlotReelRow reels={slotReels} spinning={slotSpinning} />
            {slotResult && <div className={`text-center mb-3 text-sm font-bold rounded-lg py-2 px-3 ${resultClass(slotResult)}`}>{slotResult.text}</div>}
            <button onClick={playSlots} disabled={slotSpinning || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{ background: slotSpinning ? "#666" : "linear-gradient(135deg,#9146ff,#6441a5)" }}>
              {slotSpinning ? "SPINNING..." : "\uD83C\uDFB0 SPIN!"}
            </button>
          </div>
        </div>

        {/* RUBBELLOS */}
        <div className="rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#00cc88,#009966,#00cc88)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-2 left-1/2 text-2xl z-10" style={{ animation: "poop-wobble 1.2s ease-in-out infinite" }}>{"\uD83D\uDCA9"}</div>}
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#0a1a15,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-emerald-300 mb-1">{"\uD83C\uDF9F️"} RUBBELLOS</h2>
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
              {"\uD83C\uDF9F️"} KRATZEN!
            </button>
          </div>
        </div>

        {/* MUNZWURF */}
        <div className="rounded-3xl p-1 relative" style={{ background: "linear-gradient(135deg,#ffd700,#ff8c00,#ffd700)" }}>
          {pet?.careState?.needsPoop && <div className="absolute -top-3 -left-2 text-2xl z-10" style={{ animation: "poop-wobble 0.8s ease-in-out infinite", animationDelay: "0.3s" }}>{"\uD83D\uDCA9"}</div>}
          <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#1a1508,#0d0d1a)" }}>
            <h2 className="text-center text-2xl font-black text-yellow-300 mb-1">{"\uD83E\uDE99"} MUNZWURF</h2>
            <p className="text-center text-xs text-gray-500 mb-1">1 Punkt · 50/50 + Specials</p>
            {freePlays && <p className="text-center text-xs mb-4">{freePlays.flip > 0 ? <span className="text-green-400 font-bold">{freePlays.flip} Gratis-Flips</span> : <span className="text-gray-600">Gratis aufgebraucht</span>}</p>}
            <div className="flex justify-center mb-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black ${coinFlipping ? "coin-anim" : "float-anim"}`} style={{
                background: coinSide ? "radial-gradient(circle,#ffd700,#b8860b)" : "radial-gradient(circle,#444,#222)",
                border: `4px solid ${cursedCoin ? "#ff4500" : "#ffd700"}`,
                boxShadow: cursedCoin ? "0 0 30px rgba(255,69,0,0.8), 0 0 60px rgba(255,0,0,0.4)" : coinSide ? "0 0 30px rgba(255,215,0,0.5)" : "0 0 10px rgba(255,215,0,0.2)",
                ...(cursedCoin ? { animation: "fire-flicker 0.5s ease-in-out infinite" } : {}),
              }}>{coinFlipping ? "\uD83E\uDE99" : coinSide === "Kopf" ? "\uD83D\uDC51" : coinSide === "Zahl" ? "\uD83D\uDD22" : "?"}</div>
            </div>
            {coinSide && !coinFlipping && <div className="text-center text-lg font-bold mb-1 text-yellow-300">{coinSide}!</div>}
            {flipResult && <div className={`text-center mb-3 text-sm font-bold rounded-lg py-2 px-3 ${resultClass(flipResult)}`}>{flipResult.text}</div>}
            <button onClick={playFlip} disabled={coinFlipping || !user} className="casino-btn w-full py-3 rounded-xl font-black text-lg text-black" style={{ background: coinFlipping ? "#666" : "linear-gradient(135deg,#ffd700,#ff8c00)" }}>
              {coinFlipping ? "FLIEGT..." : "\uD83E\uDE99 WERFEN!"}
            </button>
          </div>
        </div>
      </div>

      {/* ── ALL-IN ── */}
      {user && (
        <div className="max-w-lg mx-auto px-6 pb-6">
          <div className={`rounded-2xl p-6 text-center ${allInPlaying ? "" : "allin-btn-pulse"}`} style={{
            background: "linear-gradient(180deg, rgba(220,38,38,0.15), rgba(0,0,0,0.4))",
            border: "2px solid rgba(220,38,38,0.5)",
          }}>
            <h3 className="text-2xl font-black text-red-400 mb-1">{"\uD83D\uDC80"} ALL-IN {"\uD83D\uDC80"}</h3>
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
                {allInPlaying ? "..." : `\uD83D\uDC80 90% ALL-IN (${points ? formatNumber(Math.floor(points * 0.9)) : 0})`}
              </button>
              <button onClick={playDeadlyAllIn} disabled={allInPlaying || !points || points <= 0}
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

      {/* ── PREMIUM SLOTS (Tiered) ── */}
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
                        <div className="text-3xl mb-2">{"\uD83D\uDD12"}</div>
                        <p className="text-xs text-gray-400">Investiere {fmt(tier.requirement)}</p>
                        <p className="text-[10px] text-gray-600 mt-1">Aktuell: {fmt(tierSlots.totalInvested)}</p>
                      </div>
                    ) : (
                      <>
                        <SlotReelRow reels={reels} spinning={spinning} />
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

      {/* ── GLUCKSRAD ── */}
      {user && (
        <div className="max-w-md mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.08), rgba(0,0,0,0.3))", border: "1px solid rgba(34,211,238,0.3)" }}>
            <div className="text-5xl mb-2" style={wheelSpinning ? { animation: "wheel-spin 2s ease-out forwards" } : {}}>{"\uD83C\uDFA1"}</div>
            <h3 className="font-black text-lg text-cyan-300 mb-1">GLUCKSRAD</h3>
            <p className="text-xs text-gray-500 mb-3">Einmal am Tag gratis drehen · 1-100 Punkte</p>
            {wheelResult && (
              <div className={`text-lg font-bold mb-3 rounded-lg py-2 ${wheelResult.includes("+") ? "text-cyan-300 bg-cyan-500/10" : "text-gray-400"}`}>
                {wheelResult}
              </div>
            )}
            <button onClick={spinWheel} disabled={wheelSpinning || wheelUsed} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black" style={{ background: wheelSpinning || wheelUsed ? "#666" : "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
              {wheelSpinning ? "DREHT..." : wheelUsed ? "MORGEN WIEDER" : "\uD83C\uDFA1 DREHEN!"}
            </button>
          </div>
        </div>
      )}

      {/* ── BOSS FIGHT ── */}
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
            <p className="text-xs text-gray-400">{boss.participants} Kampfer · Jeder Gewinn schadet dem Boss!</p>
            <p className="text-xs text-yellow-400 mt-1">Boss besiegt = +50 Bonus fur alle Teilnehmer!</p>
          </div>
        </div>
      )}

      {/* ── LIVE FEED + LEADERBOARD ── */}
      <div className="max-w-6xl mx-auto px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-black text-lg text-yellow-400 mb-3">⚡ Live Aktivitat</h3>
          {feed.length === 0 ? (
            <p className="text-gray-600 text-sm">Noch keine Aktivitat...</p>
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
          <h3 className="font-black text-lg text-yellow-400 mb-3">{"\uD83C\uDFC6"} Top Spieler</h3>
          {leaderboard.length === 0 ? (
            <p className="text-gray-600 text-sm">Noch keine Spieler...</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => {
                const medal = i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `${i+1}.`;
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

      {/* ── SPECIALS LEGEND ── */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-black text-sm text-gray-500 mb-2">CASINO SPECIALS</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs text-gray-600">
            <span>3x Pech = +5 Mitleid</span>
            <span>{"\uD83D\uDD25"} 5x Flip-Pech = Verfluchte Munze</span>
            <span>{"\uD83D\uDC08\u200D\u2B1B"} 3% Schwarze Katze = Garantie-Win</span>
            <span>{"\uD83C\uDFA1"} x2-x5 Multiplikator bei 100+ Win</span>
            <span>{"\uD83D\uDEA8"} Jackpot-Sirene bei 777</span>
            <span>500+ Win = Geschenk an Chat</span>
            <span>{"\uD83D\uDCE6"} Mystery Box alle 20 Spins</span>
            <span>Boss Fights mit Community</span>
            <span>{"\uD83C\uDFA1"} Tagliches Gratis-Glucksrad</span>
          </div>
        </div>
      </div>
    </>
  );
}
