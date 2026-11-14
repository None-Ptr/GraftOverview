export type ToastTone = 'info' | 'error' | 'success';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
  action?: ToastAction;
}

export interface ToastOptions {
  tone?: ToastTone;
  duration?: number;
  action?: ToastAction;
}

class ToastStore {
  items = $state<ToastItem[]>([]);
  private seq = 0;

  push(message: string, options: ToastOptions = {}): string {
    const id = `toast-${Date.now()}-${this.seq++}`;
    this.items = [
      ...this.items,
      {
        id,
        message,
        tone: options.tone ?? 'info',
        duration: options.duration ?? 5000,
        action: options.action,
      },
    ];
    return id;
  }

  error(message: string, action?: ToastAction): string {
    return this.push(message, { tone: 'error', action });
  }

  info(message: string, action?: ToastAction): string {
    return this.push(message, { tone: 'info', action });
  }

  dismiss(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
  }
}

export const toast = new ToastStore();
