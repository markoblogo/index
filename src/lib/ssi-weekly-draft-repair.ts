const recoverable = new Set(["weekly_part_incomplete", "weekly_part_invalid_json", "weekly_part_too_long", "weekly_part_sections_missing", "weekly_part_fragment"]);

/** One shape-only retry in the same request budget; never retry facts/bases or provider failures. */
export async function withSsiPartRepair<T extends { report?: unknown; error?: string }>(
  generate: (repair: boolean, timeoutMs: number) => Promise<T>, now: () => number = Date.now,
): Promise<T> {
  const deadline = now() + 230000;
  const first = await generate(false, 150000);
  const remaining = deadline - now();
  return !first.report && recoverable.has(first.error ?? "") && remaining >= 45000
    ? generate(true, Math.min(150000, remaining)) : first;
}
