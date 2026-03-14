export function checkEmotes(message: string, maxCount: number): boolean {
  // Count emote-like patterns (words in PascalCase or known emote patterns)
  // Twitch emotes are typically single words, we count space-separated tokens
  // that look like emotes (all-caps short words, PascalCase words, etc.)
  const words = message.split(/\s+/);
  let emoteCount = 0;
  for (const word of words) {
    // Simple heuristic: words that are 2+ chars, all caps, or PascalCase
    if (/^[A-Z][a-zA-Z]+$/.test(word) || /^[A-Z]{2,}$/.test(word)) {
      emoteCount++;
    }
  }
  return emoteCount > maxCount;
}
