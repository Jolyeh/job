import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BadgeCheck,
  LucideAngularModule,
  MessageSquareQuote,
  Target,
} from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher.component';

/**
 * Gabarit commun aux écrans d'authentification.
 *
 * Deux colonnes en desktop (panneau de présentation + formulaire), une seule
 * en mobile — le formulaire passe en premier, avec l'accès à la langue.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="grid min-h-dvh bg-white lg:grid-cols-[1fr_minmax(0,32rem)]">
      <!-- ===================== Panneau de présentation ==================== -->
      <section
        class="relative hidden overflow-hidden bg-ink-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
      >
        <div
          class="pointer-events-none absolute inset-0"
          style="background-image:
            radial-gradient(50rem 32rem at 12% 0%, rgb(194 65 12 / 0.55), transparent 62%),
            radial-gradient(38rem 28rem at 92% 100%, rgb(249 115 22 / 0.32), transparent 60%);"
          aria-hidden="true"
        ></div>

        <a routerLink="/" class="relative flex items-center gap-2.5" [attr.aria-label]="i18n.t('app.name')">
          <span
            class="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur"
          >
            <lucide-angular [img]="TargetIcon" class="size-5 text-brand-200" />
          </span>
          <span class="font-display text-xl font-extrabold tracking-tight">
            Job<span class="text-brand-300">Radar</span>
          </span>
        </a>

        <div class="relative max-w-lg">
          <h1 class="font-display text-3xl font-extrabold leading-[1.1] tracking-tight xl:text-4xl">
            {{ i18n.t('auth.marketing.title') }}
          </h1>

          <ul class="mt-7 space-y-3.5">
            @for (pointKey of points; track pointKey) {
              <li class="flex items-start gap-3">
                <lucide-angular [img]="CheckIcon" class="mt-0.5 size-5 shrink-0 text-brand-300" />
                <span class="text-sm text-ink-200">{{ i18n.t(pointKey) }}</span>
              </li>
            }
          </ul>

          <blockquote
            class="mt-8 flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
          >
            <lucide-angular [img]="QuoteIcon" class="mt-0.5 size-5 shrink-0 text-brand-300" />
            <p class="text-sm italic text-ink-200">{{ i18n.t('auth.marketing.quote') }}</p>
          </blockquote>
        </div>

        <!-- Rappel de format uniquement : aucun identifiant réel n'est exposé. -->
        <div class="relative text-xs text-ink-400">
          <p class="font-semibold text-ink-300">{{ i18n.t('auth.hint.format') }}</p>
          <p class="mt-1">{{ i18n.t('auth.hint.emailFormat') }}</p>
          <p>{{ i18n.t('auth.hint.passwordFormat') }}</p>
        </div>
      </section>

      <!-- ============================ Formulaire ========================== -->
      <section class="flex flex-col px-4 py-6 sm:px-8 sm:py-10">
        <div class="mb-6 flex items-center gap-2 lg:justify-end">
          <a routerLink="/" class="flex items-center gap-2 lg:hidden" [attr.aria-label]="i18n.t('app.name')">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <lucide-angular [img]="TargetIcon" class="size-5" />
            </span>
            <span class="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Job<span class="text-brand-600">Radar</span>
            </span>
          </a>
          <app-language-switcher [compact]="true" class="ml-auto" />
        </div>

        <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-6">
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthLayoutComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly TargetIcon = Target;
  protected readonly CheckIcon = BadgeCheck;
  protected readonly QuoteIcon = MessageSquareQuote;

  protected readonly points = [
    'auth.marketing.point1',
    'auth.marketing.point2',
    'auth.marketing.point3',
  ];
}
