export function checkCaps(message: string, minLength: number, threshold: number): boolean {
  if (message.length < minLength) return false;
  const letters = message.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return false;
  const upperCount = (message.match(/[A-Z]/g) || []).length;
  const percentage = (upperCount / letters.length) * 100;
  return percentage >= threshold;
}
