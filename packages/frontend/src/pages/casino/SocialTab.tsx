import { api } from "@/api/client";
import { formatNumber } from "@/lib/format-number";
import type { HeistState } from "./types";

interface SocialTabProps {
  user: any;
  channelName: string;
  // Guilds
  guilds: any[];
  myGuild: any | null;
  guildCreateName: string;
  setGuildCreateName: (v: string) => void;
  guildCreateEmoji: string;
  setGuildCreateEmoji: (v: string) => void;
  guildLoading: boolean;
  setGuildLoading: (v: boolean) => void;
  // Heist
  heist: HeistState | null;
  heistMessage: string | null;
  setHeist: (v: HeistState | null) => void;
  // Guild War
  weeklyRanking?: any[];
  guildQuests?: any[];
  guildBoss?: any | null;
  // Handlers
  setMessage: (v: string | null) => void;
  fetchGuilds: () => void;
  fetchPoints: () => void;
  fetchHeist: () => void;
  createHeist: () => void;
  joinHeist: () => void;
  playHeistRound: (game: string) => void;
  heistBetray: () => void;
  heistFinish: () => void;
}

export function SocialTab(props: SocialTabProps) {
  const {
    user, channelName,
    guilds, myGuild, guildCreateName, setGuildCreateName, guildCreateEmoji, setGuildCreateEmoji, guildLoading, setGuildLoading,
    heist, heistMessage, setHeist,
    weeklyRanking, guildQuests, guildBoss,
    setMessage, fetchGuilds, fetchPoints, fetchHeist,
    createHeist, joinHeist, playHeistRound, heistBetray, heistFinish,
  } = props;

  if (!user) return null;

  return (
    <>
      {/* ── GUILDS ── */}
      <div className="max-w-2xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-5" style={{
          background: "linear-gradient(180deg, rgba(34,197,94,0.06), rgba(0,0,0,0.2))",
          border: "1px solid rgba(34,197,94,0.25)",
        }}>
          <h3 className="font-black text-lg text-green-400 mb-3">{"\uD83C\uDFF0"} GILDEN</h3>
          {myGuild ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{myGuild.emoji}</span>
                <div className="flex-1">
                  <div className="font-black text-white text-lg">{myGuild.name}</div>
                  <div className="text-xs text-gray-400">Anfuhrer: {myGuild.leaderName} · {myGuild.members?.length || 0} Mitglieder · {formatNumber(myGuild.totalXp ?? 0)} XP</div>
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
              }}>Gilde verlassen</button>
            </div>
          ) : (
            <div>
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
                      }}>Beitreten</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <h4 className="text-xs font-bold text-green-400 mb-2">Neue Gilde grunden (1.000 Pts)</h4>
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
                  }}>Grunden</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── GUILD WAR ── */}
      {myGuild && (
        <div className="max-w-2xl mx-auto px-6 pb-6">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(249,115,22,0.06), rgba(0,0,0,0.2))",
            border: "1px solid rgba(249,115,22,0.25)",
          }}>
            <h3 className="font-black text-lg text-orange-400 mb-3">⚔️ GILDEN-KRIEG</h3>

            {/* Weekly Ranking */}
            {weeklyRanking && weeklyRanking.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-orange-300 mb-2">🏆 Wochen-Ranking</h4>
                <div className="space-y-1">
                  {weeklyRanking.slice(0, 5).map((g: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{
                      background: g.guildId === myGuild?.guildId ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.02)",
                      border: g.guildId === myGuild?.guildId ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
                    }}>
                      <span className="w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <span className="text-lg">{g.emoji}</span>
                      <span className={`flex-1 truncate ${i < 3 ? "font-bold text-yellow-300" : "text-white"}`}>{g.name}</span>
                      <span className="text-orange-400 font-bold">{formatNumber(g.weeklyXp)} XP</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Top 3 am Sonntag: Titel + Bonus-Punkte!</p>
              </div>
            )}

            {/* Daily Guild Quests */}
            {guildQuests && guildQuests.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-orange-300 mb-2">📋 Tägliche Gilden-Quests</h4>
                <div className="space-y-2">
                  {guildQuests.map((q: any, i: number) => (
                    <div key={i} className="rounded-xl p-3" style={{
                      background: q.done ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.05)",
                      border: `1px solid ${q.done ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.2)"}`,
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{q.title}</span>
                        {q.done && <span className="text-green-400 text-xs font-bold">✅ Erledigt</span>}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{q.description}</p>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${Math.min(100, (q.progress / q.target) * 100)}%`,
                          background: q.done ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #f97316, #ea580c)",
                        }} />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">{q.progress}/{q.target}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Beide Quests erledigt = Boss spawnt!</p>
              </div>
            )}

            {/* Guild Boss */}
            {guildBoss?.active && (
              <div className="rounded-xl p-4 text-center" style={{
                background: "rgba(239,68,68,0.08)",
                border: "2px solid rgba(239,68,68,0.4)",
              }}>
                <div className="text-4xl mb-2">{guildBoss.emoji}</div>
                <h4 className="font-black text-red-400 text-lg mb-1">GILDEN-BOSS: {guildBoss.name}</h4>
                <div className="relative h-6 rounded-full overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <div className={`h-full rounded-full transition-all duration-500 ${guildBoss.hp < guildBoss.maxHp ? "boss-hp-drain" : ""}`} style={{
                    width: `${Math.max(0, (guildBoss.hp / guildBoss.maxHp) * 100)}%`,
                    background: guildBoss.hp / guildBoss.maxHp > 0.5
                      ? "linear-gradient(90deg, #ef4444, #f97316)"
                      : guildBoss.hp / guildBoss.maxHp > 0.25
                      ? "linear-gradient(90deg, #f97316, #fbbf24)"
                      : "linear-gradient(90deg, #dc2626, #ef4444)",
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {guildBoss.hp}/{guildBoss.maxHp} HP
                  </div>
                </div>
                {guildBoss.defeated ? (
                  <p className="text-green-400 font-bold text-sm">🎉 Boss besiegt! +{guildBoss.reward} Pts für alle Mitglieder!</p>
                ) : (
                  <p className="text-xs text-gray-400">Jeder Gewinn schadet dem Boss! · Belohnung: +{guildBoss.reward} Pts/Mitglied</p>
                )}
              </div>
            )}

            {guildBoss && guildBoss.defeated && (
              <div className="rounded-xl p-3 mt-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <p className="text-green-400 font-bold text-sm">🏆 Boss besiegt! Belohnungen wurden verteilt.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HEIST ── */}
      <div className="max-w-2xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-5 heist-border" style={{
          background: "linear-gradient(180deg, rgba(127,29,29,0.15), rgba(0,0,0,0.3))",
          border: "2px solid rgba(220,38,38,0.4)",
        }}>
          <h3 className="font-black text-lg text-red-400 mb-3">{"\uD83C\uDFF4\u200D☠️"} HEIST</h3>
          {heistMessage && (
            <div className="text-sm text-red-300 bg-red-500/10 rounded-lg px-3 py-2 mb-3 border border-red-500/20">{heistMessage}</div>
          )}
          {(!heist || (!heist.active && heist.phase !== "finished")) && (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-3">Starte einen Heist und uberfalle das Casino mit anderen Spielern!</p>
              <button onClick={createHeist} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                {"\uD83C\uDFF4\u200D☠️"} HEIST STARTEN (50 Pts)
              </button>
            </div>
          )}
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
                  {"\uD83C\uDFF4\u200D☠️"} BEITRETEN (25 Pts)
                </button>
              ) : (
                <p className="text-sm text-green-400 font-bold">✅ Du bist dabei! Warte auf andere Spieler...</p>
              )}
            </div>
          )}
          {heist?.active && heist.phase === "playing" && (
            <div>
              <p className="text-sm text-gray-400 mb-3 text-center">Pot: <span className="text-yellow-400 font-bold">{heist.pot} Pts</span></p>
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
              {(heist.round ?? 0) < 3 ? (
                <div className="flex justify-center gap-2">
                  <button onClick={() => playHeistRound("slots")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>{"\uD83C\uDFB0"} Slots</button>
                  <button onClick={() => playHeistRound("flip")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>{"\uD83E\uDE99"} Flip</button>
                  <button onClick={() => playHeistRound("scratch")} className="casino-btn px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "linear-gradient(135deg, #00cc88, #009966)", color: "#000" }}>{"\uD83C\uDF9F️"} Scratch</button>
                </div>
              ) : (
                <p className="text-center text-sm text-green-400 font-bold">✅ Deine Runden fertig! Warte auf andere...</p>
              )}
            </div>
          )}
          {heist?.active && heist.phase === "betrayal" && (
            <div className="text-center">
              <p className="text-lg text-red-300 font-black mb-2">VERRAT ODER TREUE?</p>
              <p className="text-sm text-gray-400 mb-3">Pot: {heist.pot} Pts · Entscheide dich!</p>
              {heist.countdown && <p className="text-yellow-400 text-sm mb-3">{heist.countdown}s verbleibend...</p>}
              <div className="flex justify-center gap-4">
                <button onClick={heistFinish} className="casino-btn px-6 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #22c55e, #166534)" }}>
                  {"\uD83E\uDD1D"} TREU BLEIBEN
                </button>
                <button onClick={heistBetray} className="casino-btn px-6 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626, #7f1d1d)" }}>
                  {"\uD83D\uDDE1️"} VERRATEN
                </button>
              </div>
            </div>
          )}
          {heist && heist.phase === "finished" && (
            <div className="text-center">
              <p className="text-lg text-yellow-400 font-black mb-3">HEIST ABGESCHLOSSEN!</p>
              <div className="space-y-1 mb-3">
                {heist.results?.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className={`font-bold ${r.betrayed ? "text-red-400" : "text-white"}`}>
                      {r.displayName} {r.betrayed ? "\uD83D\uDDE1️" : "\uD83E\uDD1D"}
                    </span>
                    <span className={`font-bold ${r.payout > 0 ? "text-green-400" : "text-red-400"}`}>
                      {r.payout > 0 ? "+" : ""}{r.payout} Pts
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setHeist(null); fetchPoints(); }} className="text-xs text-gray-500 hover:text-gray-300">Schliessen</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
