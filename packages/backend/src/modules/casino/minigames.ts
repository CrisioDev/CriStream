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
