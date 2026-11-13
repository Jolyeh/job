import { Injectable, computed, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

/** État d'interface transversal : progression réseau et notifications. */
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly pending = signal(0);
  private readonly toastsState = signal<Toast[]>([]);
  private sequence = 0;

  readonly isLoading = computed(() => this.pending() > 0);
  readonly toasts = this.toastsState.asReadonly();

  startRequest(): void {
    this.pending.update((value) => value + 1);
  }

  endRequest(): void {
    this.pending.update((value) => Math.max(0, value - 1));
  }

  notify(message: string, variant: Toast['variant'] = 'info', ttlMs = 4200): void {
    const toast: Toast = { id: ++this.sequence, message, variant };
    this.toastsState.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(toast.id), ttlMs);
  }

  dismiss(id: number): void {
    this.toastsState.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
