export function checkSymbols(message: string, threshold: number): boolean {
  if (message.length < 5) return false;
  const symbolCount = (message.match(/[^a-zA-Z0-9\s]/g) || []).length;
  const percentage = (symbolCount / message.length) * 100;
  return percentage >= threshold;
}
