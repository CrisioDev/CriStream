/**
 * Format numbers with suffixes for display.
 * Handles: number, string (BigInt serialized), objects with { points, pointsExp }.
 *
 * Suffixes: K, Mio, Mrd, Tril, Quad, Quint, Sext, Sept, Okt, Non, Dez
 */

const SUFFIXES = ["", "K", "Mio", "Mrd", "Tril", "Quad", "Quint", "Sext", "Sept", "Okt", "Non", "Dez"];

export function formatNumber(input: number | string | bigint | null | undefined, exponent?: number | string | bigint | null): string {
  if (input === undefined || input === null) return "0";

  let n: number;
  if (typeof input === "bigint") {
    n = Number(input);
  } else if (typeof input === "string") {
    n = parseFloat(input);
    if (isNaN(n)) return "0";
  } else {
    n = input;
  }

  // Apply exponent if provided (scientific notation from DB)
  const exp = exponent ? Number(exponent) : 0;
  if (exp > 0) {
    // Calculate total order of magnitude
    const totalDigits = Math.floor(Math.log10(Math.abs(n) || 1)) + 1 + exp;
    const tier = Math.floor((totalDigits - 1) / 3);

    if (tier < SUFFIXES.length && tier > 0) {
      const displayValue = n / Math.pow(10, tier * 3 - exp);
      return `${displayValue.toFixed(1)} ${SUFFIXES[tier]}`;
    }
    // Fallback for extremely large
    return `${n.toFixed(1)}e${exp}`;
  }

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1e18) return sign + (abs / 1e18).toFixed(1) + " Quint";
  if (abs >= 1e15) return sign + (abs / 1e15).toFixed(1) + " Quad";
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + " Tril";
  if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(1) + " Mrd";
  if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(1) + " Mio";
  if (abs >= 1e4)  return sign + (abs / 1e3).toFixed(1) + "K";
  return sign + abs.toLocaleString("de-DE");
}
