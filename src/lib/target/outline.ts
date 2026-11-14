import { nanoid } from 'nanoid';
import type { KnowledgeNode, NodeId } from '$lib/types';

export const MAX_OUTLINE_NODES = 100;
const NOTE_SEPARATOR = '::';

export interface OutlineError {
  line: number;
  message: string;
}

export interface ParseResult {
  root: KnowledgeNode | null;
  errors: OutlineError[];
}

export interface ParseOptions {
  /** Stable IDs for templates; defaults to nanoid(8) for user content. */
  idFactory?: (index: number, topic: string) => NodeId;
  /** Wrapper topic when the outline has multiple top-level roots. */
  wrapTitle?: string;
  /** Hard node cap while parsing (editor uses 100; packs use a higher safety cap). */
  maxNodes?: number;
}

const defaultIdFactory = (): NodeId => nanoid(8);

/**
 * Parse a 2-space-indented Markdown outline.
 * Syntax: `- Topic :: optional note` (note truncated to 200 chars).
 */
export function parseOutline(text: string, options: ParseOptions = {}): ParseResult {
  const errors: OutlineError[] = [];
  const idFactory = options.idFactory ?? defaultIdFactory;
  const maxNodes = options.maxNodes ?? MAX_OUTLINE_NODES;
  const roots: KnowledgeNode[] = [];
  const stack: { indent: number; node: KnowledgeNode }[] = [];
  let index = 0;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((raw, i) => {
    const lineNumber = i + 1;
    if (raw.trim() === '') return;
    if (index >= maxNodes) {
      errors.push({ line: lineNumber, message: 'node limit exceeded' });
      return;
    }
    const leading = raw.match(/^[ \t]*/)?.[0] ?? '';
    if (leading.includes('\t') || leading.length % 2 !== 0) {
      errors.push({ line: lineNumber, message: 'bad indent' });
      return;
    }
    const indent = leading.length;
    const content = raw
      .trim()
      .replace(/^[-*+](?:\s+|$)/, '')
      .replace(/^#{1,6}(?:\s+|$)/, '');
    const parts = content.split(NOTE_SEPARATOR);
    const topic = (parts[0] ?? '').trim().slice(0, 120);
    if (!topic) {
      errors.push({ line: lineNumber, message: 'empty topic' });
      return;
    }
    const note = parts.slice(1).join(NOTE_SEPARATOR).trim().slice(0, 200);
    const node: KnowledgeNode = {
      id: idFactory(index, topic),
      topic,
      children: [],
    };
    if (note) node.note = note;
    index += 1;

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.node.children.push(node);
    else roots.push(node);
    stack.push({ indent, node });
  });

  if (roots.length === 0) {
    errors.unshift({ line: 1, message: 'no root' });
    return { root: null, errors };
  }
  if (roots.length === 1) return { root: roots[0], errors };

  const wrapper: KnowledgeNode = {
    id: idFactory(index, options.wrapTitle ?? 'root'),
    topic: options.wrapTitle ?? 'root',
    children: roots,
  };
  return { root: wrapper, errors };
}

/** Serialize a canonical tree back to the outline syntax (round-trip safe). */
export function serializeOutline(root: KnowledgeNode): string {
  const lines: string[] = [];
  const walk = (node: KnowledgeNode, depth: number): void => {
    const indent = '  '.repeat(depth);
    const note = node.note ? ` ${NOTE_SEPARATOR} ${node.note}` : '';
    lines.push(`${indent}- ${node.topic}${note}`);
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return lines.join('\n');
}

export function countNodes(node: KnowledgeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function maxDepth(node: KnowledgeNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(maxDepth));
}
