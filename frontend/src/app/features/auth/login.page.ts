import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  LucideAngularModule,
  Mail,
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
 * Écran de connexion (Signal Forms, zoneless).
 *
 * Aucun identifiant réel n'est affiché : seule une **aide au format** est
 * proposée, conformément à la demande (pas de faux logins dans l'interface).
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, LucideAngularModule, RouterLink, FormField],
  template: `
    <app-auth-layout>
      <h2 class="font-display text-2xl font-extrabold tracking-tight">
        {{ i18n.t('auth.login.title') }}
      </h2>
      <p class="mt-1.5 text-sm text-ink-500">{{ i18n.t('auth.login.subtitle') }}</p>

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
              [formField]="loginForm.email"
              class="input pl-10"
              [class.input-invalid]="showEmailError()"
              [placeholder]="i18n.t('auth.placeholder.email')"
              [attr.aria-invalid]="showEmailError()"
              aria-describedby="email-help"
            />
          </div>
          @if (showEmailError()) {
            <p class="field-error" role="alert">
              <lucide-angular [img]="AlertIcon" class="size-3.5" />
              {{ fieldMessage(loginForm.email().errors(), i18n.t('auth.error.email')) }}
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
              autocomplete="current-password"
              [formField]="loginForm.password"
              class="input pl-10 pr-11"
              [class.input-invalid]="showPasswordError()"
              [placeholder]="i18n.t('auth.placeholder.password')"
              [attr.aria-invalid]="showPasswordError()"
              aria-describedby="password-help"
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
          @if (showPasswordError()) {
            <p class="field-error" role="alert">
              <lucide-angular [img]="AlertIcon" class="size-3.5" />
              {{ fieldMessage(loginForm.password().errors(), i18n.t('auth.error.required')) }}
            </p>
          }
          <p id="password-help" class="field-hint">{{ i18n.t('auth.hint.passwordFormat') }}</p>
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          [disabled]="auth.isLoading() || loginForm().invalid()"
        >
          @if (auth.isLoading()) {
            <lucide-angular [img]="LoaderIcon" class="size-4 animate-spin" />
            {{ i18n.t('common.loading') }}
          } @else {
            {{ i18n.t('auth.login.submit') }}
            <lucide-angular [img]="ArrowIcon" class="size-4" />
          }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-500">
        {{ i18n.t('auth.login.noAccount') }}
        <a routerLink="/register" class="link">{{ i18n.t('auth.login.createAccount') }}</a>
      </p>
    </app-auth-layout>
  `,
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);
  private readonly bookmarksStore = inject(BookmarksStore);
  private readonly jobSitesStore = inject(JobSitesStore);

  readonly fieldMessage = fieldMessage;

  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowIcon = ArrowRight;
  readonly LoaderIcon = LoaderCircle;
  readonly AlertIcon = CircleAlert;

  readonly loginModel = signal({ email: '', password: '' });

  readonly loginForm = form(this.loginModel, (path) => {
    required(path.email, { message: '' });
    email(path.email, { message: '' });
    required(path.password, { message: '' });
  });

  readonly showEmailError = computed(() => {
    const field = this.loginForm.email();
    return (field.touched() || this.submitted()) && field.invalid();
  });

  readonly showPasswordError = computed(() => {
    const field = this.loginForm.password();
    return (field.touched() || this.submitted()) && field.invalid();
  });

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
          this.jobSitesStore.load(true);
          const redirect = new URLSearchParams(globalThis.location?.search ?? '').get('redirect');
          void this.router.navigateByUrl(redirect ?? '/app/dashboard');
        },
      });
  }
}

/**
 * Message d'erreur du premier validateur en échec.
 * Les schémas ci-dessus n'ont pas de message : le libellé est traduit au
 * moment de l'affichage, donc réactif au changement de langue.
 */
function fieldMessage(
  errors: ReadonlyArray<{ message?: string }> | undefined,
  fallback: string,
): string {
  const message = errors?.[0]?.message;
  return message && message.length ? message : fallback;
}
