import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/api/client";
import { formatNumber } from "@/lib/format-number";
import { casinoSounds } from "@/lib/casino-sounds";
import { StoryGameEmbed } from "./StoryGameEmbed";

interface StoryTabProps {
  user: any;
  channelName: string;
}

const ENDING_INFO: Record<string, { emoji: string; title: string; color: string }> = {
  king:      { emoji: "👑", title: "Der König",        color: "#ffd700" },
  free:      { emoji: "✨", title: "Die Freie Seele",  color: "#22d3ee" },
  sacrifice: { emoji: "🙏", title: "Das Opfer",        color: "#a78bfa" },
  eternal:   { emoji: "🤝", title: "Der Ewige Spieler", color: "#4ade80" },
};

// Location backgrounds per chapter group
const CHAPTER_BACKGROUNDS: Record<number, { gradient: string; label: string }> = {
  1:  { gradient: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 40%, #120828 100%)", label: "Eingang des CRISINO" },
  2:  { gradient: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 40%, #120828 100%)", label: "Casino-Lobby" },
  3:  { gradient: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 40%, #120828 100%)", label: "Keller-Salon" },
  4:  { gradient: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 40%, #120828 100%)", label: "Rätselraum" },
  5:  { gradient: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 40%, #120828 100%)", label: "VIP-Eingang" },
  // Ch 6-10: dark blue ocean depths
  6:  { gradient: "linear-gradient(180deg, #0a1628 0%, #0d1a30 40%, #081020 100%)", label: "Unterwasser-Lounge" },
  7:  { gradient: "linear-gradient(180deg, #0a1628 0%, #0d1a30 40%, #081020 100%)", label: "Tiefsee-Salon" },
  8:  { gradient: "linear-gradient(180deg, #0a1628 0%, #0d1a30 40%, #081020 100%)", label: "Abgrund-Bar" },
  9:  { gradient: "linear-gradient(180deg, #0a1628 0%, #0d1a30 40%, #081020 100%)", label: "Versunkener Tresor" },
  10: { gradient: "linear-gradient(180deg, #0a1628 0%, #0d1a30 40%, #081020 100%)", label: "Meeresgrund" },
  // Ch 11-15: gold VIP
  11: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1000 40%, #0d0800 100%)", label: "VIP-Lounge" },
  12: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1000 40%, #0d0800 100%)", label: "Goldener Saal" },
  13: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1000 40%, #0d0800 100%)", label: "Champagner-Bar" },
  14: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1000 40%, #0d0800 100%)", label: "VIP-Keller" },
  15: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1000 40%, #0d0800 100%)", label: "Platinsaal" },
  // Ch 16-20: green Shadow Market
  16: { gradient: "linear-gradient(180deg, #0a1a0a 0%, #051505 40%, #020d02 100%)", label: "Schattenmarkt" },
  17: { gradient: "linear-gradient(180deg, #0a1a0a 0%, #051505 40%, #020d02 100%)", label: "Giftladen" },
  18: { gradient: "linear-gradient(180deg, #0a1a0a 0%, #051505 40%, #020d02 100%)", label: "Schmuggler-Gasse" },
  19: { gradient: "linear-gradient(180deg, #0a1a0a 0%, #051505 40%, #020d02 100%)", label: "Grüne Höhle" },
  20: { gradient: "linear-gradient(180deg, #0a1a0a 0%, #051505 40%, #020d02 100%)", label: "Schwarzmarkt" },
  // Ch 21-25: red Arena
  21: { gradient: "linear-gradient(180deg, #2a0a0a 0%, #1a0505 40%, #0d0202 100%)", label: "Arena" },
  22: { gradient: "linear-gradient(180deg, #2a0a0a 0%, #1a0505 40%, #0d0202 100%)", label: "Kampfring" },
  23: { gradient: "linear-gradient(180deg, #2a0a0a 0%, #1a0505 40%, #0d0202 100%)", label: "Blut-Salon" },
  24: { gradient: "linear-gradient(180deg, #2a0a0a 0%, #1a0505 40%, #0d0202 100%)", label: "Gladiatoren-Lounge" },
  25: { gradient: "linear-gradient(180deg, #2a0a0a 0%, #1a0505 40%, #0d0202 100%)", label: "Feuer-Ring" },
  // Ch 26-30: cyan Tresor
  26: { gradient: "linear-gradient(180deg, #0a1a1a 0%, #051515 40%, #020d0d 100%)", label: "Tresorraum" },
  27: { gradient: "linear-gradient(180deg, #0a1a1a 0%, #051515 40%, #020d0d 100%)", label: "Laser-Korridor" },
  28: { gradient: "linear-gradient(180deg, #0a1a1a 0%, #051515 40%, #020d0d 100%)", label: "Sicherheitszentrale" },
  29: { gradient: "linear-gradient(180deg, #0a1a1a 0%, #051515 40%, #020d0d 100%)", label: "Gewölbe" },
  30: { gradient: "linear-gradient(180deg, #0a1a1a 0%, #051515 40%, #020d0d 100%)", label: "Krypta" },
  // Ch 31-35: pink Penthouse
  31: { gradient: "linear-gradient(180deg, #1a0a1a 0%, #150515 40%, #0d020d 100%)", label: "Penthouse" },
  32: { gradient: "linear-gradient(180deg, #1a0a1a 0%, #150515 40%, #0d020d 100%)", label: "Rooftop-Bar" },
  33: { gradient: "linear-gradient(180deg, #1a0a1a 0%, #150515 40%, #0d020d 100%)", label: "Sternenzimmer" },
  34: { gradient: "linear-gradient(180deg, #1a0a1a 0%, #150515 40%, #0d020d 100%)", label: "Himmels-Salon" },
  35: { gradient: "linear-gradient(180deg, #1a0a1a 0%, #150515 40%, #0d020d 100%)", label: "Mondterrasse" },
  // Ch 36-40: gold Finale
  36: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1200 40%, #2a1800 100%)", label: "Letzter Aufstieg" },
  37: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1200 40%, #2a1800 100%)", label: "Goldene Halle" },
  38: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1200 40%, #2a1800 100%)", label: "Thronraum" },
  39: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1200 40%, #2a1800 100%)", label: "Schicksalskammer" },
  40: { gradient: "linear-gradient(180deg, #2a1a00 0%, #1a1200 40%, #2a1800 100%)", label: "Das Finale" },
};

function getChapterBg(ch: number): { gradient: string; label: string } {
  return CHAPTER_BACKGROUNDS[ch] ?? CHAPTER_BACKGROUNDS[1]!;
}

// Character portrait positions
const CHARACTER_PORTRAITS: Record<string, { emoji: string; side: "left" | "right" }> = {
  "Crisio": { emoji: "🦊", side: "left" },
  "Cheshire Kimchi": { emoji: "🔮", side: "right" },
  "Topstar": { emoji: "🐋", side: "right" },
  "Kurainu": { emoji: "🖤", side: "right" },
  "Kurainu der Schatten": { emoji: "🖤", side: "right" },
  "Erzähler": { emoji: "📖", side: "left" },
};

// Typewriter text component
function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
    setDone(false);

    const tick = () => {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        // Play tick sound every 3rd char to avoid sound spam
        if (indexRef.current % 3 === 0) casinoSounds.typewriterTick();
        timerRef.current = setTimeout(tick, 25);
      } else {
        setDone(true);
        onDone?.();
      }
    };
    timerRef.current = setTimeout(tick, 100);
    return () => clearTimeout(timerRef.current);
  }, [text]);

  const skipToEnd = () => {
    clearTimeout(timerRef.current);
    setDisplayed(text);
    setDone(true);
    onDone?.();
  };

  return (
    <div ref={containerRef} onClick={skipToEnd} className="cursor-pointer select-none">
      <span className="text-gray-300 leading-relaxed whitespace-pre-line" style={{ fontSize: "0.95rem" }}>
        {displayed}
      </span>
      {!done && <span className="vn-cursor text-purple-400 ml-0.5">▌</span>}
    </div>
  );
}

export function StoryTab({ user, channelName }: StoryTabProps) {
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textDone, setTextDone] = useState(false);

  const fetchStory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/story`) as any;
      if (res.data) setStory(res.data);
    } catch {}
  }, [user, channelName]);

  useEffect(() => { fetchStory(); }, [fetchStory]);

  const startStory = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/start`, {}) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const restartStory = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/restart`, {}) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const advance = async () => {
    setLoading(true);
    setTextDone(false);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/next`, {}) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const makeChoice = async (choiceId: string) => {
    setLoading(true);
    setTextDone(false);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/choice`, { choiceId }) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const reportGame = async (won: boolean) => {
    setLoading(true);
    setTextDone(false);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/game`, { won }) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  if (!user) return <p className="text-center text-gray-500 py-8">Logge dich ein um die Story zu spielen!</p>;

  const completedEndings: string[] = story?.completedEndings ?? [];
  const completions = story?.completions ?? 0;

  const EndingBadges = () => {
    if (completedEndings.length === 0) return null;
    return (
      <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)" }}>
        <div className="text-xs text-gray-500 mb-2 text-center">Freigeschaltete Enden ({completedEndings.length}/4)</div>
        <div className="flex justify-center gap-2 flex-wrap">
          {Object.entries(ENDING_INFO).map(([key, info]) => {
            const unlocked = completedEndings.includes(key);
            return (
              <div key={key} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${unlocked ? "" : "opacity-30 grayscale"}`}
                style={unlocked ? { background: `${info.color}15`, border: `1px solid ${info.color}40`, color: info.color } : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#666" }}
                title={unlocked ? info.title : "???"}>
                {info.emoji} {unlocked ? info.title : "???"}
              </div>
            );
          })}
        </div>
        {completedEndings.length === 4 && (
          <div className="text-center mt-2 text-xs font-bold text-yellow-400">
            📖 Alle Enden freigeschaltet! Du bist ein wahrer Legendensammler!
          </div>
        )}
      </div>
    );
  };

  // Not started yet
  if (!story?.state) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center">
        <EndingBadges />
        <div className="rounded-2xl p-8" style={{ background: "linear-gradient(180deg, rgba(255,215,0,0.08), rgba(0,0,0,0.4))", border: "2px solid rgba(255,215,0,0.3)" }}>
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-3xl font-black text-yellow-300 mb-2">Die Legende des Goldenen Chips</h2>
          <p className="text-gray-400 mb-4">Ein episches Abenteuer in 40 Kapiteln. Spiele dich durch alle Casino-Games, triff unvergessliche Charaktere und entdecke das Geheimnis des mächtigsten Artefakts der Glücksspiel-Geschichte.</p>
          <p className="text-xs text-gray-600 mb-6">~8 Stunden Spielzeit · 40 Kapitel · 4 Enden · Alle Minigames integriert</p>
          <button onClick={completions > 0 ? restartStory : startStory} disabled={loading} className="casino-btn px-10 py-4 rounded-xl font-black text-xl text-black"
            style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
            {loading ? "..." : completions > 0 ? "🔄 Erneut spielen!" : "📖 Abenteuer starten!"}
          </button>
          {completions > 0 && (
            <p className="text-xs text-gray-500 mt-3">Bereits {completions}x abgeschlossen · Triff andere Entscheidungen für neue Enden!</p>
          )}
        </div>
      </div>
    );
  }

  const { state, scene, progress } = story;
  const isCompleted = story.completed || (story.message && !scene);
  const gameEmojis: Record<string, string> = {
    flip: "🪙", slots: "🎰", scratch: "🎟️", dice21: "🎲", poker: "🃏",
    roulette: "🎰", sudoku4: "🔢", sudoku9: "🧩", snake: "🐍", memory: "🧠", allin: "💀",
  };

  const currentChapter = state.chapter ?? 1;
  const bgInfo = getChapterBg(currentChapter);

  // Detect character from scene
  const charName = scene?.character?.replace(/^.*?\s/, "").trim() ?? "";
  const charInfo = CHARACTER_PORTRAITS[charName] || (scene?.character ? { emoji: "👤", side: "left" as const } : null);

  return (
    <div className="max-w-2xl mx-auto px-6 py-4">
      <EndingBadges />

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-500">Kapitel {state.chapter}/40</span>
        <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(state.chapter / 40) * 100}%`, background: "linear-gradient(90deg, #ffd700, #ff8c00)" }} />
        </div>
        <span className="text-xs text-yellow-400">{formatNumber(state.points)} Pts</span>
      </div>

      {/* Inventory */}
      {state.inventory?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {state.inventory.map((item: string, i: number) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{item}</span>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* Story completed */}
      {isCompleted && (
        <div className="rounded-2xl p-6 mb-4 text-center" style={{
          background: "linear-gradient(180deg, rgba(255,215,0,0.1), rgba(0,0,0,0.6))",
          border: "2px solid rgba(255,215,0,0.3)",
        }}>
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-2xl font-black text-yellow-300 mb-2">Geschichte abgeschlossen!</h3>
          {story.ending && ENDING_INFO[story.ending] && (
            <div className="mb-3">
              <span className="text-4xl">{ENDING_INFO[story.ending].emoji}</span>
              <p className="text-lg font-black mt-1" style={{ color: ENDING_INFO[story.ending].color }}>
                {ENDING_INFO[story.ending].title}
              </p>
            </div>
          )}
          {story.message && <p className="text-gray-400 text-sm mb-4">{story.message}</p>}
          <div className="space-y-2">
            <button onClick={restartStory} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
              style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
              {loading ? "..." : "🔄 Erneut spielen — anderes Ende entdecken!"}
            </button>
            <p className="text-xs text-gray-600">Triff andere Entscheidungen in Kapitel 32 und 39 für ein anderes Ende!</p>
          </div>
        </div>
      )}

      {/* ── Visual Novel Scene ── */}
      {scene && !isCompleted && (
        <div className="rounded-2xl overflow-hidden mb-4 relative" style={{
          background: bgInfo.gradient,
          border: "1px solid rgba(255,215,0,0.15)",
          minHeight: "400px",
        }}>
          {/* Location label */}
          <div className="absolute top-3 left-4 z-10">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-gray-400 border border-white/10">
              📍 {bgInfo.label}
            </span>
          </div>

          {/* Chapter title */}
          {progress && (
            <div className="text-center pt-8 pb-2 relative z-10">
              <span className="text-xs text-gray-600">Kapitel {progress.currentChapter}</span>
              <h3 className="text-xl font-black text-yellow-300">{story.chapter?.title}</h3>
            </div>
          )}

          {/* Character portrait area */}
          {charInfo && (
            <div className={`absolute ${charInfo.side === "left" ? "left-4" : "right-4"} top-16 z-10 opacity-80`}>
              <div className="text-7xl drop-shadow-lg" style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))" }}>
                {charInfo.emoji}
              </div>
            </div>
          )}

          {/* Content area (pushed down for portrait space) */}
          <div className="relative z-10 px-6 pt-4 pb-6" style={{ marginTop: charInfo ? "60px" : "0" }}>
            {/* Game required */}
            {scene.game && (
              <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(145,71,255,0.1)", border: "1px solid rgba(145,71,255,0.3)" }}>
                <div className="text-center mb-3">
                  <div className="text-3xl mb-1">{gameEmojis[scene.game.type] ?? "🎮"}</div>
                  <p className="text-sm text-purple-300 font-bold">{scene.game.description}</p>
                  {scene.game.mustWin && <p className="text-[10px] text-yellow-400 mt-1">Du musst gewinnen um fortzufahren!</p>}
                  {scene.game.reward && <p className="text-[10px] text-green-400">Belohnung: +{scene.game.reward} Pts</p>}
                </div>
                <StoryGameEmbed
                  gameType={scene.game.type}
                  channelName={channelName}
                  description={scene.game.description}
                  onComplete={(won) => reportGame(won)}
                />
              </div>
            )}

            {/* Boss encounter */}
            {scene.boss && (
              <div className="rounded-xl p-4 mb-3 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.4)" }}>
                <div className="text-4xl mb-2">{scene.boss.emoji}</div>
                <h4 className="font-black text-red-400 text-lg mb-1">BOSS: {scene.boss.name}</h4>
                <p className="text-sm text-gray-300 italic mb-2">"{scene.boss.dialog}"</p>
                <p className="text-xs text-green-400 mb-3">Belohnung: +{scene.boss.reward} Pts</p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => reportGame(true)} disabled={loading}
                    className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                    ⚔️ Besiegt!
                  </button>
                  <button onClick={() => reportGame(false)} disabled={loading}
                    className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(239,68,68,0.3)" }}>
                    💀 Verloren
                  </button>
                </div>
              </div>
            )}

            {/* Choice */}
            {scene.choice && (
              <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <p className="text-sm text-purple-300 font-bold mb-3">{scene.choice.prompt}</p>
                <div className="space-y-2">
                  {scene.choice.options.map((opt: any) => (
                    <button key={opt.id} onClick={() => makeChoice(opt.id)} disabled={loading}
                      className="casino-btn w-full py-3 rounded-xl font-bold text-sm text-left px-4 text-white transition-all hover:bg-purple-500/20"
                      style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.3)" }}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Visual Novel Textbox at bottom ── */}
          <div className="relative z-20 mx-3 mb-3">
            <div className="rounded-xl px-5 py-4" style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              {/* Character name label */}
              {scene.character && (
                <div className="mb-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded" style={{
                    background: "rgba(168,85,247,0.3)",
                    color: "#c4b5fd",
                    border: "1px solid rgba(168,85,247,0.4)",
                  }}>
                    {scene.character}
                  </span>
                </div>
              )}

              {/* Typewriter text */}
              <TypewriterText
                key={`${state.chapter}-${state.scene}-${scene.text?.slice(0, 20)}`}
                text={scene.text ?? ""}
                onDone={() => setTextDone(true)}
              />
            </div>
          </div>

          {/* Continue button */}
          {!scene.game && !scene.choice && !scene.boss && (
            <div className="px-3 pb-3 relative z-20">
              <button onClick={advance} disabled={loading || !textDone}
                className={`casino-btn w-full py-3 rounded-xl font-bold text-sm text-black transition-opacity ${textDone ? "opacity-100" : "opacity-40"}`}
                style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                {loading ? "..." : "Weiter →"}
              </button>
            </div>
          )}

          {/* Item received */}
          {scene.giveItem && (
            <div className="pb-3 text-center relative z-20">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                📦 Erhalten: {scene.giveItem}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-600">
        <span>Siege: {state.stats?.wins ?? 0}</span>
        <span>Niederlagen: {state.stats?.losses ?? 0}</span>
        <span>Rätsel: {state.stats?.puzzlesSolved ?? 0}</span>
        <span>Bosse: {state.stats?.bossesDefeated ?? 0}</span>
        {completions > 0 && <span>Durchgänge: {completions}</span>}
      </div>
    </div>
  );
}
