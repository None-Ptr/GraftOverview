/**
 * Shared data contract (§3.1). Owned by A0 — frozen after M0.
 * Other agents: read only. To change, write docs/contract-requests/<agent>-<date>.md.
 */
export type NodeId = string; // stable slug for templates; nanoid(8) for user/generated nodes
export type Locale = 'zh' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';
export type PanelTab = 'target' | 'suggestions' | 'history';
export type Priority = 'high' | 'medium' | 'low';
export type TargetSource = 'template' | 'generated' | 'manual' | 'imported';

export interface KnowledgeNode {
  id: NodeId;
  topic: string; // 1–120 chars, trimmed
  note?: string; // 0–200 chars
  children: KnowledgeNode[];
  collapsed?: boolean; // persisted for the user map only
}

export interface KnowledgeMap {
  id: string; // nanoid(10)
  title: string; // 1–60 chars
  root: KnowledgeNode; // single root
  updatedAt: string; // ISO 8601
}

export interface GoalSpec {
  domain: string; // 1–40 chars
  goal: string; // 1–200 chars
  level: 'beginner' | 'intermediate' | 'advanced';
  horizon?: string;
  weeklyHours?: number; // 1–40
  locale: Locale;
}

export interface TargetSystem extends KnowledgeMap {
  source: TargetSource;
  templateId?: string;
  goal?: GoalSpec;
}

export interface Match {
  targetId: NodeId;
  userNodeId: NodeId;
  confidence: number; // 0–1
}

export interface GapSuggestion {
  signature: string; // stable hash of normalized path + title
  targetId: NodeId; // root of the target subtree
  suggestedParentId: NodeId | null; // user node; null = attach under user root
  topic: string;
  reason: string; // 1–300 chars
  selfCheck: string[]; // 1–3
  links: { title: string; url: string }[]; // 0–2, http/https
  priority: Priority;
  nodeCount: number; // nodes in the target subtree, including root
  status: 'pending' | 'adopted' | 'ignored';
}

export interface ExtraNode {
  userNodeId: NodeId;
  reason: string; // 1–200 chars
}

export interface ComparisonStats {
  targetNodes: number;
  matchedNodes: number;
  gapNodes: number;
  coverage: number; // 0–1, displayed as rounded integer percent
}

export interface ComparisonResult {
  id: string;
  createdAt: string;
  mapSignature: string;
  targetSignature: string;
  matches: Match[];
  gaps: GapSuggestion[];
  extras: ExtraNode[];
  stats: ComparisonStats;
  model: { host: string; model: string }; // no key, no full baseUrl query string
}

export interface Workspace {
  schemaVersion: 1;
  map: KnowledgeMap;
  target: TargetSystem | null;
  comparison: ComparisonResult | null;
  ignoredSignatures: string[];
  ui: {
    locale: Locale;
    panelTab: PanelTab;
  };
  /** target node id -> latest verdict (v0.4, optional). */
  mastery?: Record<NodeId, MasteryRecord>;
  /** The one active attempt, if any (v0.4, optional). */
  session?: TestSession | null;
  /** Most recent submitted sessions, newest first (v0.4, optional, capped). */
  sessions?: TestSession[];
}

export interface StoredLlmSettings {
  schemaVersion: 1;
  presetId: string; // 'openai' | 'deepseek' | 'siliconflow' | 'ollama' | 'custom'
  baseUrl: string; // no trailing /
  apiKey: string;
  model: string;
  temperature: number; // 0–1
  maxTokens: number; // 256–8192
  jsonMode: boolean;
  /** Token-saving mode: omit target notes from comparison prompts. */
  compactPrompt?: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  targetTitle: string;
  mapTitle: string;
  stats: ComparisonStats;
  result: ComparisonResult;
}

/* ---- Test sessions (v0.4) --------------------------------------------- */

export type SessionMode = 'test' | 'practice';
export type MasteryState = 'learning' | 'mastered';

/** Per-target-node verdict. Written only by a submitted `test` session. */
export interface MasteryRecord {
  state: MasteryState;
  confidence: number | null; // 0–1 from the latest test match; null when unmatched
  sessionId: string;
  at: string; // ISO 8601
}

/** A closed/open-book attempt attached to the workspace that owns the target. */
export interface TestSession {
  id: string;
  mode: SessionMode;
  /** active → drawing; locked → attempt frozen, awaiting/retrying the compare; submitted → verdict written. */
  status: 'active' | 'locked' | 'submitted';
  startedAt: string;
  submittedAt: string | null;
  /** Frozen copy of the target at session start. */
  targetSnapshot: TargetSystem;
  attempt: KnowledgeMap;
  resultId: string | null;
}

export interface SharePayload {
  v: 1;
  m: KnowledgeMap;
  t: TargetSystem;
}

export interface GhostTree {
  signature: string;
  parentId: NodeId | null;
  root: KnowledgeNode; // cloned from target subtree, IDs prefixed `ghost-`
  priority: 'high';
}

/** Convenience aliases used across feature modules. */
export type GapStatus = GapSuggestion['status'];
export type Link = GapSuggestion['links'][number];
