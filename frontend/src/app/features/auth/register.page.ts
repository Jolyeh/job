import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  LucideAngularModule,
  Mail,
  UserRound,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { JobSitesStore } from '../../core/services/job-sites.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthResponse } from '../../core/models/api.models';
import { AuthLayoutComponent } from './auth-layout.component';

/**
 * Création de compte.
 *
 * Règles appliquées en direct (et rappelées sous les champs) :
 *  - e-mail au format `nom@domaine.tld` ;
 *  - mot de passe : 8 caractères minimum, une majuscule, un chiffre.
 *
 * Les sites d'emploi par défaut sont rattachés automatiquement côté API : la
 * redirection vers le profil en onboarding enchaîne donc sur une liste de
 * sites déjà prête.
 */
@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, LucideAngularModule, RouterLink, FormField],
  template: `
    <app-auth-layout>
      <h2 class="font-display text-2xl font-extrabold tracking-tight">
        {{ i18n.t('auth.register.title') }}
      </h2>
      <p class="mt-1.5 text-sm text-ink-500">{{ i18n.t('auth.register.subtitle') }}</p>

      @if (auth.error()) {
        <div
          class="mt-5 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700"
          role="alert"
        >
          <lucide-angular [img]="AlertIcon" class="mt-0.5 size-4 shrink-0" />
          <span>{{ auth.error() }}</span>
        </div>
      }

      <form class="mt-6 space-y-4" (submit)="submit($event)" novalidate>
        <!-- Nom complet -->
        <div>
          <label class="field-label" for="fullName">{{ i18n.t('auth.field.fullName') }}</label>
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
              class="input pl-10"
              [class.input-invalid]="showError('fullName')"
              [placeholder]="i18n.t('auth.placeholder.fullName')"
            />
          </div>
          @if (showError('fullName')) {
            <p class="field-error" role="alert">
              <lucide-angular [img]="AlertIcon" class="size-3.5" />
              {{ i18n.t('auth.error.required') }}
            </p>
          }
        </div>

        <!-- E-mail -->
        <div>
          <label class="field-label" for="email">{{ i18n.t('auth.field.email') }}</label>
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
              spellcheck="false"
              [formField]="registerForm.email"
              class="input pl-10"
              [class.input-invalid]="showError('email')"
              [placeholder]="i18n.t('auth.placeholder.email')"
              aria-describedby="email-help"
            />
          </div>
          @if (showError('email')) {
            <p class="field-error" role="alert">
              <lucide-angular [img]="AlertIcon" class="size-3.5" />
              {{ i18n.t('auth.error.email') }}
            </p>
          }
          <p id="email-help" class="field-hint">
            {{ i18n.t('auth.hint.format') }} : {{ i18n.t('auth.hint.emailFormat') }}
          </p>
        </div>

        <!-- Mot de passe -->
        <div>
          <label class="field-label" for="password">{{ i18n.t('auth.field.password') }}</label>
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
              class="input pl-10 pr-11"
              [class.input-invalid]="showError('password')"
              [placeholder]="i18n.t('auth.placeholder.password')"
              aria-describedby="password-rules"
            />
            <button
              type="button"
              class="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              [attr.aria-label]="i18n.t(showPassword() ? 'auth.hidePassword' : 'auth.showPassword')"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              <lucide-angular [img]="showPassword() ? EyeOffIcon : EyeIcon" class="size-4" />
            </button>
          </div>

          <!-- Règles de robustesse, cochées en direct -->
          <ul id="password-rules" class="mt-2 space-y-1">
            @for (rule of passwordRules(); track rule.labelKey) {
              <li
                class="flex items-center gap-1.5 text-xs"
                [class]="rule.ok ? 'text-success-700' : 'text-ink-500'"
              >
                @if (rule.ok) {
                  <lucide-angular [img]="CheckIcon" class="size-3.5 shrink-0" />
                } @else {
                  <span class="size-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden="true"></span>
                }
                {{ i18n.t(rule.labelKey) }}
              </li>
            }
          </ul>

          @if (showError('password')) {
            <p class="field-error" role="alert">
              <lucide-angular [img]="AlertIcon" class="size-3.5" />
              {{ i18n.t('auth.error.passwordLength') }}
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
            {{ i18n.t('common.loading') }}
          } @else {
            {{ i18n.t('auth.register.submit') }}
            <lucide-angular [img]="ArrowIcon" class="size-4" />
          }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-500">
        {{ i18n.t('auth.register.hasAccount') }}
        <a routerLink="/login" class="link">{{ i18n.t('auth.register.signIn') }}</a>
      </p>
    </app-auth-layout>
  `,
})
export class RegisterPageComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);
  private readonly bookmarksStore = inject(BookmarksStore);
  private readonly jobSitesStore = inject(JobSitesStore);

  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly UserIcon = UserRound;
  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowIcon = ArrowRight;
  readonly LoaderIcon = LoaderCircle;
  readonly AlertIcon = CircleAlert;
  readonly CheckIcon = Check;

  readonly registerModel = signal({ fullName: '', email: '', password: '' });

  readonly registerForm = form(this.registerModel, (path) => {
    required(path.fullName, { message: '' });
    required(path.email, { message: '' });
    email(path.email, { message: '' });
    required(path.password, { message: '' });
    minLength(path.password, 8, { message: '' });
    validate(path.password, ({ value }) => {
      const password = value() ?? '';
      if (!/[A-Z]/.test(password)) {
        return [{ kind: 'uppercase', message: '' }];
      }
      return [];
    });
  });

  /** Règles affichées sous le champ, évaluées en direct. */
  readonly passwordRules = computed(() => {
    const value = this.registerModel().password;
    return [
      { labelKey: 'auth.error.passwordLength', ok: value.length >= 8 },
      { labelKey: 'auth.error.email', ok: /[A-Z]/.test(value) && /\d/.test(value) },
    ];
  });

  /** Erreur affichée après interaction ou tentative d'envoi. */
  showError(field: 'fullName' | 'email' | 'password'): boolean {
    const state = this.registerForm[field]();
    return (state.touched() || this.submitted()) && state.invalid();
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.registerForm().markAsTouched();

    if (this.registerForm().invalid()) return;

    this.auth
      .runAuthRequest(
        this.api.post<AuthResponse>('/auth/register', {
          fullName: this.registerModel().fullName,
          email: this.registerModel().email,
          password: this.registerModel().password,
        }),
      )
      .subscribe({
        next: () => {
          this.profileStore.load(true).subscribe();
          this.bookmarksStore.load();
          // Les sites par défaut sont déjà rattachés par l'API.
          this.jobSitesStore.load(true);
          void this.router.navigate(['/app/profile'], { queryParams: { onboarding: '1' } });
        },
      });
  }
}
