import type { MapCommandKind } from '$lib/state/ui.svelte';

/** Routes the canvas toolbar to the target-editing instance while it is mounted. */
class TargetEditorController {
  private exec: ((kind: MapCommandKind) => void) | null = null;

  register(exec: ((kind: MapCommandKind) => void) | null): void {
    this.exec = exec;
  }

  run(kind: MapCommandKind): void {
    this.exec?.(kind);
  }
}

export const targetEditor = new TargetEditorController();
