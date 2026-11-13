import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { LucideAngularModule, Sparkles, WandSparkles } from 'lucide-angular';
import { ProfileStore } from '../../core/services/profile.store';
import { ProfileFormComponent } from './profile-form.component';

/** Page « Mon profil » : charge le profil puis délègue au formulaire. */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileFormComponent, LucideAngularModule],
  template: `
    <div class="mx-auto max-w-6xl">
      <header class="mb-6">
        <p class="badge-brand">
          <lucide-angular [img]="SparklesIcon" class="size-3.5" />
          Profil de recherche
        </p>
        <h1 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Votre profil pilote les recommandations
        </h1>
        <p class="mt-1.5 max-w-2xl text-sm text-ink-500">
          Plus votre profil est précis, plus le score de correspondance est fiable. Vous pouvez
          le modifier à tout moment : les offres sont reclassées immédiatement.
        </p>
      </header>

      @if (store.isLoading() && !profile()) {
        <!-- Squelette de chargement -->
        <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div class="space-y-6">
            @for (block of [1, 2, 3]; track block) {
              <div class="card space-y-4 p-6">
                <div class="skeleton h-5 w-40"></div>
                <div class="skeleton h-10 w-full"></div>
                <div class="skeleton h-10 w-full"></div>
              </div>
            }
          </div>
          <div class="card space-y-3 p-6">
            <div class="skeleton h-24 w-full"></div>
            <div class="skeleton h-10 w-full"></div>
            <div class="skeleton h-10 w-full"></div>
          </div>
        </div>
      } @else {
        @if (!profile()) {
          <div class="mb-5 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <lucide-angular [img]="WandSparklesIcon" class="mt-0.5 size-5 shrink-0 text-brand-600" />
            <div>
              <p class="text-sm font-semibold text-brand-900">Créons votre profil de recherche</p>
              <p class="text-sm text-brand-800/80">
                Renseignez votre poste, vos compétences et vos critères : nous classerons les
                offres par pertinence dès l'enregistrement.
              </p>
            </div>
          </div>
        }
        <app-profile-form [profile]="profile()" (saved)="onSaved()" />
      }
    </div>
  `,
})
export class ProfilePageComponent implements OnInit {
  readonly store = inject(ProfileStore);

  readonly SparklesIcon = Sparkles;
  readonly WandSparklesIcon = WandSparkles;

  readonly profile = computed(() => this.store.profile());

  ngOnInit(): void {
    this.store.load();
  }

  onSaved(): void {
    // Le store a déjà mis à jour son état : rien d'autre à faire ici.
  }
}
