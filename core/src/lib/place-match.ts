const IGNORED_TERMS = new Set([
  "and",
  "business",
  "businesses",
  "center",
  "centre",
  "company",
  "for",
  "new",
  "of",
  "outlet",
  "place",
  "places",
  "service",
  "services",
  "shop",
  "store",
  "the",
]);

function tokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Words that describe a business without narrowing its type. Keeping them out
 * of a custom search lets "pet store" match the `pet` category and "coffee
 * shop" match `cafe.coffee`, instead of matching every shop in the area.
 */
export function customMatchTerms(label: string): string[] {
  const all = tokens(label);
  const distinctive = all.filter(
    (token) => token.length >= 2 && !IGNORED_TERMS.has(token),
  );

  return distinctive.length > 0 ? distinctive : all;
}

function tokenMatches(token: string, term: string): boolean {
  if (token === term) return true;

  // Handle the common singular/plural spellings without turning short terms
  // like "spa" into a prefix match for unrelated words such as "spatial".
  return token === `${term}s` || term === `${token}s`;
}

/**
 * True when every distinctive word from the user's label appears in the place
 * name or one of its provider categories. A single word such as "spa" matches
 * the `leisure.spa` / `service.beauty.spa` categories even when the business
 * name does not contain "spa". Longer labels such as "board game cafe" still
 * require all of their words, so they do not degrade into a broad cafe search.
 */
export function matchesPlaceTerms(
  name: string | null | undefined,
  categories: string[],
  terms: string[],
): boolean {
  if (terms.length === 0) return true;

  const placeTokens = new Set([
    ...tokens(name ?? ""),
    ...categories.flatMap((category) => tokens(category)),
  ]);

  return terms.every((term) =>
    [...placeTokens].some((token) => tokenMatches(token, term)),
  );
}
