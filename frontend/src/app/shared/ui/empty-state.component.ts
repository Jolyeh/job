import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { LucideAngularModule, SearchX } from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';

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
  private readonly i18n = inject(I18nService);

  readonly title = input(this.i18n.t('jobs.emptyTitle'));
  readonly description = input(this.i18n.t('jobs.emptyText'));
  readonly actionLabel = input<string | null>(null);
  readonly icon = input(SearchX);
  readonly action = output<void>();
}
