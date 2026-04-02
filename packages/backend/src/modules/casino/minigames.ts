import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

// ── Snake ──

export async function submitSnakeScore(
  channelId: string,
  userId: string,
  score: number
): Promise<{ points: number } | { error: string }> {
  // Validate
  if (!Number.isInteger(score) || score < 0) return { error: "Ungültiger Score" };
  const capped = Math.min(score, 50);

  // Cooldown 30s
  const cdKey = `cd:minigame:snake:${channelId}:${userId}`;
  const set = await redis.set(cdKey, "1", "EX", 30, "NX");
  if (!set) return { error: "Cooldown! Warte 30 Sekunden." };

  // Award points
  if (capped > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: capped } },
    });
  }

  // Log to feed
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  const entry = JSON.stringify({
    user: cu?.displayName ?? "???",
    game: "snake",
    payout: capped,
    profit: capped,
    detail: `🐍 Snake: ${capped} Äpfel gefressen → +${capped} Pts`,
    time: Date.now(),
  });
  const feedKey = `casino:feed:${channelId}`;
  await redis.lpush(feedKey, entry);
  await redis.ltrim(feedKey, 0, 29);
  await redis.expire(feedKey, 86400);

  return { points: capped };
}

// ── Connect 4 ──

interface Connect4State {
  player1: { userId: string; displayName: string };
  player2: { userId: string; displayName: string } | null;
  board: number[][]; // 6 rows x 7 cols, 0=empty, 1=p1, 2=p2
  currentTurn: 1 | 2;
  status: "waiting" | "playing" | "finished";
  bet: number;
  winner: string | null; // userId or "draw"
}

function emptyBoard(): number[][] {
  return Array.from({ length: 6 }, () => Array(7).fill(0));
}

function checkWin(board: number[][], player: number): boolean {
  const rows = board.length;
  const cols = board[0].length;
  // Horizontal
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols - 4; c++)
      if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
  // Vertical
  for (let r = 0; r <= rows - 4; r++)
    for (let c = 0; c < cols; c++)
      if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
  // Diagonal down-right
  for (let r = 0; r <= rows - 4; r++)
    for (let c = 0; c <= cols - 4; c++)
      if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
  // Diagonal down-left
  for (let r = 0; r <= rows - 4; r++)
    for (let c = 3; c < cols; c++)
      if (board[r][c] === player && board[r+1][c-1] === player && board[r+2][c-2] === player && board[r+3][c-3] === player) return true;
  return false;
}

function isBoardFull(board: number[][]): boolean {
  return board[0].every((cell) => cell !== 0);
}

function stateKey(channelId: string): string {
  return `casino:connect4:${channelId}`;
}

export async function createConnect4(
  channelId: string,
  userId: string,
  displayName: string,
  bet: number
): Promise<any> {
  if (!Number.isInteger(bet) || bet < 5) return { error: "Mindesteinsatz: 5 Punkte" };

  // Check for existing game
  const existing = await redis.get(stateKey(channelId));
  if (existing) {
    const state: Connect4State = JSON.parse(existing);
    if (state.status !== "finished") return { error: "Es läuft bereits ein Spiel!" };
  }

  // Check points
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < bet) return { error: "Nicht genug Punkte!" };

  // Deduct bet
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: bet } },
  });

  const state: Connect4State = {
    player1: { userId, displayName },
    player2: null,
    board: emptyBoard(),
    currentTurn: 1,
    status: "waiting",
    bet,
    winner: null,
  };

  await redis.set(stateKey(channelId), JSON.stringify(state), "EX", 300);
  return { success: true, state };
}

export async function joinConnect4(
  channelId: string,
  userId: string,
  displayName: string
): Promise<any> {
  const raw = await redis.get(stateKey(channelId));
  if (!raw) return { error: "Kein offenes Spiel gefunden!" };
  const state: Connect4State = JSON.parse(raw);

  if (state.status !== "waiting") return { error: "Spiel ist nicht offen!" };
  if (state.player1.userId === userId) return { error: "Du kannst nicht gegen dich selbst spielen!" };

  // Check points
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < state.bet) return { error: `Nicht genug Punkte! Einsatz: ${state.bet}` };

  // Deduct bet
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: state.bet } },
  });

  state.player2 = { userId, displayName };
  state.status = "playing";
  await redis.set(stateKey(channelId), JSON.stringify(state), "EX", 300);
  return { success: true, state };
}

export async function playConnect4(
  channelId: string,
  userId: string,
  col: number
): Promise<any> {
  const raw = await redis.get(stateKey(channelId));
  if (!raw) return { error: "Kein aktives Spiel!" };
  const state: Connect4State = JSON.parse(raw);

  if (state.status !== "playing") return { error: "Spiel läuft nicht!" };
  if (!state.player2) return { error: "Warte auf Gegner!" };

  // Validate turn
  const isP1 = state.player1.userId === userId;
  const isP2 = state.player2.userId === userId;
  if (!isP1 && !isP2) return { error: "Du bist nicht in diesem Spiel!" };
  if ((state.currentTurn === 1 && !isP1) || (state.currentTurn === 2 && !isP2))
    return { error: "Nicht dein Zug!" };

  // Validate column
  if (col < 0 || col > 6) return { error: "Ungültige Spalte!" };
  if (state.board[0][col] !== 0) return { error: "Spalte ist voll!" };

  // Drop piece
  let row = -1;
  for (let r = 5; r >= 0; r--) {
    if (state.board[r][col] === 0) { row = r; break; }
  }
  state.board[row][col] = state.currentTurn;

  // Check win
  if (checkWin(state.board, state.currentTurn)) {
    state.status = "finished";
    const winnerId = state.currentTurn === 1 ? state.player1.userId : state.player2.userId;
    state.winner = winnerId;
    const pot = state.bet * 2;
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: winnerId } },
      data: { points: { increment: pot } },
    });
    const winnerName = state.currentTurn === 1 ? state.player1.displayName : state.player2.displayName;
    // Feed
    const entry = JSON.stringify({
      user: winnerName,
      game: "connect4",
      payout: pot,
      profit: state.bet,
      detail: `🔴 4 Gewinnt: ${winnerName} gewinnt ${pot} Pts!`,
      time: Date.now(),
    });
    const feedKey = `casino:feed:${channelId}`;
    await redis.lpush(feedKey, entry);
    await redis.ltrim(feedKey, 0, 29);
    await redis.expire(feedKey, 86400);
  } else if (isBoardFull(state.board)) {
    // Draw — return bets
    state.status = "finished";
    state.winner = "draw";
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: state.player1.userId } },
      data: { points: { increment: state.bet } },
    });
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: state.player2.userId } },
      data: { points: { increment: state.bet } },
    });
  } else {
    state.currentTurn = state.currentTurn === 1 ? 2 : 1;
  }

  await redis.set(stateKey(channelId), JSON.stringify(state), "EX", 300);
  return { success: true, state };
}

export async function getConnect4(channelId: string): Promise<any> {
  const raw = await redis.get(stateKey(channelId));
  if (!raw) return null;
  return JSON.parse(raw) as Connect4State;
}

// ── Memory ──

export async function submitMemoryScore(
  channelId: string,
  userId: string,
  pairs: number,
  timeMs: number,
  moves: number
): Promise<{ points: number } | { error: string }> {
  // Validate
  if (!Number.isInteger(pairs) || pairs < 0) return { error: "Ungültige Paare" };
  if (!Number.isInteger(moves) || moves < pairs) return { error: "Ungültige Züge" };
  const cappedPairs = Math.min(pairs, 8);

  // Cooldown 60s
  const cdKey = `cd:minigame:memory:${channelId}:${userId}`;
  const set = await redis.set(cdKey, "1", "EX", 60, "NX");
  if (!set) return { error: "Cooldown! Warte 60 Sekunden." };

  // Calculate points: 2 per pair + time bonus
  let pts = cappedPairs * 2;
  if (cappedPairs === 8) {
    if (timeMs < 30000) pts += 10;
    else if (timeMs < 60000) pts += 5;
  }

  if (pts > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: pts } },
    });
  }

  // Feed
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  const timeStr = (timeMs / 1000).toFixed(1);
  const entry = JSON.stringify({
    user: cu?.displayName ?? "???",
    game: "memory",
    payout: pts,
    profit: pts,
    detail: `🧠 Memory: ${cappedPairs}/8 Paare in ${timeStr}s (${moves} Züge) → +${pts} Pts`,
    time: Date.now(),
  });
  const feedKey = `casino:feed:${channelId}`;
  await redis.lpush(feedKey, entry);
  await redis.ltrim(feedKey, 0, 29);
  await redis.expire(feedKey, 86400);

  return { points: pts };
}

// ── Dice 21 ──
// Player rolls dice trying to get close to 21 without going over.
// Each roll adds 1-6. Player decides when to stop.
// State stored in Redis during game.

interface Dice21State {
  total: number;
  rolls: number[];
  bet: number;
  finished: boolean;
}

function dice21Key(channelId: string, userId: string): string {
  return `casino:dice21:${channelId}:${userId}`;
}

export async function startDice21(
  channelId: string, userId: string, bet: number,
): Promise<{ total: number; roll: number; rolls: number[] } | { error: string }> {
  if (bet < 5) return { error: "Mindesteinsatz: 5 Punkte!" };

  const existing = await redis.get(dice21Key(channelId, userId));
  if (existing) {
    const state = JSON.parse(existing) as Dice21State;
    if (!state.finished) return { error: "Du hast bereits ein laufendes Spiel! Stoppe oder würfle weiter." };
  }

  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < bet) return { error: `Nicht genug Punkte! Brauchst ${bet}.` };

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: bet } },
  });

  const roll = Math.floor(Math.random() * 6) + 1;
  const state: Dice21State = { total: roll, rolls: [roll], bet, finished: false };
  await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 300);

  return { total: roll, roll, rolls: [roll] };
}

export async function hitDice21(
  channelId: string, userId: string,
): Promise<{ total: number; roll: number; rolls: number[]; bust: boolean; payout?: number } | { error: string }> {
  const raw = await redis.get(dice21Key(channelId, userId));
  if (!raw) return { error: "Kein laufendes Spiel! Starte mit einem Einsatz." };
  const state = JSON.parse(raw) as Dice21State;
  if (state.finished) return { error: "Spiel bereits beendet!" };

  const roll = Math.floor(Math.random() * 6) + 1;
  state.total += roll;
  state.rolls.push(roll);

  if (state.total > 21) {
    // Bust!
    state.finished = true;
    await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

    const entry = JSON.stringify({ user: userId, game: "dice21", payout: 0, profit: -state.bet, detail: `🎲 21: ${state.total} BUST! -${state.bet}`, time: Date.now() });
    await redis.lpush(`casino:feed:${channelId}`, entry);
    await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

    return { total: state.total, roll, rolls: state.rolls, bust: true, payout: 0 };
  }

  if (state.total === 21) {
    // Perfect 21! 3x payout
    state.finished = true;
    const payout = state.bet * 3;
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: payout } },
    });
    await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

    const entry = JSON.stringify({ user: userId, game: "dice21", payout, profit: payout - state.bet, detail: `🎲 21! PERFEKT! x3 → ${payout}`, time: Date.now() });
    await redis.lpush(`casino:feed:${channelId}`, entry);
    await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

    return { total: 21, roll, rolls: state.rolls, bust: false, payout };
  }

  await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 300);
  return { total: state.total, roll, rolls: state.rolls, bust: false };
}

export async function standDice21(
  channelId: string, userId: string,
): Promise<{ total: number; payout: number; multiplier: number; rolls: number[] } | { error: string }> {
  const raw = await redis.get(dice21Key(channelId, userId));
  if (!raw) return { error: "Kein laufendes Spiel!" };
  const state = JSON.parse(raw) as Dice21State;
  if (state.finished) return { error: "Spiel bereits beendet!" };

  state.finished = true;

  // Must roll at least 3 times before standing
  if (state.rolls.length < 3) {
    return { error: "Mindestens 3 Würfe nötig bevor du stoppen kannst!" };
  }

  // Payout based on how close to 21:
  // 20-21: x3, 18-19: x2.5, 16-17: x2, 14-15: x1.5
  // Below 14: LOSS (you played it too safe)
  let multiplier: number;
  if (state.total >= 20) multiplier = 3;
  else if (state.total >= 18) multiplier = 2.5;
  else if (state.total >= 16) multiplier = 2;
  else if (state.total >= 14) multiplier = 1.5;
  else if (state.total >= 12) multiplier = 0.5; // loss: get half back
  else multiplier = 0.2; // big loss: played too safe

  const payout = Math.round(state.bet * multiplier);
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { increment: payout } },
  });
  await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

  const entry = JSON.stringify({ user: userId, game: "dice21", payout, profit: payout - state.bet, detail: `🎲 21: ${state.total} · x${multiplier} → ${payout}`, time: Date.now() });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { total: state.total, payout, multiplier, rolls: state.rolls };
}

export async function getDice21(channelId: string, userId: string): Promise<Dice21State | null> {
  const raw = await redis.get(dice21Key(channelId, userId));
  return raw ? JSON.parse(raw) : null;
}

// ── Over/Under (Drüber/Drunter) ──
// Roll 2 dice (2-12). Guess if result is over or under 7.
// 7 exactly = house wins. Over/Under pays 2x. Bet on exact 7 pays 5x.

export async function playOverUnder(
  channelId: string, userId: string, displayName: string, bet: number, guess: "over" | "under" | "seven",
): Promise<{ dice: [number, number]; total: number; win: boolean; payout: number; guess: string } | { error: string }> {
  if (bet < 1) return { error: "Mindesteinsatz: 1 Punkt!" };

  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < bet) return { error: `Nicht genug Punkte! Brauchst ${bet}.` };

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: bet } },
  });

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;

  let win = false;
  let multiplier = 0;
  if (guess === "over" && total > 7) { win = true; multiplier = 2; }
  else if (guess === "under" && total < 7) { win = true; multiplier = 2; }
  else if (guess === "seven" && total === 7) { win = true; multiplier = 5; }

  const payout = win ? Math.round(bet * multiplier) : 0;
  if (payout > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: payout } },
    });
  }

  const guessLabel = guess === "over" ? "Drüber" : guess === "under" ? "Drunter" : "Genau 7";
  const entry = JSON.stringify({
    user: displayName, game: "overunder", payout, profit: payout - bet,
    detail: `🎲 ${d1}+${d2}=${total} · ${guessLabel} · ${win ? `x${multiplier} → ${payout}` : "Verloren!"}`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { dice: [d1, d2], total, win, payout, guess: guessLabel };
}

// ── Sudoku ──
// 4x4 mini-sudoku with point rewards based on difficulty + time

const SUDOKU_SOLUTIONS: number[][][] = [
  [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]],
  [[2,1,4,3],[4,3,2,1],[1,2,3,4],[3,4,1,2]],
  [[3,4,1,2],[1,2,3,4],[4,3,2,1],[2,1,4,3]],
  [[4,3,2,1],[2,1,4,3],[3,4,1,2],[1,2,3,4]],
  [[1,3,2,4],[4,2,1,3],[2,4,3,1],[3,1,4,2]],
  [[2,4,3,1],[3,1,4,2],[1,3,2,4],[4,2,1,3]],
  [[4,1,3,2],[2,3,4,1],[3,4,1,2],[1,2,2,4]], // intentionally replaced below
  [[3,2,4,1],[1,4,2,3],[4,1,3,2],[2,3,1,4]],
];

function shuffleSudoku(base: number[][]): { solution: number[][]; puzzle: number[][]; blanks: number } {
  // Randomly permute digits 1-4
  const perm = [1,2,3,4].sort(() => Math.random() - 0.5);
  const solution = base.map(row => row.map(v => perm[v - 1]!));

  // Randomly shuffle rows within band and cols within stack
  if (Math.random() > 0.5) { [solution[0], solution[1]] = [solution[1]!, solution[0]!]; }
  if (Math.random() > 0.5) { [solution[2], solution[3]] = [solution[3]!, solution[2]!]; }

  return { solution, puzzle: solution.map(r => [...r]), blanks: 0 };
}

export function generateSudoku(difficulty: "easy" | "medium" | "hard"): {
  puzzle: (number | 0)[][];
  solution: number[][];
  blanks: number;
  difficulty: string;
  reward: number;
} {
  const base = SUDOKU_SOLUTIONS[Math.floor(Math.random() * 6)]!; // use first 6 valid ones
  const { solution } = shuffleSudoku(base);

  const blanksCount = difficulty === "easy" ? 6 : difficulty === "medium" ? 8 : 10;
  const reward = difficulty === "easy" ? 10 : difficulty === "medium" ? 25 : 50;

  // Create puzzle by removing cells
  const puzzle: (number | 0)[][] = solution.map(r => [...r]);
  const positions: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < blanksCount && i < positions.length; i++) {
    const [r, c] = positions[i]!;
    puzzle[r]![c!] = 0;
  }

  return { puzzle, solution, blanks: blanksCount, difficulty, reward };
}

export function validateSudoku(solution: number[][], submitted: number[][]): boolean {
  // Check all cells match
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (solution[r]![c] !== submitted[r]?.[c]) return false;
    }
  }
  return true;
}

export async function submitSudoku(
  channelId: string, userId: string, displayName: string,
  difficulty: "easy" | "medium" | "hard", timeMs: number,
): Promise<{ points: number } | { error: string }> {
  // Cooldown 30s
  const cdKey = `casino:sudoku:cd:${channelId}:${userId}`;
  const cd = await redis.get(cdKey);
  if (cd) return { error: "Sudoku Cooldown! Warte 30 Sekunden." };

  const baseReward = difficulty === "easy" ? 10 : difficulty === "medium" ? 25 : 50;
  // Time bonus: under 30s +50%, under 60s +25%
  let timeBonus = 0;
  if (timeMs < 30000) timeBonus = Math.round(baseReward * 0.5);
  else if (timeMs < 60000) timeBonus = Math.round(baseReward * 0.25);

  const pts = baseReward + timeBonus;

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { increment: pts } },
  });

  await redis.set(cdKey, "1", "EX", 30);

  const entry = JSON.stringify({
    user: displayName, game: "sudoku", payout: pts, profit: pts,
    detail: `🔢 Sudoku (${difficulty}) gelöst! +${pts} (${(timeMs/1000).toFixed(1)}s)`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { points: pts };
}
