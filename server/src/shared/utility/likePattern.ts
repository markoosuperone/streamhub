// `%` and `_` are wildcards to LIKE/ILIKE, and `\` is its default escape
// character. A search term is user text rather than a pattern, so all three
// have to be escaped — otherwise searching for "100%" quietly matches every
// row, and a lone "%" turns every search into a full scan.
const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

/** Builds a "contains" ILIKE pattern that matches the term literally. */
export function toContainsPattern(search: string): string {
  return `%${search.replace(LIKE_SPECIAL_CHARACTERS, (character) => `\\${character}`)}%`;
}
