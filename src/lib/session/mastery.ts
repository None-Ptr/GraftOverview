import type {
  ComparisonResult,
  KnowledgeNode,
  Locale,
  MasteryRecord,
  NodeId,
  TestSession,
} from '$lib/types';
import { normalizeText } from '$lib/signature';

function hasTopic(root: KnowledgeNode, topic: string, locale: Locale): boolean {
  const wanted = normalizeText(topic, locale);
  if (normalizeText(root.topic, locale) === wanted) return true;
  return root.children.some((child) => hasTopic(child, topic, locale));
}

/**
 * Derive the per-target-node verdict after a submitted `test` session.
 *
 * - matched in this attempt -> mastered (confidence kept for display only)
 * - otherwise present in the attempt or the workspace map -> learning
 * - otherwise absent everywhere -> no record (shown as 未学)
 *
 * The target root is the domain name, not a knowledge claim, so it is skipped.
 * Practice sessions never call this.
 */
export function computeMastery(
  session: TestSession,
  result: ComparisonResult,
  workspaceMap: KnowledgeNode,
  locale: Locale,
  at: string = new Date().toISOString(),
): Record<NodeId, MasteryRecord> {
  const out: Record<NodeId, MasteryRecord> = {};
  const matched = new Map(result.matches.map((match) => [match.targetId, match]));

  const walk = (node: KnowledgeNode, depth: number): void => {
    if (depth > 0) {
      const match = matched.get(node.id);
      if (match) {
        out[node.id] = {
          state: 'mastered',
          confidence: match.confidence,
          sessionId: session.id,
          at,
        };
      } else if (
        hasTopic(session.attempt.root, node.topic, locale) ||
        hasTopic(workspaceMap, node.topic, locale)
      ) {
        out[node.id] = { state: 'learning', confidence: null, sessionId: session.id, at };
      }
    }
    for (const child of node.children) walk(child, depth + 1);
  };

  walk(session.targetSnapshot.root, 0);
  return out;
}
