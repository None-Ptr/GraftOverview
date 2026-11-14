import type { NodeId } from '$lib/types';
import { mapHistory } from './history.svelte';
import type { MapCommand, MapCommandKind } from '$lib/state/ui.svelte';

export type EditorCommandHandler = (kind: MapCommandKind, nodeId?: NodeId) => void;

/**
 * Shared editor state. A0's CanvasShell/toolbar sends commands through
 * `ui.mapCommand`; MapCanvas registers the handler that executes them.
 */
class EditorController {
  canUndo = $derived(mapHistory.canUndo);
  canRedo = $derived(mapHistory.canRedo);
  zoom = $state(100);
  selectedNodeId = $state<NodeId | null>(null);
  private handler: EditorCommandHandler | null = null;
  private lastHandledTs = 0;

  register(handler: EditorCommandHandler | null): void {
    this.handler = handler;
  }

  run(kind: MapCommandKind, nodeId?: NodeId): void {
    this.handler?.(kind, nodeId);
  }

  /** Called from MapCanvas's $effect watching ui.mapCommand. */
  consume(command: MapCommand | null): void {
    if (!command || command.ts === this.lastHandledTs) return;
    this.lastHandledTs = command.ts;
    this.run(command.kind, command.nodeId);
  }
}

export const editor = new EditorController();
