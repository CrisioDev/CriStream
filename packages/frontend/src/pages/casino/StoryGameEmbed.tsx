import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/client";
import { casinoSounds } from "@/lib/casino-sounds";

interface StoryGameEmbedProps {
  gameType: string;
  channelName: string;
  onComplete: (won: boolean) => void;
  description?: string;
}

// ── Memory Timer ──
function MemoryTimer({ start }: { start: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(iv);
  }, [start]);
  return <span className="text-purple-400 font-bold">{(elapsed / 1000).toFixed(1)}s</span>;
}

export function StoryGameEmbed({ gameType, channelName, onComplete, description }: StoryGameEmbedProps) {
  const [result, setResult] = useState<{ text: string; win: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-report result to story after showing it briefly
  const reportResult = useCallback((won: boolean, text: string) => {
    setResult({ text, win: won });
    if (won) casinoSounds.win();
    else casinoSounds.loss();
    setTimeout(() => onComplete(won), 1500);
  }, [onComplete]);

  // ── FLIP ──
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState<string | null>(null);

  const playFlip = async () => {
    if (loading) return;
    setLoading(true);
    setCoinFlipping(true);
    setCoinSide(null);
    setResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "flip" }) as any;
      setTimeout(() => {
        setCoinFlipping(false);
        if (res.data) {
          setCoinSide(res.data.side);
          reportResult(res.data.payout > 0, res.data.label);
        } else {
          reportResult(false, res.error ?? "Fehler!");
        }
        setLoading(false);
      }, 1000);
    } catch {
      setCoinFlipping(false);
      reportResult(false, "Fehler!");
      setLoading(false);
    }
  };

  // ── SLOTS ──
  const [slotReels, setSlotReels] = useState(["❓", "❓", "❓"]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const slotIntervalRef = useRef<any>(null);

  const playSlots = async () => {
    if (loading) return;
    setLoading(true);
    setSlotSpinning(true);
    setResult(null);
    const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
    slotIntervalRef.current = setInterval(() => {
      setSlotReels([
        symbols[Math.floor(Math.random() * symbols.length)]!,
        symbols[Math.floor(Math.random() * symbols.length)]!,
        symbols[Math.floor(Math.random() * symbols.length)]!,
      ]);
    }, 80);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "slots" }) as any;
      setTimeout(() => {
        clearInterval(slotIntervalRef.current);
        setSlotSpinning(false);
        if (res.data) {
          setSlotReels(res.data.reels);
          reportResult(res.data.payout > 0, res.data.label);
        } else {
          reportResult(false, res.error ?? "Fehler!");
        }
        setLoading(false);
      }, 1500);
    } catch {
      clearInterval(slotIntervalRef.current);
      setSlotSpinning(false);
      reportResult(false, "Fehler!");
      setLoading(false);
    }
  };

  useEffect(() => { return () => { if (slotIntervalRef.current) clearInterval(slotIntervalRef.current); }; }, []);

  // ── SCRATCH ──
  const [scratchCards, setScratchCards] = useState(["❓", "❓", "❓"]);
  const [scratchRevealed, setScratchRevealed] = useState([false, false, false]);

  const playScratch = async () => {
    if (loading) return;
    setLoading(true);
    setScratchCards(["❓", "❓", "❓"]);
    setScratchRevealed([false, false, false]);
    setResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game: "scratch" }) as any;
      if (res.data) {
        const symbols = res.data.symbols;
        setTimeout(() => { setScratchCards(prev => { const n = [...prev]; n[0] = symbols[0]; return n; }); setScratchRevealed(prev => { const n = [...prev]; n[0] = true; return n; }); casinoSounds.reveal(); }, 400);
        setTimeout(() => { setScratchCards(prev => { const n = [...prev]; n[1] = symbols[1]; return n; }); setScratchRevealed(prev => { const n = [...prev]; n[1] = true; return n; }); casinoSounds.reveal(); }, 900);
        setTimeout(() => {
          setScratchCards(symbols);
          setScratchRevealed([true, true, true]);
          casinoSounds.reveal();
          reportResult(res.data.payout > 0, res.data.label);
          setLoading(false);
        }, 1400);
      } else {
        reportResult(false, res.error ?? "Fehler!");
        setLoading(false);
      }
    } catch {
      reportResult(false, "Fehler!");
      setLoading(false);
    }
  };

  // ── DICE 21 ──
  const [d21, setD21] = useState<{ total: number; rolls: number[]; bet: number; finished: boolean } | null>(null);
  const [d21Msg, setD21Msg] = useState<string | null>(null);

  const startDice21 = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setD21Msg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/start`, { bet: 10 }) as any;
      if (res.success) {
        setD21({ total: res.data.total, rolls: res.data.rolls, bet: 10, finished: false });
      } else { setD21Msg(res.error ?? "Fehler!"); }
    } catch { setD21Msg("Fehler!"); }
    setLoading(false);
  };

  const hitDice21 = async () => {
    if (loading || !d21) return;
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/hit`, {}) as any;
      if (res.success) {
        if (res.data.bust) {
          setD21({ ...d21, total: res.data.total, rolls: res.data.rolls, finished: true });
          reportResult(false, `💥 BUST! ${res.data.total} > 21`);
        } else if (res.data.total === 21) {
          setD21({ ...d21, total: 21, rolls: res.data.rolls, finished: true });
          reportResult(true, `🎯 BLACKJACK! 21! x3`);
        } else {
          setD21({ ...d21, total: res.data.total, rolls: res.data.rolls });
        }
      }
    } catch { setD21Msg("Fehler!"); }
    setLoading(false);
  };

  const standDice21 = async () => {
    if (loading || !d21) return;
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/dice21/stand`, {}) as any;
      if (res.success) {
        setD21({ ...d21, finished: true });
        const d = res.data;
        if (d.playerWins) {
          reportResult(true, `✅ Gewonnen! ${d.playerTotal} vs ${d.houseTotal}${d.houseBust ? " (Bust)" : ""}`);
        } else {
          reportResult(false, `❌ Haus gewinnt! ${d.playerTotal} vs ${d.houseTotal}`);
        }
      }
    } catch { setD21Msg("Fehler!"); }
    setLoading(false);
  };

  // ── POKER ──
  const [pokerHand, setPokerHand] = useState<any[] | null>(null);
  const [pokerSelected, setPokerSelected] = useState<Set<number>>(new Set());
  const [pokerResult, setPokerResult] = useState<any>(null);
  const [pokerMsg, setPokerMsg] = useState<string | null>(null);

  const startPoker = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setPokerResult(null);
    setPokerSelected(new Set());
    setPokerMsg(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/poker/start`, { bet: 10 }) as any;
      if (res.success) {
        setPokerHand(res.data.playerHand);
      } else { setPokerMsg(res.error ?? "Fehler!"); }
    } catch { setPokerMsg("Fehler!"); }
    setLoading(false);
  };

  const drawPoker = async () => {
    if (loading || !pokerHand) return;
    setLoading(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/poker/draw`, { discardIndices: [...pokerSelected] }) as any;
      if (res.success) {
        setPokerHand(res.data.playerHand);
        setPokerResult(res.data);
        reportResult(res.data.playerWins, res.data.playerWins
          ? `✅ ${res.data.playerRank} — Gewonnen!`
          : `❌ ${res.data.playerRank} vs ${res.data.houseRank}`);
      }
    } catch { setPokerMsg("Fehler!"); }
    setLoading(false);
  };

  // ── ROULETTE ──
  const [rouletteBets, setRouletteBets] = useState<any[]>([]);
  const [rouletteResult, setRouletteResult] = useState<any>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);

  const addRouletteBet = (bet: any) => {
    if (rouletteBets.length >= 5) return;
    setRouletteBets(prev => [...prev, bet]);
  };

  const spinRoulette = async () => {
    if (loading || rouletteBets.length === 0) return;
    setLoading(true);
    setRouletteSpinning(true);
    setResult(null);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/roulette`, { betAmount: 10, bets: rouletteBets }) as any;
      setTimeout(() => {
        setRouletteSpinning(false);
        if (res.success) {
          setRouletteResult(res.data);
          reportResult(res.data.totalProfit > 0, res.data.totalProfit > 0
            ? `✅ ${res.data.result} — +${res.data.totalPayout} Pts!`
            : `❌ ${res.data.result} — Verloren!`);
        }
        setLoading(false);
      }, 1500);
    } catch {
      setRouletteSpinning(false);
      reportResult(false, "Fehler!");
      setLoading(false);
    }
  };

  // ── MEMORY ──
  const MEMORY_EMOJIS = ["🎰", "🎲", "🃏", "💎", "🍀", "🔥", "⭐", "🎁"];
  const [memoryCards, setMemoryCards] = useState<{ emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryStartTime, setMemoryStartTime] = useState(0);
  const [memoryComplete, setMemoryComplete] = useState(false);
  const memoryLockRef = useRef(false);

  const startMemory = useCallback(() => {
    const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    setMemoryCards(pairs.map(emoji => ({ emoji: emoji!, flipped: false, matched: false })));
    setMemoryFlipped([]);
    setMemoryMoves(0);
    setMemoryComplete(false);
    setMemoryStartTime(Date.now());
    memoryLockRef.current = false;
  }, []);

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
              const timeMs = Date.now() - memoryStartTime;
              api.post<any>(`/viewer/${channelName}/casino/minigame/memory/submit`, { pairs: 8, timeMs, moves: newMoves });
              reportResult(true, `Alle Paare gefunden in ${(timeMs / 1000).toFixed(1)}s!`);
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

  // ── SNAKE ──
  const snakeRef = useRef<{ dir: { x: number; y: number }; snake: { x: number; y: number }[]; apple: { x: number; y: number }; score: number; running: boolean }>({
    dir: { x: 1, y: 0 }, snake: [{ x: 10, y: 10 }], apple: { x: 15, y: 10 }, score: 0, running: false
  });
  const snakeTimerRef = useRef<any>(null);
  const snakeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeGameOver, setSnakeGameOver] = useState(false);

  const drawSnake = useCallback(() => {
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
  }, []);

  const endSnake = useCallback(() => {
    const g = snakeRef.current;
    g.running = false;
    if (snakeTimerRef.current) { clearInterval(snakeTimerRef.current); snakeTimerRef.current = null; }
    setSnakeGameOver(true);
    drawSnake();
    const score = g.score;
    api.post<any>(`/viewer/${channelName}/casino/minigame/snake/submit`, { score });
    reportResult(score >= 5, score >= 5 ? `🐍 Score: ${score} — Gut gemacht!` : `🐍 Score: ${score} — Zu wenig!`);
  }, [channelName, drawSnake, reportResult]);

  const startSnake = useCallback(() => {
    setSnakeScore(0);
    setSnakeGameOver(false);
    setResult(null);
    const g = snakeRef.current;
    g.snake = [{ x: 10, y: 10 }];
    g.dir = { x: 1, y: 0 };
    g.apple = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    g.score = 0;
    g.running = true;
    if (snakeTimerRef.current) clearInterval(snakeTimerRef.current);
    // Using a function reference instead of inline to avoid stale closure
    const tick = () => {
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
      } else { g.snake.pop(); }
      drawSnake();
    };
    snakeTimerRef.current = setInterval(tick, 120);
    drawSnake();
  }, [drawSnake, endSnake]);

  // Snake keyboard
  useEffect(() => {
    if (gameType !== "snake") return;
    const handler = (e: KeyboardEvent) => {
      if (!snakeRef.current.running) return;
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
  }, [gameType]);

  useEffect(() => { return () => { if (snakeTimerRef.current) clearInterval(snakeTimerRef.current); }; }, []);

  // ── SUDOKU 4x4 ──
  const [sudokuPuzzle, setSudokuPuzzle] = useState<(number | 0)[][] | null>(null);
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>([]);
  const [sudokuStart, setSudokuStart] = useState(0);
  const [sudokuMsg, setSudokuMsg] = useState<string | null>(null);

  const loadSudoku4 = async () => {
    setResult(null);
    setSudokuMsg(null);
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku?difficulty=medium`) as any;
      if (res.data) {
        setSudokuPuzzle(res.data.puzzle);
        setSudokuGrid(res.data.puzzle.map((row: number[]) => [...row]));
        setSudokuStart(Date.now());
      }
    } catch { setSudokuMsg("Fehler beim Laden!"); }
  };

  const checkSudoku4 = async () => {
    if (!sudokuPuzzle) return;
    const allFilled = sudokuGrid.every(row => row.every(v => v > 0));
    if (!allFilled) { setSudokuMsg("Fülle alle Felder aus!"); return; }
    let ok = true;
    for (let r = 0; r < 4 && ok; r++) { if (new Set(sudokuGrid[r]).size !== 4) ok = false; }
    for (let c = 0; c < 4 && ok; c++) { if (new Set(sudokuGrid.map(row => row[c])).size !== 4) ok = false; }
    for (let br = 0; br < 4 && ok; br += 2) for (let bc = 0; bc < 4 && ok; bc += 2) {
      const s = new Set<number>(); for (let r = br; r < br + 2; r++) for (let c = bc; c < bc + 2; c++) s.add(sudokuGrid[r]![c]!);
      if (s.size !== 4) ok = false;
    }
    if (!ok) { setSudokuMsg("❌ Falsch! Versuche es nochmal."); casinoSounds.loss(); return; }
    const timeMs = Date.now() - sudokuStart;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku/submit`, { difficulty: "medium", timeMs }) as any;
      if (res.success) {
        reportResult(true, `✅ Gelöst in ${(timeMs / 1000).toFixed(1)}s! +${res.data.points} Pts!`);
        casinoSounds.questComplete();
      } else { setSudokuMsg(res.error ?? "Fehler!"); }
    } catch { setSudokuMsg("Fehler!"); }
  };

  // ── SUDOKU 9x9 ──
  const [s9Puzzle, setS9Puzzle] = useState<(number | 0)[][] | null>(null);
  const [s9Grid, setS9Grid] = useState<number[][]>([]);
  const [s9Start, setS9Start] = useState(0);
  const [s9Msg, setS9Msg] = useState<string | null>(null);

  const loadSudoku9 = async () => {
    setResult(null);
    setS9Msg(null);
    try {
      const res = await api.get<any>(`/viewer/${channelName}/casino/minigame/sudoku9?difficulty=medium`) as any;
      if (res.data) {
        setS9Puzzle(res.data.puzzle);
        setS9Grid(res.data.puzzle.map((row: number[]) => [...row]));
        setS9Start(Date.now());
      }
    } catch { setS9Msg("Fehler beim Laden!"); }
  };

  const checkSudoku9 = async () => {
    if (!s9Puzzle) return;
    if (s9Grid.some(row => row.some(v => !v || v < 1 || v > 9))) { setS9Msg("Fülle alle Felder!"); return; }
    let ok = true;
    for (let r = 0; r < 9 && ok; r++) { if (new Set(s9Grid[r]).size !== 9) ok = false; }
    for (let c = 0; c < 9 && ok; c++) { if (new Set(s9Grid.map(row => row[c])).size !== 9) ok = false; }
    for (let br = 0; br < 9 && ok; br += 3) for (let bc = 0; bc < 9 && ok; bc += 3) {
      const s = new Set<number>(); for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) s.add(s9Grid[r]![c]!);
      if (s.size !== 9) ok = false;
    }
    if (!ok) { setS9Msg("❌ Falsch!"); casinoSounds.loss(); return; }
    const timeMs = Date.now() - s9Start;
    try {
      const res = await api.post<any>(`/viewer/${channelName}/casino/minigame/sudoku9/submit`, { submitted: s9Grid, difficulty: "medium", timeMs }) as any;
      if (res.success) {
        reportResult(true, `✅ Gelöst in ${(timeMs / 1000).toFixed(0)}s! +${res.data.points} Pts!`);
        casinoSounds.jackpot();
      } else { setS9Msg(res.error ?? "Fehler!"); }
    } catch { setS9Msg("Fehler!"); }
  };

  // ── ALL-IN (story version — simulated, no real risk) ──
  const [allInPlaying, setAllInPlaying] = useState(false);

  const playAllIn = async () => {
    if (loading) return;
    setLoading(true);
    setAllInPlaying(true);
    setResult(null);
    // Simulated: 50/50 for story mode
    setTimeout(() => {
      const won = Math.random() < 0.5;
      setAllInPlaying(false);
      reportResult(won, won ? "✅ ALL-IN Gewonnen!" : "❌ ALL-IN Verloren!");
      setLoading(false);
    }, 2000);
  };

  // ── Auto-init for some games ──
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    if (gameType === "memory") startMemory();
    if (gameType === "sudoku4") loadSudoku4();
    if (gameType === "sudoku9") loadSudoku9();
    if (gameType === "snake") setTimeout(startSnake, 200);
  }, [gameType, initialized]);

  // Result display
  if (result) {
    return (
      <div className={`rounded-xl p-4 text-center ${result.win ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
        <div className={`text-lg font-black ${result.win ? "text-green-400" : "text-red-400"}`}>
          {result.text}
        </div>
        <p className="text-xs text-gray-500 mt-1">{result.win ? "Weiter geht's!" : "Versuch's nochmal..."}</p>
      </div>
    );
  }

  // ── FLIP UI ──
  if (gameType === "flip") {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl mb-2" style={coinFlipping ? { animation: "coin-flip 1s ease-in-out" } : undefined}>
          {coinSide === "Kopf" ? "👑" : coinSide === "Zahl" ? "🔢" : "🪙"}
        </div>
        <button onClick={playFlip} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
          style={{ background: loading ? "#666" : "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
          {loading ? "..." : "🪙 WERFEN!"}
        </button>
      </div>
    );
  }

  // ── SLOTS UI ──
  if (gameType === "slots") {
    return (
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-2">
          {slotReels.map((s, i) => (
            <div key={i} className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black"
              style={{ background: "rgba(145,71,255,0.1)", border: "2px solid rgba(145,71,255,0.3)", animation: slotSpinning ? "slot-glow 0.5s ease-in-out infinite" : undefined }}>
              {s}
            </div>
          ))}
        </div>
        <button onClick={playSlots} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
          style={{ background: loading ? "#666" : "linear-gradient(135deg, #9147ff, #6d28d9)" }}>
          {loading ? "..." : "🎰 SPIN!"}
        </button>
      </div>
    );
  }

  // ── SCRATCH UI ──
  if (gameType === "scratch") {
    return (
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-2">
          {scratchCards.map((s, i) => (
            <div key={i} className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black ${scratchRevealed[i] ? "scratch-pop" : ""}`}
              style={{ background: scratchRevealed[i] ? "rgba(255,215,0,0.1)" : "repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 5px, transparent 5px, transparent 10px)",
                border: `2px solid ${scratchRevealed[i] ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)"}` }}>
              {s}
            </div>
          ))}
        </div>
        <button onClick={playScratch} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
          style={{ background: loading ? "#666" : "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
          {loading ? "..." : "🎟️ KRATZEN!"}
        </button>
      </div>
    );
  }

  // ── DICE 21 UI ──
  if (gameType === "dice21") {
    if (!d21) {
      return (
        <div className="text-center">
          <button onClick={startDice21} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
            style={{ background: loading ? "#666" : "linear-gradient(135deg, #fb923c, #ea580c)" }}>
            {loading ? "..." : "🎲 Würfeln starten!"}
          </button>
          {d21Msg && <p className="text-sm text-red-400 mt-2">{d21Msg}</p>}
        </div>
      );
    }
    return (
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-1 flex-wrap">
          {d21.rolls.map((r, i) => (
            <div key={i} className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black bg-orange-500/20 border border-orange-500/30 text-orange-300">{r}</div>
          ))}
        </div>
        <div className="text-2xl font-black text-white">{d21.total} <span className="text-gray-500">/ 21</span></div>
        {!d21.finished && (
          <div className="flex justify-center gap-2">
            <button onClick={hitDice21} disabled={loading} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
              🎲 NOCH EINS
            </button>
            <button onClick={standDice21} disabled={loading} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
              ✋ STOPP
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── POKER UI ──
  if (gameType === "poker") {
    if (!pokerHand) {
      return (
        <div className="text-center">
          <button onClick={startPoker} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
            style={{ background: loading ? "#666" : "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            {loading ? "..." : "🃏 Austeilen!"}
          </button>
          {pokerMsg && <p className="text-sm text-red-400 mt-2">{pokerMsg}</p>}
        </div>
      );
    }
    return (
      <div className="text-center space-y-3">
        {pokerResult && (
          <div className="text-sm mb-2">
            <span className="text-gray-400">Haus: </span>
            <span className="text-red-300 font-bold">{pokerResult.houseRank}</span>
          </div>
        )}
        <div className="flex justify-center gap-1">
          {pokerHand.map((card: any, i: number) => (
            <button key={i} onClick={() => {
              if (pokerResult) return;
              setPokerSelected(prev => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i); else if (next.size < 3) next.add(i);
                return next;
              });
            }}
              className={`w-12 h-16 rounded-lg flex flex-col items-center justify-center text-sm font-black transition-all ${pokerSelected.has(i) ? "ring-2 ring-yellow-400 opacity-50" : ""}`}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: (card.suit === "♥" || card.suit === "♦") ? "#ef4444" : "#fff" }}>
              <span>{card.rank}</span>
              <span className="text-xs">{card.suit}</span>
            </button>
          ))}
        </div>
        {!pokerResult && (
          <button onClick={drawPoker} disabled={loading} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            {pokerSelected.size > 0 ? `🔄 ${pokerSelected.size} Tauschen` : "✋ Behalten"}
          </button>
        )}
      </div>
    );
  }

  // ── ROULETTE UI ──
  if (gameType === "roulette") {
    const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return (
      <div className="text-center space-y-3">
        {rouletteResult && (
          <div className={`text-4xl font-black ${rouletteResult.color === "red" ? "text-red-500" : rouletteResult.color === "black" ? "text-white" : "text-green-500"}`}>
            {rouletteResult.result}
          </div>
        )}
        {!rouletteResult && (
          <>
            <div className="flex flex-wrap justify-center gap-1">
              <button onClick={() => addRouletteBet({ type: "red" })} className="px-3 py-1 rounded text-xs font-bold bg-red-600/30 text-red-300 border border-red-500/30">🔴 Rot x2</button>
              <button onClick={() => addRouletteBet({ type: "black" })} className="px-3 py-1 rounded text-xs font-bold bg-gray-600/30 text-gray-300 border border-gray-500/30">⚫ Schwarz x2</button>
              <button onClick={() => addRouletteBet({ type: "even" })} className="px-3 py-1 rounded text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30">Gerade x2</button>
              <button onClick={() => addRouletteBet({ type: "odd" })} className="px-3 py-1 rounded text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30">Ungerade x2</button>
              <button onClick={() => addRouletteBet({ type: "high" })} className="px-3 py-1 rounded text-xs font-bold bg-yellow-600/30 text-yellow-300 border border-yellow-500/30">⬆️ 19-36 x2</button>
              <button onClick={() => addRouletteBet({ type: "low" })} className="px-3 py-1 rounded text-xs font-bold bg-cyan-600/30 text-cyan-300 border border-cyan-500/30">⬇️ 1-18 x2</button>
            </div>
            {rouletteBets.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {rouletteBets.map((b, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    {b.type === "number" ? `#${b.value}` : b.type}
                    <button onClick={() => setRouletteBets(rouletteBets.filter((_, j) => j !== i))} className="ml-1 text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <button onClick={spinRoulette} disabled={loading || rouletteBets.length === 0}
              className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black"
              style={{ background: (loading || rouletteBets.length === 0) ? "#666" : "linear-gradient(135deg, #22c55e, #16a34a)" }}>
              {rouletteSpinning ? "..." : `🎰 DREHEN!`}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── MEMORY UI ──
  if (gameType === "memory") {
    if (memoryCards.length === 0) {
      return (
        <div className="text-center">
          <button onClick={startMemory} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}>
            🧠 Memory starten!
          </button>
        </div>
      );
    }
    return (
      <div className="text-center space-y-3">
        <div className="text-sm text-gray-400">
          Züge: <span className="text-purple-400 font-bold">{memoryMoves}</span>
          {memoryStartTime > 0 && !memoryComplete && <span className="ml-3">Zeit: <MemoryTimer start={memoryStartTime} /></span>}
        </div>
        <div className="grid grid-cols-4 gap-1.5 max-w-[220px] mx-auto">
          {memoryCards.map((card, i) => (
            <button key={i} onClick={() => flipMemoryCard(i)}
              className="aspect-square rounded-lg text-xl flex items-center justify-center transition-all duration-300 font-bold"
              style={{
                background: card.matched ? "rgba(34,197,94,0.2)" : card.flipped ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                border: card.matched ? "1px solid rgba(34,197,94,0.4)" : card.flipped ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.1)",
                cursor: card.flipped || card.matched || memoryComplete ? "default" : "pointer",
              }}>
              {card.flipped || card.matched ? card.emoji : "❓"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── SNAKE UI ──
  if (gameType === "snake") {
    return (
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-400">Score: <span className="text-green-400 font-bold">{snakeScore}</span></div>
        <div className="flex justify-center">
          <canvas ref={snakeCanvasRef} width={300} height={300} className="rounded-xl"
            style={{ width: "min(300px, 70vw)", height: "min(300px, 70vw)", background: "#0a0a0a", border: "1px solid rgba(34,197,94,0.2)" }} />
        </div>
        {/* Mobile controls */}
        <div className="flex justify-center gap-1 md:hidden">
          <div className="grid grid-cols-3 gap-1" style={{ width: 100 }}>
            <div />
            <button onClick={() => { if (snakeRef.current.dir.y !== 1) snakeRef.current.dir = { x: 0, y: -1 }; }} className="bg-gray-800 rounded p-1.5 text-center text-white font-bold text-xs">▲</button>
            <div />
            <button onClick={() => { if (snakeRef.current.dir.x !== 1) snakeRef.current.dir = { x: -1, y: 0 }; }} className="bg-gray-800 rounded p-1.5 text-center text-white font-bold text-xs">◀</button>
            <button onClick={() => { if (snakeRef.current.dir.y !== -1) snakeRef.current.dir = { x: 0, y: 1 }; }} className="bg-gray-800 rounded p-1.5 text-center text-white font-bold text-xs">▼</button>
            <button onClick={() => { if (snakeRef.current.dir.x !== -1) snakeRef.current.dir = { x: 1, y: 0 }; }} className="bg-gray-800 rounded p-1.5 text-center text-white font-bold text-xs">▶</button>
          </div>
        </div>
        {snakeGameOver && (
          <button onClick={startSnake} className="px-4 py-1.5 rounded-xl font-bold text-xs text-white" style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}>Nochmal</button>
        )}
        {!snakeGameOver && <div className="text-[10px] text-gray-600">Pfeiltasten / WASD</div>}
      </div>
    );
  }

  // ── SUDOKU 4x4 UI ──
  if (gameType === "sudoku4") {
    if (!sudokuPuzzle) {
      return (
        <div className="text-center">
          <button onClick={loadSudoku4} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
            style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}>
            🔢 Sudoku laden!
          </button>
        </div>
      );
    }
    return (
      <div className="text-center space-y-3">
        {sudokuMsg && <p className={`text-sm font-bold ${sudokuMsg.includes("+") ? "text-green-400" : sudokuMsg.includes("Falsch") ? "text-red-400" : "text-blue-400"}`}>{sudokuMsg}</p>}
        <div className="inline-grid gap-0.5 mx-auto" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {sudokuGrid.map((row, r) => row.map((val, c) => {
            const isOriginal = sudokuPuzzle![r]![c] !== 0;
            return (
              <div key={`${r}-${c}`} className={`w-11 h-11 flex items-center justify-center text-base font-black rounded-lg ${isOriginal ? "bg-blue-500/20 text-blue-300" : val > 0 ? "bg-white/10 text-white" : "bg-white/5 text-gray-600"}`}
                style={{ border: `2px solid ${isOriginal ? "rgba(59,130,246,0.4)" : val > 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)"}`,
                  borderRight: c === 1 ? "3px solid rgba(59,130,246,0.5)" : undefined,
                  borderBottom: r === 1 ? "3px solid rgba(59,130,246,0.5)" : undefined }}>
                {isOriginal ? val : (
                  <select value={val || ""} onChange={e => {
                    const g = sudokuGrid.map(row => [...row]);
                    g[r]![c] = parseInt(e.target.value) || 0;
                    setSudokuGrid(g);
                  }} className="w-full h-full bg-transparent text-center text-base font-black appearance-none cursor-pointer" style={{ color: val > 0 ? "#fff" : "#666" }}>
                    <option value="">-</option>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
            );
          }))}
        </div>
        <button onClick={checkSudoku4} className="casino-btn px-6 py-2 rounded-xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}>
          ✅ Prüfen
        </button>
      </div>
    );
  }

  // ── SUDOKU 9x9 UI ──
  if (gameType === "sudoku9") {
    if (!s9Puzzle) {
      return (
        <div className="text-center">
          <button onClick={loadSudoku9} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-black"
            style={{ background: "linear-gradient(135deg, #eab308, #ca8a04)" }}>
            🧩 Sudoku 9x9 laden!
          </button>
        </div>
      );
    }
    return (
      <div className="text-center space-y-2">
        {s9Msg && <p className={`text-sm font-bold ${s9Msg.includes("+") ? "text-green-400" : s9Msg.includes("Falsch") ? "text-red-400" : "text-yellow-400"}`}>{s9Msg}</p>}
        <div className="inline-grid gap-[1px] mx-auto" style={{ gridTemplateColumns: "repeat(9, 1fr)" }}>
          {s9Grid.map((row, r) => row.map((val, c) => {
            const isOrig = s9Puzzle![r]![c] !== 0;
            return (
              <div key={`${r}-${c}`} className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${isOrig ? "bg-yellow-500/20 text-yellow-300" : val > 0 ? "bg-white/10 text-white" : "bg-white/5 text-gray-600"}`}
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
                  }} className="w-full h-full bg-transparent text-center text-xs font-bold appearance-none cursor-pointer" style={{ color: val > 0 ? "#fff" : "#666" }}>
                    <option value="">-</option>
                    {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
            );
          }))}
        </div>
        <button onClick={checkSudoku9} className="casino-btn px-6 py-2 rounded-xl font-black text-sm text-black" style={{ background: "linear-gradient(135deg, #eab308, #ca8a04)" }}>
          ✅ Prüfen
        </button>
      </div>
    );
  }

  // ── ALL-IN UI ──
  if (gameType === "allin") {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl mb-2" style={allInPlaying ? { animation: "allin-screen-shake 0.5s ease-in-out infinite" } : undefined}>
          {allInPlaying ? "💀" : "☠️"}
        </div>
        <p className="text-xs text-gray-400">{description || "Simuliertes All-In — kein echtes Risiko!"}</p>
        <button onClick={playAllIn} disabled={loading} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white allin-btn-pulse"
          style={{ background: loading ? "#666" : "linear-gradient(135deg, rgba(220,38,38,0.8), rgba(127,29,29,0.9))", border: "2px solid rgba(239,68,68,0.5)" }}>
          {loading ? "..." : "☠️ ALL-IN!"}
        </button>
      </div>
    );
  }

  // ── Fallback ──
  return (
    <div className="text-center text-gray-400 text-sm">
      <p>Unbekanntes Spiel: {gameType}</p>
    </div>
  );
}
