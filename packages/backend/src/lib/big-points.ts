/**
 * Big Points Utility
 *
 * Handles points that can exceed BigInt limits using scientific notation:
 * real_points = points * 10^pointsExp
 *
 * When points exceed a threshold, we "compress" by dividing points
 * and incrementing the exponent. This allows truly infinite scaling.
 *
 * PostgreSQL BIGINT max: 9,223,372,036,854,775,807 (~9.2e18)
 * We compress when points > 1e15 (1 Billiarde) to keep headroom.
 */

const COMPRESS_THRESHOLD = 1_000_000_000_000_000n; // 1e15
const COMPRESS_FACTOR = 1_000_000n; // divide by 1M, add 6 to exponent

export interface PointsValue {
  points: bigint;
  pointsExp: bigint;
}

/** Get the display string for points (used in backend logging) */
export function formatPointsServer(p: PointsValue): string {
  if (p.pointsExp === 0n) {
    return Number(p.points).toLocaleString("de-DE");
  }
  const mantissa = Number(p.points);
  const exp = Number(p.pointsExp);
  const totalDigits = Math.floor(Math.log10(Math.abs(mantissa) || 1)) + 1 + exp;

  if (totalDigits <= 6) return `${mantissa}e${exp}`;
  if (totalDigits <= 9) return `${(mantissa / Math.pow(10, totalDigits - 6 - exp + exp)).toFixed(1)}K`; // rough

  // Use suffix system
  const suffixes = ["", "K", "Mio", "Mrd", "Tril", "Quad", "Quint", "Sext", "Sept", "Okt", "Non", "Dez"];
  const tier = Math.floor((totalDigits - 1) / 3);
  if (tier < suffixes.length) {
    const scale = Math.pow(10, tier * 3 - exp);
    return `${(mantissa / scale).toFixed(1)} ${suffixes[tier]}`;
  }
  return `${mantissa}e${exp}`;
}

/**
 * Check if we need to compress points and do it.
 * Call this after any large payout.
 * Returns true if compression was performed.
 */
export function shouldCompress(points: bigint): boolean {
  return points > COMPRESS_THRESHOLD || points < -COMPRESS_THRESHOLD;
}

export function compress(points: bigint, pointsExp: bigint): PointsValue {
  let p = points;
  let e = pointsExp;
  while (p > COMPRESS_THRESHOLD || p < -COMPRESS_THRESHOLD) {
    p = p / COMPRESS_FACTOR;
    e = e + 6n;
  }
  return { points: p, pointsExp: e };
}

/**
 * Add an amount to points, handling exponent.
 * The amount is always in "base" units (exponent 0).
 * If the player has an exponent > 0, small amounts are negligible.
 */
export function addPoints(current: PointsValue, amount: number): PointsValue {
  if (amount === 0) return current;

  const amountBig = BigInt(Math.round(amount));

  if (current.pointsExp === 0n) {
    // Simple case: just add
    const newPoints = current.points + amountBig;
    if (shouldCompress(newPoints)) {
      return compress(newPoints, 0n);
    }
    return { points: newPoints, pointsExp: 0n };
  }

  // Player has exponent > 0: amount needs to be scaled down to compare
  // If exponent is large, the amount is negligible
  const exp = Number(current.pointsExp);
  if (exp > 15) {
    // Amount is negligible compared to existing points
    return current;
  }

  // Scale amount down by exponent
  const scaledAmount = BigInt(Math.round(amount / Math.pow(10, exp)));
  if (scaledAmount === 0n) return current; // negligible

  const newPoints = current.points + scaledAmount;
  if (shouldCompress(newPoints)) {
    return compress(newPoints, current.pointsExp);
  }
  return { points: newPoints, pointsExp: current.pointsExp };
}
