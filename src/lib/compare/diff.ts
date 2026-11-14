import type { ComparisonResult, GapSuggestion } from '$lib/types';

export interface ComparisonDiff {
  coverageDelta: number;
  gapNodesDelta: number;
  matchedDelta: number;
  newGaps: GapSuggestion[];
  resolvedGaps: GapSuggestion[];
}

/** Diff two comparison rounds by stable gap signature. */
export function diffComparisons(
  previous: ComparisonResult | null,
  next: ComparisonResult | null,
): ComparisonDiff | null {
  if (!previous || !next) return null;
  const previousSignatures = new Set(previous.gaps.map((gap) => gap.signature));
  const nextSignatures = new Set(next.gaps.map((gap) => gap.signature));
  return {
    coverageDelta: next.stats.coverage - previous.stats.coverage,
    gapNodesDelta: next.stats.gapNodes - previous.stats.gapNodes,
    matchedDelta: next.stats.matchedNodes - previous.stats.matchedNodes,
    newGaps: next.gaps.filter((gap) => !previousSignatures.has(gap.signature)),
    resolvedGaps: previous.gaps.filter((gap) => !nextSignatures.has(gap.signature)),
  };
}

/** Most recent comparison in history that is not the current one. */
export function findPreviousComparison(
  entries: { result: ComparisonResult }[],
  current: ComparisonResult | null,
): ComparisonResult | null {
  if (!current) return null;
  const found = entries.find((entry) => entry.result.id !== current.id);
  return found?.result ?? null;
}

export function signedPercent(delta: number): string {
  const percent = Math.round(delta * 100);
  if (percent === 0) return '±0%';
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
}
