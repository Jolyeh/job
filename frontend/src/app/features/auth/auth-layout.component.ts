import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  LucideAngularModule,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-angular';

/** Gabarit commun aux écrans d'authentification : panneau marketing + formulaire. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <!-- Panneau de gauche (marketing) -->
      <section
        class="relative hidden overflow-hidden bg-ink-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
        aria-hidden="true"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-70"
          style="background-image: radial-gradient(60rem 40rem at 10% 0%, rgb(79 70 229 / 0.55), transparent 60%), radial-gradient(40rem 30rem at 90% 100%, rgb(6 182 212 / 0.35), transparent 60%);"
        ></div>

        <div class="relative flex items-center gap-2.5">
          <span
            class="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur"
          >
            <lucide-angular [img]="Target" class="size-5 text-brand-200" />
          </span>
          <span class="font-display text-xl font-extrabold tracking-tight">
            Job<span class="text-brand-300">Radar</span>
          </span>
        </div>

        <div class="relative max-w-lg">
          <p class="badge bg-white/10 text-brand-100 ring-1 ring-white/15">
            <lucide-angular [img]="Sparkles" class="size-3.5" />
            Matching par compétences
          </p>
          <h1 class="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Les offres qui vous correspondent, <span class="text-brand-300">classées par pertinence.</span>
          </h1>
          <p class="mt-4 text-base leading-relaxed text-ink-300">
            JobRadar agrège France Travail et les plateformes remote, puis calcule un score
            de correspondance sur cinq critères : compétences, intitulé, salaire, expérience
            et localisation.
          </p>

          <ul class="mt-8 space-y-4">
            @for (feature of features; track feature.title) {
              <li class="flex items-start gap-3">
                <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <lucide-angular [img]="feature.icon" class="size-4 text-brand-200" />
                </span>
                <div>
                  <p class="text-sm font-semibold">{{ feature.title }}</p>
                  <p class="text-sm text-ink-400">{{ feature.description }}</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <p class="relative text-xs text-ink-500">
          Démo : demo&#64;jobradar.dev · Demo1234
        </p>
      </section>

      <!-- Panneau de droite (formulaire) -->
      <section class="flex items-center justify-center px-5 py-10 sm:px-8">
        <div class="w-full max-w-md">
          <div class="mb-8 flex items-center gap-2.5 lg:hidden">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <lucide-angular [img]="Target" class="size-5" />
            </span>
            <span class="font-display text-lg font-extrabold tracking-tight">
              Job<span class="text-brand-600">Radar</span>
            </span>
          </div>
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly Target = Target;
  readonly Sparkles = Sparkles;

  readonly features = [
    {
      title: 'Score explicable sur 100',
      description: 'Chaque offre détaille pourquoi elle vous correspond.',
      icon: TrendingUp,
    },
    {
      title: 'Agrégation multi-sources',
      description: 'France Travail, Remotive et catalogue interne, dédupliqués.',
      icon: Zap,
    },
    {
      title: 'Suivi de candidatures',
      description: 'Favoris, relances et historique de chaque étape.',
      icon: Target,
    },
  ];
}
