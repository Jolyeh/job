import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule, Languages } from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { Lang } from '../../core/i18n/lang';

/**
 * Sélecteur de langue FR / EN.
 * `compact` = pastille discrète pour les en-têtes ; sinon libellés complets.
 */
@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div
      class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1"
      role="group"
      [attr.aria-label]="i18n.t('common.language')"
    >
      @if (!compact()) {
        <lucide-angular [img]="LangIcon" class="ml-1.5 size-4 text-ink-400" aria-hidden="true" />
      }
      @for (option of options; track option) {
        <button
          type="button"
          class="rounded-full px-2.5 py-1 text-xs font-bold transition"
          [class]="
            i18n.lang() === option
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
          "
          [attr.aria-pressed]="i18n.lang() === option"
          (click)="select(option)"
        >
          {{ i18n.label(option) }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly LangIcon = Languages;
  protected readonly options: Lang[] = ['fr', 'en'];

  readonly compact = input<boolean>(false);

  select(lang: Lang): void {
    this.i18n.setLang(lang);
  }
}
