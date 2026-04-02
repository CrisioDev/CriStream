export function formatNumber(n: number): string {
  if (n === undefined || n === null) return "0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e18) return sign + (abs / 1e18).toFixed(1) + " Quint";
  if (abs >= 1e15) return sign + (abs / 1e15).toFixed(1) + " Quad";
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + " Tril";
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + " Mrd";
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + " Mio";
  if (abs >= 1e4) return sign + (abs / 1e3).toFixed(1) + "K";
  return sign + abs.toLocaleString("de-DE");
}
