const controlCharsPattern = /[\p{Cc}]/gu;

export function normalizeTitle(input: string): string {
  return input
    .trim()
    .replace(controlCharsPattern, "")
    .replace(/s+/g, " ")
    .slice(0, 255);
}
