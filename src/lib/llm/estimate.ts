import type { GoalSpec, KnowledgeMap, Locale, NodeId, StoredLlmSettings, TargetSystem } from '$lib/types';
import { planChunks } from '$lib/compare/chunk';
import { findTreeNode } from '$lib/compare/scope';
import { countNodes, serializeTrees } from '$lib/compare/serialize';
import {
  COMPARISON_SYSTEM,
  GENERATION_SYSTEM,
  comparisonUserPrompt,
  generationUserPrompt,
} from '$lib/compare/prompt';
import { estimateMessagesTokens } from './tokens';

export interface TokenEstimate {
  requests: number;
  input: number;
  output: number;
  total: number;
}

/** Comparison output grows with the target: matches are cheap, gaps are verbose. */
const COMPARISON_OUTPUT_BASE = 120;
const COMPARISON_OUTPUT_PER_NODE = 32;
/** Generation asks for 60–140 nodes; assume ~100. */
const GENERATION_OUTPUT_NODES = 100;
const GENERATION_OUTPUT_PER_NODE = 32;
/** `testConnection` sends one short prompt and asks for 16 tokens. */
const TEST_CONNECTION_INPUT = 20;
const TEST_CONNECTION_OUTPUT = 16;

export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'unknown';
  }
}

function total(requests: number, input: number, output: number): TokenEstimate {
  return { requests, input, output, total: input + output };
}

/**
 * Mirrors `runComparison` exactly: same chunk plan, same serializer, same
 * prompts — so the number next to the button is what the request will cost.
 */
export function estimateComparison(
  map: KnowledgeMap,
  target: TargetSystem,
  settings: StoredLlmSettings,
  locale: Locale,
  scope: NodeId | null,
): TokenEstimate {
  let input = 0;
  let nodes = 0;
  let requests = 0;
  for (const chunk of planChunks(target, scope)) {
    const scopedRoot = chunk.scope ? findTreeNode(target.root, chunk.scope) : null;
    if (chunk.scope && !scopedRoot) continue;
    const scopedTarget: TargetSystem = scopedRoot ? { ...target, root: scopedRoot } : target;
    const trees = serializeTrees(scopedTarget, map, {
      includeTargetNotes: !settings.compactPrompt,
    });
    input += estimateMessagesTokens([
      { content: COMPARISON_SYSTEM },
      { content: comparisonUserPrompt(trees, locale) },
    ]);
    nodes += countNodes(scopedTarget.root);
    requests += 1;
  }
  if (requests === 0) {
    // No valid scope: the request would be rejected before calling the API.
    return total(0, 0, 0);
  }
  const output = Math.min(
    settings.maxTokens * requests,
    COMPARISON_OUTPUT_BASE + nodes * COMPARISON_OUTPUT_PER_NODE,
  );
  return total(requests, input, output);
}

export function estimateGeneration(
  goal: GoalSpec,
  settings: StoredLlmSettings,
): TokenEstimate {
  const input = estimateMessagesTokens([
    { content: GENERATION_SYSTEM },
    { content: generationUserPrompt(goal) },
  ]);
  const output = Math.min(
    settings.maxTokens,
    GENERATION_OUTPUT_NODES * GENERATION_OUTPUT_PER_NODE,
  );
  return total(1, input, output);
}

export function estimateTestConnection(): TokenEstimate {
  return total(1, TEST_CONNECTION_INPUT, TEST_CONNECTION_OUTPUT);
}
