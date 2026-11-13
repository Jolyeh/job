import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, email, minLength, pattern } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  User,
} from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../core/models/api.models';
import { AuthLayoutComponent } from './auth-layout.component';

interface RegisterModel {
  fullName: string;
  email: string;
  password: string;
}

/** Écran de création de compte (Signal Forms + indicateur de robustesse). */
@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, LucideAngularModule, RouterLink, FormField],
  template: `
    <app-auth-layout>
      <h2 class="font-display text-2xl font-extrabold tracking-tight">Créer votre compte</h2>
      <p class="mt-1.5 text-sm text-ink-500">
        2 minutes suffisent pour recevoir des offres classées selon votre profil.
      </p>

      @if (auth.error()) {
        <div
          class="mt-5 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700"
          role="alert"
        >
          <lucide-angular [img]="CircleAlertIcon" class="mt-0.5 size-4 shrink-0" />
          <span>{{ auth.error() }}</span>
        </div>
      }

      <form class="mt-6 space-y-4" (submit)="submit($event)" novalidate>
        <div>
          <label class="field-label" for="fullName">Nom complet</label>
          <div class="relative">
            <lucide-angular
              [img]="UserIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="fullName"
              type="text"
              autocomplete="name"
              [formField]="registerForm.fullName"
              class="input pl-9.5"
              [class.input-invalid]="showError('fullName')"
              placeholder="Camille Moreau"
            />
          </div>
          @if (showError('fullName')) {
            <p class="field-error">
              <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
              {{ message(registerForm.fullName().errors(), 'Indiquez votre nom complet') }}
            </p>
          }
        </div>

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
              [formField]="registerForm.email"
              class="input pl-9.5"
              [class.input-invalid]="showError('email')"
              placeholder="vous@exemple.fr"
            />
          </div>
          @if (showError('email')) {
            <p class="field-error">
              <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
              {{ message(registerForm.email().errors(), 'Adresse e-mail invalide') }}
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
              autocomplete="new-password"
              [formField]="registerForm.password"
              class="input pl-9.5 pr-11"
              [class.input-invalid]="showError('password')"
              placeholder="8 caractères minimum"
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

          <!-- Critères de robustesse en direct -->
          <ul class="mt-2.5 grid grid-cols-2 gap-1.5">
            @for (rule of rules(); track rule.label) {
              <li
                class="flex items-center gap-1.5 text-xs font-medium transition"
                [class]="rule.ok ? 'text-success-700' : 'text-ink-400'"
              >
                <span
                  class="grid size-4 place-items-center rounded-full"
                  [class]="rule.ok ? 'bg-success-500/15' : 'bg-ink-200/60'"
                >
                  <lucide-angular [img]="CheckIcon" class="size-2.5" />
                </span>
                {{ rule.label }}
              </li>
            }
          </ul>

          @if (showError('password')) {
            <p class="field-error">
              <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
              {{ message(registerForm.password().errors(), 'Mot de passe trop faible') }}
            </p>
          }
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          [disabled]="auth.isLoading() || registerForm().invalid()"
        >
          @if (auth.isLoading()) {
            <lucide-angular [img]="LoaderIcon" class="size-4 animate-spin" />
            Création…
          } @else {
            Créer mon compte
            <lucide-angular [img]="ArrowRightIcon" class="size-4" />
          }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-500">
        Déjà inscrit ?
        <a routerLink="/login" class="link">Se connecter</a>
      </p>
    </app-auth-layout>
  `,
})
export class RegisterPageComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowRightIcon = ArrowRight;
  readonly LoaderIcon = LoaderCircle;
  readonly CircleAlertIcon = CircleAlert;
  readonly CheckIcon = Check;

  readonly model = signal<RegisterModel>({ fullName: '', email: '', password: '' });

  readonly registerForm = form(this.model, (path) => {
    required(path.fullName, { message: 'Indiquez votre nom complet' });
    minLength(path.fullName, 2, { message: 'Nom trop court' });

    required(path.email, { message: "L'adresse e-mail est requise" });
    email(path.email, { message: 'Adresse e-mail invalide' });

    required(path.password, { message: 'Le mot de passe est requis' });
    minLength(path.password, 8, { message: '8 caractères minimum' });
    pattern(path.password, /\d/, { message: 'Ajoutez au moins un chiffre' });
  });

  /** Robustesse du mot de passe évaluée en direct sur la valeur du champ. */
  readonly rules = computed(() => {
    const value = this.registerForm.password().value() ?? '';
    return [
      { label: '8 caractères', ok: value.length >= 8 },
      { label: 'Un chiffre', ok: /\d/.test(value) },
      { label: 'Une majuscule', ok: /[A-Z]/.test(value) },
      { label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(value) },
    ];
  });

  showError(field: 'fullName' | 'email' | 'password'): boolean {
    const state = this.registerForm[field]();
    return (state.touched() || this.submitted()) && state.invalid();
  }

  message(errors: ReadonlyArray<{ message?: string }> | undefined, fallback: string): string {
    return errors?.[0]?.message ?? fallback;
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.registerForm().markAsTouched();
    if (this.registerForm().invalid()) return;

    this.auth
      .runAuthRequest(this.api.post<AuthResponse>('/auth/register', this.model()))
      .subscribe({
        next: () => void this.router.navigate(['/app/profile'], {
          queryParams: { onboarding: '1' },
        }),
      });
  }
}
