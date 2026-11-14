import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChartNoAxesColumn,
  Globe,
  Languages,
  LucideAngularModule,
  Sparkles,
  Target,
} from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher.component';

/**
 * Page d'accueil publique (vitrine).
 *
 * Aucune donnée chargée : la page est entièrement statique, pour rester
 * instantanée et indexable. Les CTA mènent à l'inscription ou à la connexion.
 */
@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule, LanguageSwitcherComponent],
  template: `
    <div class="min-h-dvh bg-white">
      <!-- ============================== En-tête ============================ -->
      <header class="sticky top-0 z-30 border-b border-ink-200/70 bg-white/90 backdrop-blur-lg">
        <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <a routerLink="/" class="flex items-center gap-2.5" [attr.aria-label]="i18n.t('app.name')">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <lucide-angular [img]="TargetIcon" class="size-5" />
            </span>
            <span class="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Job<span class="text-brand-600">Radar</span>
            </span>
          </a>

          <div class="ml-auto flex items-center gap-2">
            <app-language-switcher [compact]="true" class="hidden sm:inline-flex" />
            <a
              routerLink="/login"
              class="hidden rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 sm:inline-flex"
            >
              {{ i18n.t('landing.cta.secondary') }}
            </a>
            <a
              routerLink="/register"
              class="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:bg-brand-800"
            >
              {{ i18n.t('landing.cta.primary') }}
              <lucide-angular [img]="ArrowIcon" class="size-4" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <!-- ============================== Hero ============================= -->
        <section class="relative overflow-hidden">
          <div
            class="pointer-events-none absolute inset-0 -z-10"
            style="background:
              radial-gradient(60rem 30rem at 90% -10%, #ffedd5 0%, transparent 60%),
              radial-gradient(50rem 25rem at 0% 10%, #fff7ed 0%, transparent 55%);"
            aria-hidden="true"
          ></div>

          <div class="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pt-24">
            <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <p
                  class="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700"
                >
                  <lucide-angular [img]="SparklesIcon" class="size-3.5" />
                  {{ i18n.t('landing.eyebrow') }}
                </p>

                <h1
                  class="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl"
                >
                  {{ i18n.t('landing.title.line1') }}<br />
                  <span class="font-serif italic font-normal text-brand-600">
                    {{ i18n.t('landing.title.line2') }}
                  </span>
                </h1>

                <p class="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
                  {{ i18n.t('landing.subtitle') }}
                </p>

                <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    routerLink="/register"
                    class="inline-flex items-center justify-center gap-2 rounded-full bg-ink-900 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink-800 active:bg-black"
                  >
                    {{ i18n.t('landing.cta.primary') }}
                    <lucide-angular [img]="ArrowIcon" class="size-4" />
                  </a>
                  <a
                    routerLink="/login"
                    class="inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3.5 text-sm font-bold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
                  >
                    {{ i18n.t('landing.cta.secondary') }}
                  </a>
                </div>

                <p class="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                  <lucide-angular [img]="CheckIcon" class="size-3.5 text-success-500" />
                  {{ i18n.t('landing.cta.note') }}
                </p>
              </div>

              <!-- Carte d'aperçu (statique, aucune donnée) -->
              <div class="relative">
                <div class="card rotate-1 p-5 shadow-lift sm:p-6">
                  <div class="flex items-start gap-3">
                    <span
                      class="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-sm font-bold text-white"
                      aria-hidden="true"
                    >
                      A
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-display text-base font-bold text-ink-900">
                        Développeur Full-Stack
                      </p>
                      <p class="truncate text-sm text-ink-500">{{ i18n.t('landing.hero.card.title') }}</p>
                    </div>
                    <span class="badge-brand ml-auto shrink-0">FR</span>
                  </div>

                  <div class="mt-4 flex items-center gap-4">
                    <div
                      class="grid size-16 shrink-0 place-items-center rounded-full"
                      style="background: conic-gradient(#c2410c 88%, #ffedd5 0)"
                    >
                      <span
                        class="grid size-[3.25rem] place-items-center rounded-full bg-white text-sm font-extrabold text-ink-900"
                      >
                        88
                      </span>
                    </div>
                    <div class="min-w-0 flex-1 space-y-1.5">
                      @for (bar of bars; track bar.labelKey) {
                        <div>
                          <div class="flex justify-between text-[10px] font-semibold text-ink-500">
                            <span>{{ i18n.t(bar.labelKey) }}</span>
                          </div>
                          <div class="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                            <div
                              class="h-full rounded-full bg-brand-600"
                              [style.width.%]="bar.value"
                            ></div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <p class="mt-4 flex items-center gap-1.5 text-xs text-ink-600">
                    <lucide-angular [img]="BadgeIcon" class="size-4 text-success-600" />
                    {{ i18n.t('landing.hero.card.match') }}
                  </p>
                </div>

                <div
                  class="absolute -bottom-5 -left-3 hidden rotate-[-3deg] rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-soft sm:block"
                >
                  <p class="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                    <lucide-angular [img]="GlobeIcon" class="size-4 text-brand-600" />
                    FR · EN
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============================ Fonctions ========================== -->
        <section class="border-y border-ink-200/70 bg-ink-50/60 py-16 sm:py-20">
          <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 class="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {{ i18n.t('landing.features.title') }}
            </h2>
            <p class="mt-2 max-w-2xl text-ink-600">{{ i18n.t('landing.features.subtitle') }}</p>

            <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (feature of features; track feature.titleKey) {
                <article class="card p-5">
                  <span
                    class="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"
                  >
                    <lucide-angular [img]="feature.icon" class="size-5" />
                  </span>
                  <h3 class="mt-3 font-display text-base font-bold">{{ i18n.t(feature.titleKey) }}</h3>
                  <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
                    {{ i18n.t(feature.textKey) }}
                  </p>
                </article>
              }
            </div>
          </div>
        </section>

        <!-- ====================== Bandeau bilingue ========================= -->
        <section class="py-16 sm:py-20">
          <div class="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                <lucide-angular [img]="LanguagesIcon" class="size-4" />
                FR · EN
              </span>
              <h2 class="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {{ i18n.t('landing.languages.title') }}
              </h2>
              <p class="mt-2 text-ink-600">{{ i18n.t('landing.languages.text') }}</p>
              <div class="mt-4 flex items-center gap-2">
                <app-language-switcher />
              </div>
            </div>

            <div class="card divide-y divide-ink-100">
              @for (sample of languageSamples; track sample.code) {
                <div class="flex items-center gap-3 p-4">
                  <span class="badge shrink-0" [class]="sample.badgeClass">{{ sample.code }}</span>
                  <p class="min-w-0 flex-1 truncate text-sm text-ink-700">{{ sample.text }}</p>
                </div>
              }
            </div>
          </div>
        </section>

        <!-- ========================== Comment ça marche ==================== -->
        <section class="border-t border-ink-200/70 bg-white py-16 sm:py-20">
          <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 class="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {{ i18n.t('landing.how.title') }}
            </h2>
            <ol class="mt-8 grid gap-4 sm:grid-cols-3">
              @for (step of steps; track step.number) {
                <li class="rounded-2xl border border-ink-200 bg-white p-5">
                  <span class="font-display text-3xl font-extrabold text-brand-200">{{ step.number }}</span>
                  <h3 class="mt-1 font-display text-base font-bold">{{ i18n.t(step.titleKey) }}</h3>
                  <p class="mt-1.5 text-sm text-ink-600">{{ i18n.t(step.textKey) }}</p>
                </li>
              }
            </ol>

            <div class="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-ink-900 px-6 py-10 text-center">
              <h3 class="font-display text-xl font-extrabold text-white sm:text-2xl">
                {{ i18n.t('landing.title.line1') }} {{ i18n.t('landing.title.line2') }}
              </h3>
              <a
                routerLink="/register"
                class="mt-1 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-ink-900 transition hover:bg-brand-400"
              >
                {{ i18n.t('landing.cta.primary') }}
                <lucide-angular [img]="ArrowIcon" class="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- ============================== Pied =============================== -->
      <footer class="border-t border-ink-200 bg-ink-50/60 py-10">
        <div class="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
          <div>
            <p class="font-display text-base font-extrabold text-ink-900">
              Job<span class="text-brand-600">Radar</span>
            </p>
            <p class="mt-1 text-xs text-ink-500">{{ i18n.t('app.tagline') }}</p>
            <p class="mt-3 text-xs text-ink-400">
              © {{ year }} JobRadar. {{ i18n.t('landing.footer.rights') }}
            </p>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-ink-400">
              {{ i18n.t('landing.footer.product') }}
            </p>
            <ul class="mt-2 space-y-1.5 text-sm text-ink-600">
              <li><a routerLink="/register" class="hover:text-brand-700">{{ i18n.t('nav.jobs') }}</a></li>
              <li><a routerLink="/register" class="hover:text-brand-700">{{ i18n.t('nav.sites') }}</a></li>
              <li><a routerLink="/register" class="hover:text-brand-700">{{ i18n.t('nav.bookmarks') }}</a></li>
            </ul>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-ink-400">
              {{ i18n.t('landing.footer.account') }}
            </p>
            <ul class="mt-2 space-y-1.5 text-sm text-ink-600">
              <li><a routerLink="/login" class="hover:text-brand-700">{{ i18n.t('auth.login.submit') }}</a></li>
              <li><a routerLink="/register" class="hover:text-brand-700">{{ i18n.t('auth.register.submit') }}</a></li>
            </ul>
            <p class="mt-3 text-xs text-ink-400">{{ i18n.t('landing.footer.note') }}</p>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class LandingPageComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly TargetIcon = Target;
  protected readonly ArrowIcon = ArrowRight;
  protected readonly SparklesIcon = Sparkles;
  protected readonly CheckIcon = BadgeCheck;
  protected readonly BadgeIcon = BadgeCheck;
  protected readonly GlobeIcon = Globe;
  protected readonly LanguagesIcon = Languages;

  protected readonly year = new Date().getFullYear();

  protected readonly bars = [
    { labelKey: 'landing.hero.card.skill1', value: 92 },
    { labelKey: 'landing.hero.card.skill2', value: 78 },
    { labelKey: 'landing.hero.card.skill3', value: 64 },
  ];

  protected readonly features = [
    {
      titleKey: 'landing.feature.sites.title',
      textKey: 'landing.feature.sites.text',
      icon: Globe,
    },
    {
      titleKey: 'landing.feature.score.title',
      textKey: 'landing.feature.score.text',
      icon: ChartNoAxesColumn,
    },
    {
      titleKey: 'landing.feature.tracking.title',
      textKey: 'landing.feature.tracking.text',
      icon: Briefcase,
    },
  ];

  protected readonly steps = [
    { number: '01', titleKey: 'landing.how.step1.title', textKey: 'landing.how.step1.text' },
    { number: '02', titleKey: 'landing.how.step2.title', textKey: 'landing.how.step2.text' },
    { number: '03', titleKey: 'landing.how.step3.title', textKey: 'landing.how.step3.text' },
  ];

  // Échantillons illustrant l'étiquetage des offres (statique).
  protected readonly languageSamples = [
    {
      code: 'FR',
      badgeClass: 'bg-brand-50 text-brand-700',
      text: 'Développeur Angular confirmé — Paris, hybride',
    },
    {
      code: 'EN',
      badgeClass: 'bg-ink-100 text-ink-600',
      text: 'Senior Angular Engineer — Remote, full-time',
    },
    {
      code: 'FR',
      badgeClass: 'bg-brand-50 text-brand-700',
      text: 'Chef de projet digital — Lyon, CDI',
    },
    {
      code: 'EN',
      badgeClass: 'bg-ink-100 text-ink-600',
      text: 'Product Designer — Berlin, hybrid',
    },
  ];
}
