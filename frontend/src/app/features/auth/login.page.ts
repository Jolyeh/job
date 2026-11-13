import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, email } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { AuthResponse } from '../../core/models/api.models';
import { AuthLayoutComponent } from './auth-layout.component';

/**
 * Écran de connexion.
 * Le formulaire repose sur les Signal Forms (`form()` + schéma de validation),
 * sans ReactiveFormsModule ni FormsModule.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, LucideAngularModule, RouterLink, FormField],
  template: `
    <app-auth-layout>
      <h2 class="font-display text-2xl font-extrabold tracking-tight">Bon retour 👋</h2>
      <p class="mt-1.5 text-sm text-ink-500">
        Connectez-vous pour retrouver vos recommandations et votre suivi.
      </p>

      @if (auth.error()) {
        <div
          class="mt-5 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700"
          role="alert"
        >
          <lucide-angular [img]="CircleAlert" class="mt-0.5 size-4 shrink-0" />
          <span>{{ auth.error() }}</span>
        </div>
      }

      <form class="mt-6 space-y-4" (submit)="submit($event)" novalidate>
        <div>
          <label class="field-label" for="email">Adresse e-mail</label>
          <div class="relative">
            <lucide-angular
              [img]="MailIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              [formField]="loginForm.email"
              class="input pl-9.5"
              [class.input-invalid]="showEmailError()"
              placeholder="vous@exemple.fr"
            />
          </div>
          @if (showEmailError()) {
            <p class="field-error">
              <lucide-angular [img]="CircleAlert" class="size-3.5" />
              {{ fieldMessage(loginForm.email().errors(), 'Adresse e-mail invalide') }}
            </p>
          }
        </div>

        <div>
          <label class="field-label" for="password">Mot de passe</label>
          <div class="relative">
            <lucide-angular
              [img]="LockIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              [formField]="loginForm.password"
              class="input pl-9.5 pr-11"
              [class.input-invalid]="showPasswordError()"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              (click)="showPassword.set(!showPassword())"
            >
              <lucide-angular [img]="showPassword() ? EyeOffIcon : EyeIcon" class="size-4" />
            </button>
          </div>
          @if (showPasswordError()) {
            <p class="field-error">
              <lucide-angular [img]="CircleAlert" class="size-3.5" />
              {{ fieldMessage(loginForm.password().errors(), 'Le mot de passe est requis') }}
            </p>
          }
        </div>

        <button type="submit" class="btn-primary w-full" [disabled]="auth.isLoading() || loginForm().invalid()">
          @if (auth.isLoading()) {
            <lucide-angular [img]="LoaderIcon" class="size-4 animate-spin" />
            Connexion…
          } @else {
            Se connecter
            <lucide-angular [img]="ArrowRightIcon" class="size-4" />
          }
        </button>
      </form>

      <div class="mt-6 rounded-xl border border-ink-200 bg-ink-50/70 p-3.5">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Compte de démonstration</p>
        <div class="mt-1.5 flex items-center justify-between gap-3">
          <code class="text-sm font-medium text-ink-800">demo&#64;jobradar.dev / Demo1234</code>
          <button type="button" class="btn-secondary px-2.5 py-1.5 text-xs" (click)="fillDemo()">
            Remplir
          </button>
        </div>
      </div>

      <p class="mt-6 text-center text-sm text-ink-500">
        Pas encore de compte ?
        <a routerLink="/register" class="link">Créer un compte gratuitement</a>
      </p>
    </app-auth-layout>
  `,
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);
  private readonly bookmarksStore = inject(BookmarksStore);

  readonly fieldMessage = fieldMessage;

  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowRightIcon = ArrowRight;
  readonly LoaderIcon = LoaderCircle;
  readonly CircleAlert = CircleAlert;

  /** État du formulaire (Signal) + schéma de validation déclaratif. */
  readonly loginModel = signal({ email: '', password: '' });

  readonly loginForm = form(this.loginModel, (path) => {
    required(path.email, { message: "L'adresse e-mail est requise" });
    email(path.email, { message: 'Adresse e-mail invalide' });
    required(path.password, { message: 'Le mot de passe est requis' });
  });

  // On n'affiche l'erreur qu'après interaction (touched) ou tentative d'envoi.
  readonly showEmailError = computed(() => {
    const field = this.loginForm.email();
    return (field.touched() || this.submitted()) && field.invalid();
  });
  readonly showPasswordError = computed(() => {
    const field = this.loginForm.password();
    return (field.touched() || this.submitted()) && field.invalid();
  });

  fillDemo(): void {
    this.loginModel.set({ email: 'demo@jobradar.dev', password: 'Demo1234' });
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.loginForm().markAsTouched();

    if (this.loginForm().invalid()) return;

    this.auth
      .runAuthRequest(
        this.api.post<AuthResponse>('/auth/login', {
          email: this.loginModel().email,
          password: this.loginModel().password,
        }),
      )
      .subscribe({
        next: () => {
          this.profileStore.load(true).subscribe();
          this.bookmarksStore.load();
          const redirect = new URLSearchParams(globalThis.location?.search ?? '').get('redirect');
          void this.router.navigateByUrl(redirect ?? '/app/jobs');
        },
      });
  }
}

/**
 * Message d'erreur du premier validateur en échec, avec repli si l'erreur
 * n'a pas de message (config par défaut de Signal Forms).
 */
function fieldMessage(
  errors: ReadonlyArray<{ message?: string }> | undefined,
  fallback: string,
): string {
  return errors?.[0]?.message ?? fallback;
}
