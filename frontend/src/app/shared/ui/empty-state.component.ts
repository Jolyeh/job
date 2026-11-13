import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAngularModule, SearchX } from 'lucide-angular';

/** État vide réutilisable (aucun résultat, aucun favori…). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div class="grid size-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
        <lucide-angular [img]="icon()" class="size-7" />
      </div>
      <h3 class="text-base font-semibold text-ink-900">{{ title() }}</h3>
      <p class="max-w-md text-sm text-ink-500">{{ description() }}</p>
      @if (actionLabel()) {
        <button type="button" class="btn-primary mt-2" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input('Aucun résultat');
  readonly description = input('Essayez de modifier vos critères de recherche.');
  readonly actionLabel = input<string | null>(null);
  readonly icon = input(SearchX);
  readonly action = output<void>();
}
