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

export function CasinoHeader(props: CasinoHeaderProps) {
  const { user, points, channelInput, setChannelInput, loginStreak, streak, maxStreak, totalWon, totalLost, message } = props;

  return (
    <>
      {/* ── MARQUEE ── */}
      <div className="bg-black/50 border-b border-yellow-500/20 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap text-sm" style={{ animation: "marquee-scroll 25s linear infinite" }}>
          <span className="text-yellow-400 mx-8">{"\uD83C\uDFB0"} WILLKOMMEN IM CRISTREAM CASINO {"\uD83C\uDFB0"}</span>
          <span className="text-green-400 mx-8">{"\uD83D\uDCB0"} DAS HAUS VERLIERT IMMER {"\uD83D\uDCB0"}</span>
          <span className="text-purple-400 mx-8">{"\uD83C\uDCCF"} VERANTWORTUNGSVOLLES FAKE-GAMBLING™ {"\uD83C\uDCCF"}</span>
          <span className="text-pink-400 mx-8">⚠️ KEINE ECHTEN VERLUSTE ⚠️</span>
          <span className="text-blue-400 mx-8">{"\uD83D\uDD25"} SPECIALS, BOSS FIGHTS & MYSTERY BOXEN {"\uD83D\uDD25"}</span>
        </div>
      </div>

      {/* ── HEADER + POINTS ── */}
      <div className="text-center pt-8 pb-2">
        <img src="/crisino-header.webp" alt="WILLKOMMEN IM CRISINO" className="mx-auto max-w-xl w-full px-4" style={{ filter: "drop-shadow(0 0 30px rgba(168,85,247,0.5))" }} />
        {!user ? (
          <a href="/api/auth/twitch/viewer?returnTo=/casino" className="inline-block mt-4 casino-btn rounded-full px-8 py-3 font-bold text-lg" style={{ background: "linear-gradient(135deg,#9146ff,#6441a5)", boxShadow: "0 4px 15px rgba(145,71,255,0.4)" }}>
            {"\uD83C\uDFAE"} Login mit Twitch
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
                  <span style={{ animation: "fire-flicker 1s ease-in-out infinite", display: "inline-block" }}>{"\uD83D\uDD25"}</span>
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
              {streak > 0 && <span className="streak-anim text-yellow-400 font-bold" key={streak}>{"\uD83D\uDD25"} Streak: {streak}</span>}
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
