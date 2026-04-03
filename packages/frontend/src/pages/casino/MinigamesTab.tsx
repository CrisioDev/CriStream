import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/client";
import { casinoSounds } from "@/lib/casino-sounds";
import { formatNumber } from "@/lib/format-number";
import { StoryGameEmbed } from "./StoryGameEmbed";

// ── Memory Timer sub-component ──
function MemoryTimer({ start }: { start: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(iv);
  }, [start]);
  return <span className="text-purple-400 font-bold">{(elapsed / 1000).toFixed(1)}s</span>;
}

interface MinigamesTabProps {
  user: any;
  channelName: string;
  fetchPoints: () => void;
}

export function MinigamesTab({ user, channelName, fetchPoints }: MinigamesTabProps) {
  // Local state for minigames
  const [activeMinigame, setActiveMinigame] = useState<string | null>(null);

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
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>([]);
  const [sudokuDiff, setSudokuDiff] = useState<"easy" | "medium" | "hard">("easy");
  const [sudokuStart, setSudokuStart] = useState(0);
  const [sudokuDone, setSudokuDone] = useState(false);
  const [sudokuMsg, setSudokuMsg] = useState<string | null>(null);

  // 9x9 Sudoku
  const [s9Puzzle, setS9Puzzle] = useState<(number | 0)[][] | null>(null);
  const [s9Grid, setS9Grid] = useState<number[][]>([]);
  const [s9Diff, setS9Diff] = useState<"easy" | "medium" | "hard">("easy");
  const [s9Start, setS9Start] = useState(0);
  const [s9Done, setS9Done] = useState(false);
  const [s9Msg, setS9Msg] = useState<string | null>(null);

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

  // Dice 21
  const [d21, setD21] = useState<{ total: number; rolls: number[]; bet: number; finished: boolean } | null>(null);
  const [d21Bet, setD21Bet] = useState(20);
  const [d21Msg, setD21Msg] = useState<string | null>(null);

  // Over/Under
  const [ouBet, setOuBet] = useState(10);
  const [ouResult, setOuResult] = useState<{ dice: number[]; total: number; win: boolean; payout: number; guess: string } | null>(null);
  const [ouMsg, setOuMsg] = useState<string | null>(null);

  // ── Casino Run State ──
  const [casinoRun, setCasinoRun] = useState<any>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runLeaderboard, setRunLeaderboard] = useState<any[]>([]);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/run`) as any;
      setCasinoRun(res.data ?? null);
    } catch {}
  }, [channelName]);

  const fetchRunLb = useCallback(async () => {
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/run/leaderboard`) as any;
      setRunLeaderboard(res.data ?? []);
    } catch {}
  }, [channelName]);

  useEffect(() => { fetchRun(); fetchRunLb(); }, [fetchRun, fetchRunLb]);

  const startCasinoRun = async () => {
    setRunLoading(true);
    setRunMsg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/run/start`, {}) as any;
      if (res.success) { setCasinoRun(res.data); fetchPoints(); }
      else setRunMsg(res.error ?? "Fehler!");
    } catch { setRunMsg("Fehler!"); }
    setRunLoading(false);
  };

  const reportRunResult = async (won: boolean) => {
    setRunLoading(true);
    setRunMsg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/run/report`, { won }) as any;
      if (res.success) {
        const d = res.data;
        if (d.status === "victory") {
          casinoSounds.stageClear();
          setRunMsg(`🏆 VICTORY! Score: ${d.score} Pts (Rang #${d.leaderboardRank})`);
          setCasinoRun(null);
          fetchRunLb();
          fetchPoints();
        } else if (d.status === "gameover") {
          casinoSounds.runGameOver();
          setRunMsg("💀 GAME OVER! Besser nächstes Mal.");
          setCasinoRun(null);
        } else {
          casinoSounds.stageClear();
          setCasinoRun(d.run);
        }
      } else { setRunMsg(res.error ?? "Fehler!"); }
    } catch { setRunMsg("Fehler!"); }
    setRunLoading(false);
  };

  const STAGE_MULTIPLIERS = [1, 1.5, 2, 3, 5];
  const GAME_EMOJIS: Record<string, string> = {
    flip: "🪙", slots: "🎰", scratch: "🎟️", dice21: "🎲",
    poker: "🃏", roulette: "🎰", memory: "🧠",
  };

  // ── Snake functions ──
  const drawSnake = () => {
    const canvas = snakeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = snakeRef.current;
    const cell = canvas.width / 20;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke(); }
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(g.apple.x * cell + cell / 2, g.apple.y * cell + cell / 2, cell / 2.5, 0, Math.PI * 2); ctx.fill();
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

  const snakeTick = () => {
    const g = snakeRef.current;
    if (!g.running) return;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) { endSnake(); return; }
    if (g.snake.some(s => s.x === head.x && s.y === head.y)) { endSnake(); return; }
    g.snake.unshift(head);
    if (head.x === g.apple.x && head.y === g.apple.y) {
      g.score++;
      setSnakeScore(g.score);
      let ax: number, ay: number;
      do { ax = Math.floor(Math.random() * 20); ay = Math.floor(Math.random() * 20); }
      while (g.snake.some(s => s.x === ax && s.y === ay));
      g.apple = { x: ax, y: ay };
    } else {
      g.snake.pop();
    }
    drawSnake();
  };

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

  const submitSnake = async () => {
    if (!user || snakeSubmitted) return;
    setSnakeSubmitted(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/snake/submit`, { score: snakeRef.current.score }) as any;
      if (res.success) { setSnakePoints(res.data.points); fetchPoints(); }
      else setConnect4Msg(res.error ?? "Fehler!");
    } catch { /* ignore */ }
  };

  // Snake keyboard
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

  // ── Connect 4 ──
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

  // Poll Connect 4
  useEffect(() => {
    if (activeMinigame === "connect4" && connect4 && (connect4.status === "waiting" || connect4.status === "playing")) {
      connect4PollRef.current = setInterval(fetchConnect4, 2000);
      return () => clearInterval(connect4PollRef.current);
    } else {
      if (connect4PollRef.current) clearInterval(connect4PollRef.current);
    }
  }, [activeMinigame, connect4?.status]);

  // ── Memory ──
  const MEMORY_EMOJIS = ["\uD83C\uDFB0", "\uD83C\uDFB2", "\uD83C\uDCCF", "\uD83D\uDC8E", "\uD83C\uDF40", "\uD83D\uDD25", "⭐", "\uD83C\uDF81"];

  const startMemory = () => {
    const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    setMemoryCards(pairs.map(emoji => ({ emoji: emoji!, flipped: false, matched: false })));
    setMemoryFlipped([]); setMemoryMoves(0); setMemoryComplete(false); setMemoryPoints(0);
    setMemoryStartTime(Date.now());
    memoryLockRef.current = false;
  };

  const submitMemory = async (pairs: number, timeMs: number, moves: number) => {
    if (!user) return;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/memory/submit`, { pairs, timeMs, moves }) as any;
      if (res.success) { setMemoryPoints(res.data.points); fetchPoints(); }
    } catch { /* ignore */ }
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
      if (newCards[a!].emoji === newCards[b!].emoji) {
        setTimeout(() => {
          setMemoryCards(prev => {
            const updated = [...prev];
            updated[a!] = { ...updated[a!], matched: true };
            updated[b!] = { ...updated[b!], matched: true };
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
        setTimeout(() => {
          setMemoryCards(prev => {
            const updated = [...prev];
            updated[a!] = { ...updated[a!], flipped: false };
            updated[b!] = { ...updated[b!], flipped: false };
            return updated;
          });
          setMemoryFlipped([]);
          memoryLockRef.current = false;
        }, 800);
      }
    }
  };

  if (!user) return null;

  return (
    <>
      {/* ── CASINO RUN ── */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-5" style={{
          background: "linear-gradient(180deg, rgba(255,100,0,0.08), rgba(0,0,0,0.3))",
          border: "2px solid rgba(255,100,0,0.4)",
        }}>
          <h3 className="font-black text-lg text-orange-400 mb-2">🎲 CASINO RUN</h3>
          <p className="text-xs text-gray-500 mb-3">5 zufällige Games · Gewinne alle für den Highscore! · 50 Pts Einsatz</p>

          {runMsg && (
            <div className={`text-sm font-bold rounded-lg px-3 py-2 mb-3 ${runMsg.includes("VICTORY") ? "text-green-400 bg-green-500/10 border border-green-500/20" : runMsg.includes("GAME OVER") ? "text-red-400 bg-red-500/10 border border-red-500/20" : "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"}`}>
              {runMsg}
            </div>
          )}

          {!casinoRun ? (
            <div className="text-center">
              <button onClick={startCasinoRun} disabled={runLoading}
                className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
                style={{ background: runLoading ? "#666" : "linear-gradient(135deg, #f97316, #ea580c)" }}>
                {runLoading ? "..." : "🎲 RUN STARTEN (50 Pts)"}
              </button>
            </div>
          ) : (
            <div className="run-stage-enter">
              {/* Stage progress */}
              <div className="flex justify-center gap-2 mb-4">
                {casinoRun.games.map((game: string, i: number) => {
                  const isDone = i < casinoRun.results.length;
                  const isCurrent = i === casinoRun.stage;
                  const won = casinoRun.results[i];
                  return (
                    <div key={i} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isCurrent ? "scale-110" : ""}`}
                      style={{
                        background: isDone ? (won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)") : isCurrent ? "rgba(255,100,0,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isDone ? (won ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)") : isCurrent ? "rgba(255,100,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <span className="text-2xl">{GAME_EMOJIS[game] ?? "🎮"}</span>
                      <span className="text-[10px] text-gray-500">x{STAGE_MULTIPLIERS[i]}</span>
                      {isDone && <span className="text-xs">{won ? "✅" : "❌"}</span>}
                      {isCurrent && <span className="text-[10px] text-orange-400 font-bold">JETZT</span>}
                    </div>
                  );
                })}
              </div>

              {/* Current stage game */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,100,0,0.05)", border: "1px solid rgba(255,100,0,0.2)" }}>
                <div className="text-center mb-2">
                  <span className="text-xs text-gray-500">Stufe {casinoRun.stage + 1}/5 · Multiplikator x{STAGE_MULTIPLIERS[casinoRun.stage]}</span>
                </div>
                <StoryGameEmbed
                  key={`run-stage-${casinoRun.stage}`}
                  gameType={casinoRun.games[casinoRun.stage]}
                  channelName={channelName}
                  description={`Casino Run Stufe ${casinoRun.stage + 1}`}
                  onComplete={(won) => reportRunResult(won)}
                />
              </div>
            </div>
          )}

          {/* Run Leaderboard */}
          {runLeaderboard.length > 0 && (
            <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h4 className="text-xs font-bold text-orange-400 mb-2">🏆 Run Bestenliste</h4>
              <div className="space-y-1">
                {runLeaderboard.slice(0, 10).map((entry: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg" style={{ background: i < 3 ? "rgba(255,215,0,0.05)" : "transparent" }}>
                    <span className="w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                    <span className={`flex-1 truncate ${i < 3 ? "font-bold text-yellow-300" : "text-white"}`}>{entry.displayName}</span>
                    <span className="text-orange-400 font-bold">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Minigame Cards ── */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <h3 className="font-black text-lg text-purple-300 mb-3">{"\uD83C\uDFAE"} MINIGAMES</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Snake */}
          <button onClick={() => { setActiveMinigame("snake"); setTimeout(startSnake, 100); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,197,94,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83D\uDC0D"}</div>
            <div className="font-black text-green-400">Snake</div>
            <div className="text-xs text-gray-500 mt-1">1 Pt pro Apfel · Max 50</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>Spielen</div>
          </button>
          {/* Connect 4 */}
          <button onClick={() => { setActiveMinigame("connect4"); fetchConnect4(); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83D\uDD34"}</div>
            <div className="font-black text-red-400">4 Gewinnt</div>
            <div className="text-xs text-gray-500 mt-1">Fordere jemanden heraus! Ab 5 Pts</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>Spielen</div>
          </button>
          {/* Memory */}
          <button onClick={() => { setActiveMinigame("memory"); startMemory(); }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83E\uDDE0"}</div>
            <div className="font-black text-purple-400">Memory</div>
            <div className="text-xs text-gray-500 mt-1">Finde alle Paare! Bis zu 26 Pts</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc" }}>Spielen</div>
          </button>
          {/* Dice 21 */}
          <button onClick={() => setActiveMinigame("dice21")} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(251,146,60,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(251,146,60,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83C\uDFB2"}</div>
            <div className="font-black text-orange-400">Wurfel 21</div>
            <div className="text-xs text-gray-500 mt-1">Triff 21! Bis x3</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(251,146,60,0.2)", color: "#fb923c" }}>Spielen</div>
          </button>
          {/* Sudoku */}
          <button onClick={() => {
            setActiveMinigame("sudoku");
            setSudokuDone(false); setSudokuMsg(null);
            api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${sudokuDiff}`).then((r: any) => {
              if (r.data) {
                setSudokuPuzzle(r.data.puzzle);
                setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row]));
                setSudokuStart(Date.now());
              }
            });
          }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83D\uDD22"}</div>
            <div className="font-black text-blue-400">Sudoku</div>
            <div className="text-xs text-gray-500 mt-1">4x4 · Bis zu 75 Pts</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>Spielen</div>
          </button>
          {/* 9x9 Sudoku */}
          <button onClick={() => {
            setActiveMinigame("sudoku9"); setS9Done(false); setS9Msg(null);
            api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=${s9Diff}`).then((r: any) => {
              if (r.data) { setS9Puzzle(r.data.puzzle); setS9Grid(r.data.puzzle.map((row: number[]) => [...row])); setS9Start(Date.now()); }
            });
          }} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(234,179,8,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(234,179,8,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83E\uDDE9"}</div>
            <div className="font-black text-yellow-400">Sudoku 9x9</div>
            <div className="text-xs text-gray-500 mt-1">Bis zu 15K Pts!</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(234,179,8,0.2)", color: "#eab308" }}>Spielen</div>
          </button>
          {/* Roulette */}
          <button onClick={() => { setActiveMinigame("roulette"); setRouletteResult(null); setRouletteBets([]); setRouletteMsg(null); }}
            className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,197,94,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83C\uDFB0"}</div>
            <div className="font-black text-green-400">Roulette</div>
            <div className="text-xs text-gray-500 mt-1">Nummer x36 · Farbe x2</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>Spielen</div>
          </button>
          {/* Poker */}
          <button onClick={() => { setActiveMinigame("poker"); setPokerHand(null); setPokerResult(null); setPokerMsg(null); setPokerSelected(new Set()); }}
            className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(220,38,38,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(220,38,38,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83C\uDCCF"}</div>
            <div className="font-black text-red-400">Poker</div>
            <div className="text-xs text-gray-500 mt-1">5-Card Draw vs Haus</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(220,38,38,0.2)", color: "#f87171" }}>Spielen</div>
          </button>
          {/* Over/Under */}
          <button onClick={() => setActiveMinigame("overunder")} className="rounded-2xl p-5 text-center transition-all hover:scale-105" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.12), rgba(0,0,0,0.3))", border: "1px solid rgba(34,211,238,0.3)" }}>
            <div className="text-4xl mb-2">{"\uD83C\uDFAF"}</div>
            <div className="font-black text-cyan-400">Druber/Drunter</div>
            <div className="text-xs text-gray-500 mt-1">Uber/Unter 7? x2!</div>
            <div className="mt-3 text-xs font-bold px-4 py-1.5 rounded-lg inline-block" style={{ background: "rgba(34,211,238,0.2)", color: "#22d3ee" }}>Spielen</div>
          </button>
        </div>
      </div>

      {/* ── Snake Modal ── */}
      {activeMinigame === "snake" && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 35, background: "rgba(0,0,0,0.85)" }}>
          <div className="relative rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: "linear-gradient(180deg, #1a1a2e, #0a0a14)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <button onClick={() => { setActiveMinigame(null); if (snakeTimerRef.current) clearInterval(snakeTimerRef.current); snakeRef.current.running = false; }} className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl font-bold">✕</button>
            <h3 className="font-black text-xl text-green-400 text-center mb-1">{"\uD83D\uDC0D"} Snake</h3>
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
                <div className="text-sm text-gray-400">Score: <span className="text-green-400 font-bold">{snakeScore}</span> Apfel</div>
                {snakeSubmitted ? (
                  <div className="text-sm text-green-400 font-bold">+{snakePoints} Punkte erhalten!</div>
                ) : (
                  <button onClick={submitSnake} className="px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>Punkte einlosen</button>
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
            <h3 className="font-black text-xl text-red-400 text-center mb-3">{"\uD83D\uDD34"} 4 Gewinnt</h3>
            {connect4Msg && <div className="text-center text-sm text-yellow-400 mb-2">{connect4Msg}</div>}
            {(!connect4 || connect4.status === "finished") && (
              <div className="text-center space-y-3">
                {connect4?.status === "finished" && (
                  <div className="mb-3">
                    <div className={`text-lg font-bold ${connect4.winner === "draw" ? "text-yellow-400" : connect4.winner === user?.twitchId ? "text-green-400" : "text-red-400"}`}>
                      {connect4.winner === "draw" ? "Unentschieden! Einsatze zuruck." : connect4.winner === user?.twitchId ? `Gewonnen! +${connect4.bet * 2} Pts!` : "Verloren!"}
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-400">Einsatz wahlen:</div>
                <div className="flex items-center justify-center gap-2">
                  <input type="number" min={5} value={connect4Bet} onChange={(e) => setConnect4Bet(Math.max(5, parseInt(e.target.value) || 5))} className="w-20 px-3 py-2 rounded-lg bg-gray-800 text-white text-center border border-gray-700 text-sm" />
                  <span className="text-xs text-gray-500">Pts</span>
                </div>
                <button onClick={createConnect4Game} disabled={connect4Loading} className="px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: connect4Loading ? "#666" : "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  Herausforderung erstellen
                </button>
              </div>
            )}
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
                <div className="flex justify-center gap-1 mb-1">
                  {Array.from({ length: 7 }).map((_, c) => (
                    <button key={c} onClick={() => playConnect4Move(c)} className="w-10 h-6 rounded text-xs font-bold hover:bg-gray-700 transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>▼</button>
                  ))}
                </div>
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
            <h3 className="font-black text-xl text-purple-400 text-center mb-1">{"\uD83E\uDDE0"} Memory</h3>
            <div className="text-center text-sm text-gray-400 mb-3">
              Zuge: <span className="text-purple-400 font-bold">{memoryMoves}</span>
              {memoryStartTime > 0 && !memoryComplete && <span className="ml-3">Zeit: <MemoryTimer start={memoryStartTime} /></span>}
              {memoryComplete && <span className="ml-3">Zeit: <span className="text-purple-400 font-bold">{((Date.now() - memoryStartTime) / 1000).toFixed(1)}s</span></span>}
            </div>
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

      {/* ── Sudoku Modal ── */}
      {activeMinigame === "sudoku" && sudokuPuzzle && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #0a0a1a, #000)", border: "2px solid rgba(59,130,246,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-blue-400">{"\uD83D\uDD22"} Sudoku 4x4</h3>
              <button onClick={() => { setActiveMinigame(null); setSudokuPuzzle(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {!sudokuDone && (
              <div className="flex justify-center gap-2 mb-3">
                {(["easy", "medium", "hard"] as const).map(d => (
                  <button key={d} onClick={() => {
                    setSudokuDiff(d); setSudokuDone(false); setSudokuMsg(null);
                    api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${d}`).then((r: any) => {
                      if (r.data) { setSudokuPuzzle(r.data.puzzle); setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row])); setSudokuStart(Date.now()); }
                    });
                  }} className={`text-xs px-3 py-1 rounded-full font-bold ${sudokuDiff === d ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-300"}`}>
                    {d === "easy" ? "Leicht (10)" : d === "medium" ? "Mittel (25)" : "Schwer (50)"}
                  </button>
                ))}
              </div>
            )}
            {sudokuMsg && <p className={`text-sm mb-2 font-bold ${sudokuMsg.includes("+") ? "text-green-400" : sudokuMsg.includes("Falsch") ? "text-red-400" : "text-blue-400"}`}>{sudokuMsg}</p>}
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
                const allFilled = sudokuGrid.every(row => row.every(v => v > 0));
                if (!allFilled) { setSudokuMsg("Fulle alle Felder aus!"); return; }
                const sz = sudokuGrid.length; const bx = sz === 9 ? 3 : 2; let ok = true;
                for (let r = 0; r < sz && ok; r++) { if (new Set(sudokuGrid[r]).size !== sz) ok = false; }
                for (let c = 0; c < sz && ok; c++) { if (new Set(sudokuGrid.map(row => row[c])).size !== sz) ok = false; }
                for (let br = 0; br < sz && ok; br += bx) for (let bc = 0; bc < sz && ok; bc += bx) {
                  const s = new Set<number>(); for (let r = br; r < br + bx; r++) for (let c = bc; c < bc + bx; c++) s.add(sudokuGrid[r]![c]!); if (s.size !== sz) ok = false;
                }
                if (!ok) { setSudokuMsg("❌ Falsch! Versuche es nochmal."); casinoSounds.loss(); return; }
                const timeMs = Date.now() - sudokuStart;
                const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku/submit`, { difficulty: sudokuDiff, timeMs }) as any;
                if (res.success) {
                  setSudokuDone(true);
                  setSudokuMsg(`✅ Gelost in ${(timeMs/1000).toFixed(1)}s! +${res.data.points} Pts!`);
                  casinoSounds.questComplete(); fetchPoints();
                } else { setSudokuMsg(res.error ?? "Fehler!"); }
              }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black" style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}>
                ✅ Prufen
              </button>
            ) : (
              <button onClick={() => {
                setSudokuDone(false); setSudokuMsg(null);
                api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=${sudokuDiff}`).then((r: any) => {
                  if (r.data) { setSudokuPuzzle(r.data.puzzle); setSudokuGrid(r.data.puzzle.map((row: number[]) => [...row])); setSudokuStart(Date.now()); }
                });
              }} className="casino-btn px-8 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}>
                {"\uD83D\uDD04"} Nochmal
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 9x9 Sudoku Modal ── */}
      {activeMinigame === "sudoku9" && s9Puzzle && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-4 text-center max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, #0a0a1a, #000)", border: "2px solid rgba(234,179,8,0.4)" }}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-lg text-yellow-400">{"\uD83E\uDDE9"} Sudoku 9x9</h3>
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
                if (s9Grid.some(row => row.some(v => !v || v < 1 || v > 9))) { setS9Msg("Fulle alle Felder!"); return; }
                let ok = true;
                for (let r = 0; r < 9 && ok; r++) { if (new Set(s9Grid[r]).size !== 9) ok = false; }
                for (let c = 0; c < 9 && ok; c++) { if (new Set(s9Grid.map(row => row[c])).size !== 9) ok = false; }
                for (let br = 0; br < 9 && ok; br += 3) for (let bc = 0; bc < 9 && ok; bc += 3) {
                  const s = new Set<number>(); for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) s.add(s9Grid[r]![c]!); if (s.size !== 9) ok = false;
                }
                if (!ok) { setS9Msg("❌ Falsch!"); casinoSounds.loss(); return; }
                const timeMs = Date.now() - s9Start;
                const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku9/submit`, { submitted: s9Grid, difficulty: s9Diff, timeMs }) as any;
                if (res.success) { setS9Done(true); setS9Msg(`✅ Gelost in ${(timeMs/1000).toFixed(0)}s! +${formatNumber(res.data.points)} Pts!`); casinoSounds.jackpot(); fetchPoints(); }
                else setS9Msg(res.error ?? "Fehler!");
              }} className="casino-btn px-6 py-2 rounded-xl font-black text-black" style={{ background: "linear-gradient(135deg, #eab308, #ca8a04)" }}>
                ✅ Prufen
              </button>
            ) : (
              <button onClick={() => {
                setS9Done(false); setS9Msg(null);
                api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=${s9Diff}`).then((r: any) => {
                  if (r.data) { setS9Puzzle(r.data.puzzle); setS9Grid(r.data.puzzle.map((row: number[]) => [...row])); setS9Start(Date.now()); }
                });
              }} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.4)" }}>
                {"\uD83D\uDD04"} Nochmal
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Roulette Modal ── */}
      {activeMinigame === "roulette" && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-5 text-center max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, #0a1a0a, #000)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-green-400">{"\uD83C\uDFB0"} Roulette</h3>
              <button onClick={() => setActiveMinigame(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {rouletteMsg && <p className={`text-sm mb-2 font-bold ${rouletteMsg.includes("+") ? "text-green-400" : "text-red-400"}`}>{rouletteMsg}</p>}
            {rouletteResult && (
              <div className="mb-3">
                <div className={`text-5xl font-black mb-1 ${rouletteResult.color === "red" ? "text-red-500" : rouletteResult.color === "black" ? "text-white" : "text-green-500"}`}>
                  {rouletteResult.result}
                </div>
                <div className="text-lg">{rouletteResult.color === "red" ? "\uD83D\uDD34 Rot" : rouletteResult.color === "black" ? "⚫ Schwarz" : "\uD83D\uDFE2 Grun (0)"}</div>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-gray-500 text-xs">Pro Wette:</span>
              <input type="number" min={5} value={rouletteBet} onChange={e => setRouletteBet(Math.max(5, +e.target.value))} className="w-20 bg-black/40 border border-green-500/30 rounded-lg px-2 py-1 text-center text-white text-sm" />
            </div>
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
            <div className="space-y-2 mb-3">
              <div className="flex justify-center gap-1">
                <button onClick={() => rouletteBets.length < 5 && setRouletteBets([...rouletteBets, { type: "red" }])} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white">{"\uD83D\uDD34"} Rot x2</button>
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
              <div className="flex justify-center gap-1 items-center">
                <span className="text-xs text-gray-500">Nummer:</span>
                <input type="number" min={0} max={36} defaultValue={7} id="roulette-num" className="w-14 bg-black/40 border border-green-500/30 rounded-lg px-1 py-1 text-center text-white text-xs" />
                <button onClick={() => {
                  const num = parseInt((document.getElementById("roulette-num") as HTMLInputElement).value);
                  if (num >= 0 && num <= 36 && rouletteBets.length < 5) setRouletteBets([...rouletteBets, { type: "number", value: num }]);
                }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white">x36</button>
              </div>
            </div>
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
              {rouletteSpinning ? "DREHT..." : `\uD83C\uDFB0 DREHEN (${formatNumber(rouletteBet * rouletteBets.length)} Pts)`}
            </button>
            <p className="text-[10px] text-gray-600 mt-2">Max 5 Wetten gleichzeitig · 0 = Grun (Haus)</p>
          </div>
        </div>
      )}

      {/* ── Poker Modal ── */}
      {activeMinigame === "poker" && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-md w-full mx-4" style={{ background: "linear-gradient(180deg, #1a0a0a, #000)", border: "2px solid rgba(220,38,38,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-red-400">{"\uD83C\uDCCF"} Poker vs Haus</h3>
              <button onClick={() => { setActiveMinigame(null); setPokerHand(null); setPokerResult(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {pokerMsg && <p className={`text-sm mb-2 font-bold ${pokerMsg.includes("Gewonnen") || pokerMsg.includes("+") ? "text-green-400" : pokerMsg.includes("verliert") || pokerMsg.includes("Haus") ? "text-red-400" : "text-yellow-400"}`}>{pokerMsg}</p>}
            {!pokerHand && !pokerResult ? (
              <div>
                <p className="text-gray-400 text-sm mb-3">5-Card Draw Poker gegen das Haus. Bis zu 3 Karten tauschen!</p>
                <div className="text-xs text-gray-600 mb-3 grid grid-cols-2 gap-1">
                  <span>Royal Flush: x101</span><span>Straight Flush: x51</span>
                  <span>Vierling: x26</span><span>Full House: x10</span>
                  <span>Flush: x7</span><span>Strasse: x5</span>
                  <span>Drilling: x4</span><span>Zwei Paare: x3</span>
                  <span>Ein Paar: x2</span><span>Hochste Karte: Haus muss schlagen</span>
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
                  {"\uD83C\uDCCF"} Austeilen ({formatNumber(pokerBet)} Pts)
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
                  {pokerSelected.size > 0 ? `\uD83D\uDD04 ${pokerSelected.size} Tauschen` : "✋ Behalten"}
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
                  {"\uD83D\uDD04"} Nochmal
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Dice 21 Modal ── */}
      {activeMinigame === "dice21" && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #1a0f00, #000)", border: "2px solid rgba(251,146,60,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-orange-400">{"\uD83C\uDFB2"} Wurfel 21</h3>
              <button onClick={() => { setActiveMinigame(null); setD21(null); setD21Msg(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {d21Msg && <p className={`text-sm mb-2 font-bold ${d21Msg.includes("+") || d21Msg.includes("Gewonnen") ? "text-green-400" : d21Msg.includes("BUST") || d21Msg.includes("verloren") || d21Msg.includes("Haus") ? "text-red-400" : "text-yellow-400"}`}>{d21Msg}</p>}
            {!d21 || d21.finished ? (
              <div>
                <p className="text-gray-400 text-sm mb-3">Wurfle gegen das Haus! Naher an 21 gewinnt.</p>
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  <p>Du wurfelst → dann wurfelt das Haus (stoppt bei 15+)</p>
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
                  {"\uD83C\uDFB2"} Wurfeln! ({formatNumber(d21Bet)} Pts)
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">Deine Wurfel:</p>
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
                    {"\uD83C\uDFB2"} NOCH EINS
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
                    ✋ STOPP (Haus wurfelt)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Over/Under Modal ── */}
      {activeMinigame === "overunder" && (
        <div className="fixed inset-0 z-[35] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 text-center max-w-sm w-full mx-4" style={{ background: "linear-gradient(180deg, #001a1a, #000)", border: "2px solid rgba(34,211,238,0.4)" }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg text-cyan-400">{"\uD83C\uDFAF"} Druber / Drunter</h3>
              <button onClick={() => { setActiveMinigame(null); setOuResult(null); setOuMsg(null); }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-gray-400 text-xs mb-3">2 Wurfel (2-12) — ist die Summe uber oder unter 7?</p>
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
              {([["under", "⬇️ DRUNTER", "x2"], ["seven", "7️⃣ GENAU 7", "x5"], ["over", "⬆️ DRUBER", "x2"]] as const).map(([guess, label, mult]) => (
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
            <p className="text-[10px] text-gray-600 mt-2">Unter 7: x2 · Uber 7: x2 · Genau 7: x5 · 7 bei Druber/Drunter: verloren</p>
          </div>
        </div>
      )}
    </>
  );
}
