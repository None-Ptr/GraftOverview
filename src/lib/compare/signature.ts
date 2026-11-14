import type {
  ComparisonStats,
  GapSuggestion,
  Locale,
  NodeId,
  TargetSystem,
} from '$lib/types';
import { nodePathSignatures } from '$lib/signature';

/** Path signatures for every target node (§3.2). */
export function targetPathSignatures(
  target: TargetSystem,
  locale: Locale,
): Map<NodeId, string> {
  return nodePathSignatures(target.root, locale);
}

/** Ignored gaps are kept, only their status changes — never delete (§4.5). */
export function withIgnored(gaps: GapSuggestion[], ignored: string[]): GapSuggestion[] {
  const ignoredSet = new Set(ignored);
  return gaps.map((gap) => ({
    ...gap,
    status: ignoredSet.has(gap.signature) ? 'ignored' : 'pending',
  }));
}

export function activeGaps(gaps: GapSuggestion[]): GapSuggestion[] {
  return gaps.filter((gap) => gap.status === 'pending');
}

/** Stats always count ALL gaps, so ignoring a gap never inflates coverage. */
export function computeStats(gaps: GapSuggestion[], targetNodes: number): ComparisonStats {
  const gapNodes = Math.min(
    targetNodes,
    gaps.reduce((sum, gap) => sum + Math.max(1, gap.nodeCount), 0),
  );
  const matchedNodes = Math.max(0, targetNodes - gapNodes);
  const coverage = targetNodes > 0 ? Math.min(1, Math.max(0, matchedNodes / targetNodes)) : 0;
  return { targetNodes, matchedNodes, gapNodes, coverage };
}
