import { useRef, useEffect, useState } from "react";
import { formatNumber } from "@/lib/format-number";

interface CasinoHeaderProps {
  user: any;
  points: number | null;
  channelInput: string;
  setChannelInput: (v: string) => void;
  loginStreak: { streak: number; lastLogin: string; totalLogins: number; longestStreak: number } | null;
  streak: number;
  maxStreak: number;
  totalWon: number;
  totalLost: number;
  message: string | null;
}

/** Animated points display with count-up/down effect */
function AnimatedPoints({ value }: { value: number | null }) {
  const [displayed, setDisplayed] = useState(value ?? 0);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(value ?? 0);

  useEffect(() => {
    if (value === null) return;
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) { setDisplayed(value); return; }

    setFlash(value > prev ? "up" : "down");
    setTimeout(() => setFlash(null), 600);

    const diff = value - prev;
    const steps = Math.min(25, Math.abs(diff));
    const stepSize = diff / steps;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayed(value);
        clearInterval(iv);
      } else {
        setDisplayed(Math.round(prev + stepSize * step));
      }
    }, 25);
    return () => clearInterval(iv);
  }, [value]);

  return (
    <div className={`relative rounded-full px-6 py-2 font-black text-xl transition-all ${flash === "up" ? "scale-110" : flash === "down" ? "scale-95" : "scale-100"}`} style={{
      background: "linear-gradient(135deg,#ffd700,#ff8c00)",
      color: "#000",
      boxShadow: flash === "up"
        ? "0 0 20px rgba(74,222,128,0.6), 0 0 40px rgba(255,215,0,0.4)"
        : flash === "down"
        ? "0 0 20px rgba(239,68,68,0.5)"
        : "0 0 10px rgba(255,215,0,0.3)",
      transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
    }}>
      {value !== null ? `${formatNumber(displayed)} PTS` : "..."}
      {flash === "up" && (
        <span className="absolute -top-3 -right-2 text-green-400 text-sm font-black" style={{ animation: "special-float 1s ease-out forwards" }}>▲</span>
      )}
      {flash === "down" && (
        <span className="absolute -top-3 -right-2 text-red-400 text-sm font-black" style={{ animation: "special-float 1s ease-out forwards" }}>▼</span>
      )}
    </div>
  );
}

export function CasinoHeader(props: CasinoHeaderProps) {
  const { user, points, channelInput, setChannelInput, loginStreak, streak, maxStreak, totalWon, totalLost, message } = props;

  return (
    <>
      {/* ── MARQUEE ── */}
      <div className="bg-black/50 border-b border-yellow-500/20 py-1.5 overflow-hidden relative z-10">
        <div className="whitespace-nowrap text-sm" style={{ animation: "marquee-scroll 25s linear infinite" }}>
          <span className="text-yellow-400 mx-8">🎰 WILLKOMMEN IM CRISTREAM CASINO 🎰</span>
          <span className="text-green-400 mx-8">💰 DAS HAUS VERLIERT IMMER 💰</span>
          <span className="text-purple-400 mx-8">🃏 VERANTWORTUNGSVOLLES FAKE-GAMBLING™ 🃏</span>
          <span className="text-pink-400 mx-8">⚠️ KEINE ECHTEN VERLUSTE ⚠️</span>
          <span className="text-blue-400 mx-8">🔥 SPECIALS, BOSS FIGHTS & MYSTERY BOXEN 🔥</span>
          <span className="text-cyan-400 mx-8">💰 PROGRESSIVE JACKPOTS 💰</span>
          <span className="text-orange-400 mx-8">🔥 COMBO CHAINS 🔥</span>
          <span className="text-emerald-400 mx-8">🍀 LUCKY HOUR EVENTS 🍀</span>
        </div>
      </div>

      {/* ── HEADER + POINTS ── */}
      <div className="text-center pt-8 pb-2 relative z-10">
        <img src="/crisino-header.webp" alt="WILLKOMMEN IM CRISINO" className="mx-auto max-w-xl w-full px-4" style={{ filter: "drop-shadow(0 0 30px rgba(168,85,247,0.5))" }} />
        {!user ? (
          <a href="/api/auth/twitch/viewer?returnTo=/casino" className="inline-block mt-4 casino-btn rounded-full px-8 py-3 font-bold text-lg" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5)", boxShadow: "0 4px 15px rgba(145,71,255,0.4)" }}>
            🎮 Login mit Twitch
          </a>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-4">
              <span className="text-gray-400">{user.displayName}</span>
              <AnimatedPoints value={points} />
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
    </>
  );
}
