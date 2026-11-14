import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, pattern, required } from '@angular/forms/signals';
import {
  Check,
  ExternalLink,
  Globe,
  LoaderCircle,
  LucideAngularModule,
  Plus,
  Search,
  X,
} from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { JobSitesStore } from '../../core/services/job-sites.store';
import { JobSite, JobSiteKind } from '../../core/models/api.models';

/**
 * Gestion des sites d'emploi rattachés au compte.
 *
 * Les sites sont stockés en base et **propres à chaque utilisateur** : les
 * cinq sites par défaut sont attachés à l'inscription, et l'utilisateur peut
 * en suivre d'autres dans le catalogue ou ajouter le sien.
 */
@Component({
  selector: 'app-job-sites-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, FormField],
  template: `
    <div class="mx-auto w-full max-w-6xl space-y-5">
      <header
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 class="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {{ i18n.t('sites.title') }}
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-ink-600">{{ i18n.t('sites.subtitle') }}</p>
        </div>
        <p class="badge-brand self-start sm:self-auto">
          <lucide-angular [img]="GlobeIcon" class="size-3.5" />
          {{ store.followedCount() }}
        </p>
      </header>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <!-- ========== Sites suivis + catalogue ========== -->
        <div class="space-y-5">
          <!-- Recherche -->
          <div class="relative">
            <lucide-angular
              [img]="SearchIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              class="input pl-10"
              [placeholder]="i18n.t('common.search')"
              [attr.aria-label]="i18n.t('common.search')"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </div>

          @if (store.loading() && !store.items().length) {
            <div class="card grid place-items-center py-14 text-ink-500">
              <lucide-angular [img]="LoaderIcon" class="size-6 animate-spin" />
              <p class="mt-2 text-sm">{{ i18n.t('common.loading') }}</p>
            </div>
          } @else {
            <!-- Suivis -->
            <section class="card">
              <div class="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <h2 class="font-display text-sm font-bold uppercase tracking-wide text-ink-500">
                  {{ i18n.t('sites.followed') }}
                </h2>
                <span class="text-xs font-semibold text-ink-400">{{ store.followedCount() }}</span>
              </div>

              @if (!store.followed().length) {
                <p class="px-4 py-8 text-center text-sm text-ink-500">
                  {{ i18n.t('sites.empty.followed') }}
                </p>
              } @else {
                <ul class="divide-y divide-ink-100">
                  @for (site of store.followed(); track site.id) {
                    <li class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700"
                          aria-hidden="true"
                        >
                          {{ site.name.slice(0, 2).toUpperCase() }}
                        </span>
                        <div class="min-w-0">
                          <p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                            <span class="truncate">{{ site.customName || site.name }}</span>
                            @if (site.isDefault) {
                              <span class="badge shrink-0">{{ i18n.t('sites.default') }}</span>
                            }
                          </p>
                          <p class="truncate text-xs text-ink-500">
                            {{ i18n.t('sites.kind.' + site.kind) }} · {{ site.language }} ·
                            {{ site.offerCount }} {{ i18n.t('sites.offers') }}
                          </p>
                        </div>
                      </div>

                      <div class="flex items-center gap-1.5 sm:shrink-0">
                        <span
                          class="badge-success"
                          [attr.aria-label]="i18n.t('sites.following')"
                        >
                          <lucide-angular [img]="CheckIcon" class="size-3.5" />
                          {{ i18n.t('sites.following') }}
                        </span>
                        <a
                          [href]="site.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="btn-icon"
                          [attr.aria-label]="i18n.t('sites.visit') + ' ' + site.name"
                        >
                          <lucide-angular [img]="ExternalIcon" class="size-4" />
                        </a>
                        <button
                          type="button"
                          class="btn-icon text-danger-600 hover:bg-danger-50"
                          [disabled]="store.saving()"
                          [attr.aria-label]="i18n.t('sites.unfollow') + ' ' + site.name"
                          (click)="store.unfollow(site.id).subscribe()"
                        >
                          <lucide-angular [img]="XIcon" class="size-4" />
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>

            <!-- Catalogue -->
            <section class="card">
              <div class="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <h2 class="font-display text-sm font-bold uppercase tracking-wide text-ink-500">
                  {{ i18n.t('sites.catalog') }}
                </h2>
                <span class="text-xs font-semibold text-ink-400">
                  {{ filtered().length }}
                </span>
              </div>

              @if (!filtered().length) {
                <p class="px-4 py-8 text-center text-sm text-ink-500">{{ i18n.t('common.none') }}</p>
              } @else {
                <ul class="divide-y divide-ink-100">
                  @for (site of filtered(); track site.id) {
                    <li class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-ink-900">{{ site.name }}</p>
                        <p class="truncate text-xs text-ink-500">
                          {{ i18n.t('sites.kind.' + site.kind) }} · {{ site.country }} ·
                          {{ site.language }}
                        </p>
                        @if (site.description) {
                          <p class="mt-0.5 line-clamp-2 text-xs text-ink-500">
                            {{ site.description }}
                          </p>
                        }
                      </div>
                      <button
                        type="button"
                        class="btn-secondary shrink-0 self-start sm:self-auto"
                        [disabled]="store.saving()"
                        (click)="store.follow({ jobSiteId: site.id }).subscribe()"
                      >
                        <lucide-angular [img]="PlusIcon" class="size-4" />
                        {{ i18n.t('sites.follow') }}
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>

        <!-- ========== Ajouter un site personnalisé ========== -->
        <aside class="card h-fit p-4">
          <h2 class="font-display text-base font-bold text-ink-900">{{ i18n.t('sites.add.title') }}</h2>
          <p class="mt-1 text-xs text-ink-500">{{ i18n.t('sites.add.text') }}</p>

          <form class="mt-4 space-y-3" (submit)="addSite($event)" novalidate>
            <div>
              <label class="field-label" for="site-name">{{ i18n.t('sites.add.name') }}</label>
              <input
                id="site-name"
                type="text"
                class="input"
                [formField]="siteForm.name"
                [class.input-invalid]="submitted() && siteForm.name().invalid()"
                [placeholder]="i18n.t('sites.add.namePlaceholder')"
              />
            </div>

            <div>
              <label class="field-label" for="site-url">{{ i18n.t('sites.add.url') }}</label>
              <input
                id="site-url"
                type="url"
                inputmode="url"
                class="input"
                [formField]="siteForm.url"
                [class.input-invalid]="submitted() && siteForm.url().invalid()"
                [placeholder]="i18n.t('sites.add.urlPlaceholder')"
              />
            </div>

            <div>
              <label class="field-label" for="site-kind">{{ i18n.t('sites.add.kind') }}</label>
              <select id="site-kind" class="input" [formField]="siteForm.kind">
                @for (kind of kinds; track kind) {
                  <option [value]="kind">{{ i18n.t('sites.kind.' + kind) }}</option>
                }
              </select>
            </div>

            <button
              type="submit"
              class="btn-primary w-full"
              [disabled]="store.saving()"
            >
              @if (store.saving()) {
                <lucide-angular [img]="LoaderIcon" class="size-4 animate-spin" />
              } @else {
                <lucide-angular [img]="PlusIcon" class="size-4" />
              }
              {{ i18n.t('sites.add.submit') }}
            </button>
          </form>
        </aside>
      </div>
    </div>
  `,
})
export class JobSitesPageComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(JobSitesStore);

  protected readonly GlobeIcon = Globe;
  protected readonly SearchIcon = Search;
  protected readonly PlusIcon = Plus;
  protected readonly XIcon = X;
  protected readonly CheckIcon = Check;
  protected readonly ExternalIcon = ExternalLink;
  protected readonly LoaderIcon = LoaderCircle;

  protected readonly query = signal('');
  protected readonly submitted = signal(false);

  protected readonly kinds: JobSiteKind[] = ['JOB_BOARD', 'ATS', 'COMPANY', 'NETWORK', 'OTHER'];

  /** Catalogue filtré : on masque les sites déjà suivis. */
  protected readonly filtered = computed<JobSite[]>(() => {
    const needle = this.query().trim().toLowerCase();
    return this.store
      .available()
      .filter(
        (site) =>
          !needle ||
          site.name.toLowerCase().includes(needle) ||
          site.country.toLowerCase().includes(needle) ||
          (site.description ?? '').toLowerCase().includes(needle),
      );
  });

  private readonly model = signal({
    name: '',
    url: '',
    kind: 'JOB_BOARD' as JobSiteKind,
  });

  protected readonly siteForm = form(this.model, (path) => {
    required(path.name, { message: '' });
    required(path.url, { message: '' });
    // `url()` n'existe pas dans Signal Forms : on valide le schéma d'URL.
    pattern(path.url, /^https?:\/\/[^\s/]+\.[^\s]+$/i, { message: '' });
  });

  constructor() {
    this.store.load();
  }

  addSite(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.siteForm().markAsTouched();

    if (this.siteForm().invalid()) return;

    const { name, url, kind } = this.model();
    this.store.follow({ name: name.trim(), url: url.trim(), kind }).subscribe((site) => {
      if (!site) return;
      this.model.set({ name: '', url: '', kind: 'JOB_BOARD' });
      this.submitted.set(false);
      this.siteForm().reset();
    });
  }
}
