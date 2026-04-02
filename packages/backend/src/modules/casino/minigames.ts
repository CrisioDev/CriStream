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

// ── Dice 21 — Player vs House ──
// Player rolls dice trying to get close to 21 without going over.
// After player stands, house rolls automatically (hits until 15+).
// Whoever is closer to 21 without busting wins. Tie/both bust = house wins.
// Player 21 exact = x3 (blackjack bonus). Normal win = x2. Loss = 0.

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

  // Cooldown 30s

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
    // Bust — player loses immediately
    state.finished = true;
    await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

    const cu = await prisma.channelUser.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    });
    const entry = JSON.stringify({ user: cu?.displayName ?? userId, game: "dice21", payout: 0, profit: -state.bet, detail: `🎲 21: ${state.total} BUST! -${state.bet}`, time: Date.now() });
    await redis.lpush(`casino:feed:${channelId}`, entry);
    await redis.ltrim(`casino:feed:${channelId}`, 0, 29);
    await redis.expire(`casino:feed:${channelId}`, 86400);

    return { total: state.total, roll, rolls: state.rolls, bust: true, payout: 0 };
  }

  if (state.total === 21) {
    // Perfect 21! Blackjack bonus x3
    state.finished = true;
    const payout = state.bet * 3;
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: payout } },
    });
    await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

    const cu = await prisma.channelUser.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    });
    const entry = JSON.stringify({ user: cu?.displayName ?? userId, game: "dice21", payout, profit: payout - state.bet, detail: `🎲 BLACKJACK! 21! x3 → ${payout}`, time: Date.now() });
    await redis.lpush(`casino:feed:${channelId}`, entry);
    await redis.ltrim(`casino:feed:${channelId}`, 0, 29);
    await redis.expire(`casino:feed:${channelId}`, 86400);

    return { total: 21, roll, rolls: state.rolls, bust: false, payout };
  }

  await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 300);
  return { total: state.total, roll, rolls: state.rolls, bust: false };
}

export async function standDice21(
  channelId: string, userId: string,
): Promise<{
  playerTotal: number; houseTotal: number; houseRolls: number[];
  playerRolls: number[]; houseBust: boolean; playerWins: boolean;
  payout: number; multiplier: number;
} | { error: string }> {
  const raw = await redis.get(dice21Key(channelId, userId));
  if (!raw) return { error: "Kein laufendes Spiel!" };
  const state = JSON.parse(raw) as Dice21State;
  if (state.finished) return { error: "Spiel bereits beendet!" };

  // Must roll at least 2 times before standing
  if (state.rolls.length < 2) {
    return { error: "Mindestens 2 Würfe nötig bevor du stoppen kannst!" };
  }

  state.finished = true;

  // House rules: hit on 16 or below, stand on 17+ (like real casino blackjack)
  let houseTotal = 0;
  const houseRolls: number[] = [];
  while (houseTotal < 17) {
    const roll = Math.floor(Math.random() * 6) + 1;
    houseRolls.push(roll);
    houseTotal += roll;
  }

  const houseBust = houseTotal > 21;
  const playerTotal = state.total;

  // Determine winner
  // Both bust = house wins, Tie = house wins
  let playerWins = false;
  let multiplier = 0;
  let payout = 0;

  if (playerTotal === 21) {
    // Blackjack bonus x3
    playerWins = true;
    multiplier = 3;
  } else if (houseBust && playerTotal <= 21) {
    // House bust, player didn't = player wins x2
    playerWins = true;
    multiplier = 2;
  } else if (!houseBust && playerTotal <= 21 && playerTotal > houseTotal) {
    // Player closer to 21
    playerWins = true;
    multiplier = 2;
  }
  // All other cases: house wins (tie, both bust, house closer)

  payout = Math.round(state.bet * multiplier);

  if (payout > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: payout } },
    });
  }

  await redis.set(dice21Key(channelId, userId), JSON.stringify(state), "EX", 60);

  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  const resultText = playerWins
    ? `🎲 21: Spieler ${playerTotal} vs Haus ${houseTotal}${houseBust ? " (BUST)" : ""} → x${multiplier} → ${payout}`
    : `🎲 21: Spieler ${playerTotal} vs Haus ${houseTotal}${houseBust ? " (BUST)" : ""} → Haus gewinnt! -${state.bet}`;
  const entry = JSON.stringify({
    user: cu?.displayName ?? userId, game: "dice21",
    payout, profit: payout - state.bet,
    detail: resultText, time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);
  await redis.expire(`casino:feed:${channelId}`, 86400);

  return { playerTotal, houseTotal, houseRolls, playerRolls: state.rolls, houseBust, playerWins, payout, multiplier };
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

/** Validate a completed sudoku grid — accepts ANY valid solution, not just the generated one */
export function validateSudoku(solution: number[][], submitted: number[][], size = 4): boolean {
  const boxSize = size === 9 ? 3 : 2;
  // Check original clue cells are unchanged
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = submitted[r]?.[c];
      if (!val || val < 1 || val > size) return false;
    }
  }
  // Check rows
  for (let r = 0; r < size; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < size; c++) { seen.add(submitted[r]![c]!); }
    if (seen.size !== size) return false;
  }
  // Check cols
  for (let c = 0; c < size; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < size; r++) { seen.add(submitted[r]![c]!); }
    if (seen.size !== size) return false;
  }
  // Check boxes
  for (let br = 0; br < size; br += boxSize) {
    for (let bc = 0; bc < size; bc += boxSize) {
      const seen = new Set<number>();
      for (let r = br; r < br + boxSize; r++) {
        for (let c = bc; c < bc + boxSize; c++) { seen.add(submitted[r]![c]!); }
      }
      if (seen.size !== size) return false;
    }
  }
  return true;
}

export async function submitSudoku(
  channelId: string, userId: string, displayName: string,
  difficulty: "easy" | "medium" | "hard", timeMs: number,
): Promise<{ points: number } | { error: string }> {
  // Cooldown 30s

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


  const entry = JSON.stringify({
    user: displayName, game: "sudoku", payout: pts, profit: pts,
    detail: `🔢 Sudoku (${difficulty}) gelöst! +${pts} (${(timeMs/1000).toFixed(1)}s)`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { points: pts };
}

// ── 9x9 Sudoku (up to 10,000 pts) ──

function generate9x9Solution(): number[][] {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  function isValid(r: number, c: number, num: number): boolean {
    for (let i = 0; i < 9; i++) { if (grid[r]![i] === num || grid[i]![c] === num) return false; }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) { if (grid[i]![j] === num) return false; }
    return true;
  }
  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r]![c] !== 0) continue;
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (const n of nums) {
          if (isValid(r, c, n)) { grid[r]![c] = n; if (solve()) return true; grid[r]![c] = 0; }
        }
        return false;
      }
    }
    return true;
  }
  solve();
  return grid;
}

export function generate9x9Sudoku(difficulty: "easy" | "medium" | "hard"): {
  puzzle: (number | 0)[][]; solution: number[][]; blanks: number; difficulty: string; reward: number; size: 9;
} {
  const solution = generate9x9Solution();
  const blanksCount = difficulty === "easy" ? 35 : difficulty === "medium" ? 45 : 55;
  const reward = difficulty === "easy" ? 2500 : difficulty === "medium" ? 5000 : 10000;
  const puzzle: (number | 0)[][] = solution.map(r => [...r]);
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < blanksCount; i++) { const [r, c] = positions[i]!; puzzle[r]![c!] = 0; }
  return { puzzle, solution, blanks: blanksCount, difficulty, reward, size: 9 };
}

export async function submit9x9Sudoku(
  channelId: string, userId: string, displayName: string,
  submitted: number[][], difficulty: "easy" | "medium" | "hard", timeMs: number,
): Promise<{ points: number } | { error: string }> {
  if (!validateSudoku([], submitted, 9)) return { error: "Lösung ist nicht korrekt!" };
  const baseReward = difficulty === "easy" ? 2500 : difficulty === "medium" ? 5000 : 10000;
  let timeBonus = 0;
  if (timeMs < 120000) timeBonus = Math.round(baseReward * 0.5);
  else if (timeMs < 300000) timeBonus = Math.round(baseReward * 0.25);
  const pts = baseReward + timeBonus;
  await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId, twitchUserId: userId } }, data: { points: { increment: pts } } });
  const entry = JSON.stringify({ user: displayName, game: "sudoku9x9", payout: pts, profit: pts, detail: `🔢 9x9 Sudoku (${difficulty}) gelöst! +${pts} (${(timeMs/1000).toFixed(0)}s)`, time: Date.now() });
  await redis.lpush(`casino:feed:${channelId}`, entry); await redis.ltrim(`casino:feed:${channelId}`, 0, 29);
  return { points: pts };
}

// ── Roulette ──
// Bet on: number (0-36), color (red/black), even/odd, high/low, dozen, column
// Payouts: number=x36, color=x2, even/odd=x2, high/low=x2, dozen=x3, column=x3

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

type RouletteBet = { type: "number"; value: number } | { type: "red" | "black" | "even" | "odd" | "high" | "low" } | { type: "dozen"; value: 1 | 2 | 3 } | { type: "column"; value: 1 | 2 | 3 };

function evaluateRouletteBet(bet: RouletteBet, result: number): { win: boolean; multiplier: number } {
  if (result === 0) {
    // 0 = only exact number bet wins
    if (bet.type === "number" && bet.value === 0) return { win: true, multiplier: 36 };
    return { win: false, multiplier: 0 };
  }
  switch (bet.type) {
    case "number": return { win: bet.value === result, multiplier: 36 };
    case "red": return { win: RED_NUMBERS.has(result), multiplier: 2 };
    case "black": return { win: !RED_NUMBERS.has(result), multiplier: 2 };
    case "even": return { win: result % 2 === 0, multiplier: 2 };
    case "odd": return { win: result % 2 === 1, multiplier: 2 };
    case "high": return { win: result >= 19, multiplier: 2 };
    case "low": return { win: result <= 18, multiplier: 2 };
    case "dozen":
      if (bet.value === 1) return { win: result >= 1 && result <= 12, multiplier: 3 };
      if (bet.value === 2) return { win: result >= 13 && result <= 24, multiplier: 3 };
      return { win: result >= 25 && result <= 36, multiplier: 3 };
    case "column":
      return { win: result % 3 === (bet.value % 3), multiplier: 3 };
    default: return { win: false, multiplier: 0 };
  }
}

export async function playRoulette(
  channelId: string, userId: string, displayName: string,
  betAmount: number, bets: RouletteBet[],
): Promise<{ result: number; color: string; wins: { bet: RouletteBet; win: boolean; payout: number }[]; totalPayout: number; totalProfit: number } | { error: string }> {
  if (betAmount < 5) return { error: "Mindesteinsatz: 5 Punkte pro Wette!" };
  if (bets.length < 1 || bets.length > 5) return { error: "1-5 Wetten erlaubt!" };

  const totalCost = betAmount * bets.length;
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < totalCost) return { error: `Nicht genug Punkte! Brauchst ${totalCost}.` };

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: totalCost } },
  });

  // Spin the wheel
  const result = Math.floor(Math.random() * 37); // 0-36
  const color = result === 0 ? "green" : RED_NUMBERS.has(result) ? "red" : "black";

  // Evaluate all bets
  const wins = bets.map(bet => {
    const { win, multiplier } = evaluateRouletteBet(bet, result);
    return { bet, win, payout: win ? betAmount * multiplier : 0 };
  });

  const totalPayout = wins.reduce((s, w) => s + w.payout, 0);
  if (totalPayout > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: totalPayout } },
    });
  }

  const totalProfit = totalPayout - totalCost;
  const winCount = wins.filter(w => w.win).length;

  const entry = JSON.stringify({
    user: displayName, game: "roulette", payout: totalPayout, profit: totalProfit,
    detail: `🎰 Roulette: ${result} ${color === "red" ? "🔴" : color === "black" ? "⚫" : "🟢"} · ${winCount}/${bets.length} Treffer → ${totalPayout}`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { result, color, wins, totalPayout, totalProfit };
}

// ── Poker vs House (5-Card Draw) ──

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as const;

interface Card { rank: string; suit: string; value: number; }

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({ rank: RANKS[i]!, suit, value: i + 2 }); // 2-14 (A=14)
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

type HandRank = "royal_flush" | "straight_flush" | "four_kind" | "full_house" | "flush" | "straight" | "three_kind" | "two_pair" | "pair" | "high_card";

const HAND_VALUES: Record<HandRank, number> = {
  royal_flush: 10, straight_flush: 9, four_kind: 8, full_house: 7,
  flush: 6, straight: 5, three_kind: 4, two_pair: 3, pair: 2, high_card: 1,
};

const HAND_NAMES: Record<HandRank, string> = {
  royal_flush: "Royal Flush!", straight_flush: "Straight Flush!", four_kind: "Vierling!",
  full_house: "Full House!", flush: "Flush!", straight: "Straße!",
  three_kind: "Drilling!", two_pair: "Zwei Paare!", pair: "Ein Paar!", high_card: "Höchste Karte",
};

const HAND_PAYOUTS: Record<HandRank, number> = {
  royal_flush: 100, straight_flush: 50, four_kind: 25, full_house: 9,
  flush: 6, straight: 4, three_kind: 3, two_pair: 2, pair: 1, high_card: 0,
};

function evaluateHand(cards: Card[]): { rank: HandRank; score: number; kickers: number[] } {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const isFlush = new Set(suits).size === 1;
  const isStraight = values[0]! - values[4]! === 4 && new Set(values).size === 5;
  const isAceLowStraight = values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;

  if (isFlush && isStraight && values[0] === 14) return { rank: "royal_flush", score: 10000, kickers: values };
  if (isFlush && (isStraight || isAceLowStraight)) return { rank: "straight_flush", score: 9000 + values[0]!, kickers: values };
  if (groups[0]![1] === 4) return { rank: "four_kind", score: 8000 + groups[0]![0], kickers: values };
  if (groups[0]![1] === 3 && groups[1]![1] === 2) return { rank: "full_house", score: 7000 + groups[0]![0] * 15 + groups[1]![0], kickers: values };
  if (isFlush) return { rank: "flush", score: 6000 + values[0]!, kickers: values };
  if (isStraight || isAceLowStraight) return { rank: "straight", score: 5000 + (isAceLowStraight ? 5 : values[0]!), kickers: values };
  if (groups[0]![1] === 3) return { rank: "three_kind", score: 4000 + groups[0]![0], kickers: values };
  if (groups[0]![1] === 2 && groups[1]![1] === 2) return { rank: "two_pair", score: 3000 + groups[0]![0] * 15 + groups[1]![0], kickers: values };
  if (groups[0]![1] === 2) return { rank: "pair", score: 2000 + groups[0]![0], kickers: values };
  return { rank: "high_card", score: 1000 + values[0]!, kickers: values };
}

function formatCard(c: Card): string { return `${c.rank}${c.suit}`; }
function formatHand(cards: Card[]): string { return cards.map(formatCard).join(" "); }

interface PokerState {
  playerHand: Card[];
  houseHand: Card[];
  deck: Card[];
  bet: number;
  phase: "draw" | "done";
}

function pokerKey(channelId: string, userId: string): string {
  return `casino:poker:${channelId}:${userId}`;
}

export async function startPoker(
  channelId: string, userId: string, bet: number,
): Promise<{ playerHand: Card[]; bet: number } | { error: string }> {
  if (bet < 10) return { error: "Mindesteinsatz: 10 Punkte!" };

  const existing = await redis.get(pokerKey(channelId, userId));
  if (existing) {
    const state = JSON.parse(existing) as PokerState;
    if (state.phase !== "done") return { error: "Du hast noch ein laufendes Spiel!" };
  }

  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!cu || cu.points < bet) return { error: `Nicht genug Punkte! Brauchst ${bet}.` };

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: bet } },
  });

  const deck = createDeck();
  const playerHand = deck.splice(0, 5);
  const houseHand = deck.splice(0, 5);

  const state: PokerState = { playerHand, houseHand, deck, bet, phase: "draw" };
  await redis.set(pokerKey(channelId, userId), JSON.stringify(state), "EX", 300);

  return { playerHand, bet };
}

export async function drawPoker(
  channelId: string, userId: string, discardIndices: number[],
): Promise<{
  playerHand: Card[]; houseHand: Card[];
  playerRank: string; houseRank: string;
  playerWins: boolean; payout: number; multiplier: number;
} | { error: string }> {
  const raw = await redis.get(pokerKey(channelId, userId));
  if (!raw) return { error: "Kein laufendes Spiel!" };
  const state = JSON.parse(raw) as PokerState;
  if (state.phase !== "draw") return { error: "Spiel bereits beendet!" };

  // Validate discard indices (max 3 cards)
  const valid = discardIndices.filter(i => i >= 0 && i < 5);
  if (valid.length > 3) return { error: "Maximal 3 Karten tauschen!" };

  // Replace discarded cards
  for (const idx of valid) {
    if (state.deck.length > 0) {
      state.playerHand[idx] = state.deck.shift()!;
    }
  }

  state.phase = "done";

  // Evaluate hands
  const playerEval = evaluateHand(state.playerHand);
  const houseEval = evaluateHand(state.houseHand);

  const playerWins = playerEval.score > houseEval.score;
  const multiplier = playerWins ? Math.max(HAND_PAYOUTS[playerEval.rank], 1) : 0;
  const payout = playerWins ? Math.round(state.bet * (1 + multiplier)) : 0;

  if (payout > 0) {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: payout } },
    });
  }

  await redis.set(pokerKey(channelId, userId), JSON.stringify(state), "EX", 60);

  // Feed
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  const entry = JSON.stringify({
    user: cu?.displayName ?? userId, game: "poker", payout, profit: payout - state.bet,
    detail: playerWins
      ? `🃏 ${HAND_NAMES[playerEval.rank]} vs ${HAND_NAMES[houseEval.rank]} → x${multiplier + 1} → ${payout}`
      : `🃏 ${HAND_NAMES[playerEval.rank]} vs ${HAND_NAMES[houseEval.rank]} → Haus gewinnt!`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return {
    playerHand: state.playerHand, houseHand: state.houseHand,
    playerRank: HAND_NAMES[playerEval.rank], houseRank: HAND_NAMES[houseEval.rank],
    playerWins, payout, multiplier: multiplier + 1,
  };
}
