import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, Check, Info, TriangleAlert, X } from 'lucide-angular';
import { UiStore } from '../../core/services/ui.store';

/** Pile de notifications non bloquantes (coin supérieur droit). */
@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div
      class="pointer-events-none fixed right-4 top-4 z-100 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of ui.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lift animate-fade-up"
          [class]="borderClass(toast.variant)"
          role="status"
        >
          <lucide-angular
            [img]="iconFor(toast.variant)"
            class="mt-0.5 size-4.5 shrink-0"
            [class]="iconClass(toast.variant)"
          />
          <p class="flex-1 text-sm font-medium text-ink-800">{{ toast.message }}</p>
          <button
            type="button"
            class="btn-icon -m-1 size-7"
            aria-label="Fermer la notification"
            (click)="ui.dismiss(toast.id)"
          >
            <lucide-angular [img]="XIcon" class="size-3.5" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly ui = inject(UiStore);

  readonly CheckIcon = Check;
  readonly InfoIcon = Info;
  readonly WarnIcon = TriangleAlert;
  readonly XIcon = X;

  iconFor(variant: 'success' | 'error' | 'info') {
    return variant === 'success' ? this.CheckIcon : variant === 'error' ? this.WarnIcon : this.InfoIcon;
  }

  iconClass(variant: 'success' | 'error' | 'info'): string {
    return variant === 'success'
      ? 'text-success-500'
      : variant === 'error'
        ? 'text-danger-500'
        : 'text-brand-500';
  }

  borderClass(variant: 'success' | 'error' | 'info'): string {
    return variant === 'success'
      ? 'border-success-500/30'
      : variant === 'error'
        ? 'border-danger-500/30'
        : 'border-ink-200';
  }
}
