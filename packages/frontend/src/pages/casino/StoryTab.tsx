import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { formatNumber } from "@/lib/format-number";

interface StoryTabProps {
  user: any;
  channelName: string;
}

export function StoryTab({ user, channelName }: StoryTabProps) {
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const advance = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/next`, {}) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const makeChoice = async (choiceId: string) => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/choice`, { choiceId }) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  const reportGame = async (won: boolean) => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/story/game`, { won }) as any;
      if (res.data) setStory(res.data);
      else setError(res.error ?? "Fehler!");
    } catch { setError("Fehler!"); }
    setLoading(false);
  };

  if (!user) return <p className="text-center text-gray-500 py-8">Logge dich ein um die Story zu spielen!</p>;

  // Not started yet
  if (!story?.state) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center">
        <div className="rounded-2xl p-8" style={{ background: "linear-gradient(180deg, rgba(255,215,0,0.08), rgba(0,0,0,0.4))", border: "2px solid rgba(255,215,0,0.3)" }}>
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-3xl font-black text-yellow-300 mb-2">Die Legende des Goldenen Chips</h2>
          <p className="text-gray-400 mb-4">Ein episches Abenteuer in 40 Kapiteln. Spiele dich durch alle Casino-Games, triff unvergessliche Charaktere und entdecke das Geheimnis des mächtigsten Artefakts der Glücksspiel-Geschichte.</p>
          <p className="text-xs text-gray-600 mb-6">~8 Stunden Spielzeit · 40 Kapitel · 4 Enden · Alle Minigames integriert</p>
          <button onClick={startStory} disabled={loading} className="casino-btn px-10 py-4 rounded-xl font-black text-xl text-black"
            style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
            {loading ? "..." : "📖 Abenteuer starten!"}
          </button>
        </div>
      </div>
    );
  }

  const { state, scene, progress } = story;
  const gameEmojis: Record<string, string> = {
    flip: "🪙", slots: "🎰", scratch: "🎟️", dice21: "🎲", poker: "🃏",
    roulette: "🎰", sudoku4: "🔢", sudoku9: "🧩", snake: "🐍", memory: "🧠", allin: "💀",
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-4">
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

      {/* Scene content */}
      {scene && (
        <div className="rounded-2xl p-6 mb-4" style={{
          background: "linear-gradient(180deg, rgba(20,15,5,0.9), rgba(10,8,3,0.95))",
          border: "1px solid rgba(255,215,0,0.15)",
          fontFamily: "'Georgia', serif",
        }}>
          {/* Chapter title */}
          {progress && (
            <div className="text-center mb-4">
              <span className="text-xs text-gray-600">Kapitel {progress.chapter}</span>
              <h3 className="text-xl font-black text-yellow-300">{progress.title}</h3>
            </div>
          )}

          {/* Character */}
          {scene.character && (
            <div className="text-sm font-bold text-purple-300 mb-2">{scene.character}</div>
          )}

          {/* Narrative text */}
          <div className="text-gray-300 leading-relaxed whitespace-pre-line mb-4" style={{ fontSize: "0.95rem" }}>
            {scene.text}
          </div>

          {/* Game required */}
          {scene.game && (
            <div className="rounded-xl p-4 mb-3 text-center" style={{ background: "rgba(145,71,255,0.1)", border: "1px solid rgba(145,71,255,0.3)" }}>
              <div className="text-3xl mb-2">{gameEmojis[scene.game.type] ?? "🎮"}</div>
              <p className="text-sm text-purple-300 font-bold mb-1">{scene.game.description}</p>
              {scene.game.mustWin && <p className="text-[10px] text-yellow-400">Du musst gewinnen um fortzufahren!</p>}
              {scene.game.reward && <p className="text-[10px] text-green-400">Belohnung: +{scene.game.reward} Pts</p>}
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={() => reportGame(true)} disabled={loading}
                  className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}>
                  ✅ Gewonnen!
                </button>
                <button onClick={() => reportGame(false)} disabled={loading}
                  className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  ❌ Verloren
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">Spiele das Spiel auf dem Spielen-Tab und berichte das Ergebnis hier</p>
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

          {/* Continue button (if no game/choice/boss) */}
          {!scene.game && !scene.choice && !scene.boss && (
            <button onClick={advance} disabled={loading}
              className="casino-btn w-full py-3 rounded-xl font-bold text-sm text-black"
              style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
              {loading ? "..." : "Weiter →"}
            </button>
          )}

          {/* Item received */}
          {scene.giveItem && (
            <div className="mt-3 text-center">
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
      </div>
    </div>
  );
}
