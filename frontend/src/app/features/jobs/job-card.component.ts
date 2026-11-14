import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Banknote,
  Bookmark,
  BookmarkCheck,
  Building2,
  CircleCheck,
  Clock,
  ExternalLink,
  Laptop,
  MapPin,
  Sparkles as LucideSparkle,
  TriangleAlert,
} from 'lucide-angular';
import { JobOffer } from '../../core/models/api.models';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ScoreRingComponent } from '../../shared/ui/score-ring.component';

/**
 * Carte d'offre : score, explications du matching, métadonnées et favoris.
 * Composant présentationnel pur (OnPush) — l'état vient du JobOffer en entrée.
 */
@Component({
  selector: 'app-job-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ScoreRingComponent, LucideAngularModule],
  template: `
    <article
      class="card card-hover group flex h-full flex-col gap-4 p-5"
      [attr.aria-labelledby]="'offer-title-' + offer().id"
    >
      <div class="flex items-start gap-4">
        <!-- Logo / initiale de l'entreprise -->
        <div
          class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-100 text-sm font-bold text-ink-500"
          aria-hidden="true"
        >
          @if (offer().logoUrl) {
            <img
              [src]="offer().logoUrl"
              [alt]="''"
              class="size-full object-cover"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          } @else {
            {{ companyInitials() }}
          }
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="text-base font-bold leading-snug text-ink-900" [id]="'offer-title-' + offer().id">
            <a
              [routerLink]="['/app/jobs', offer().id]"
              class="transition hover:text-brand-700 focus-visible:text-brand-700"
            >
              {{ offer().title }}
            </a>
          </h3>
          <p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
            <lucide-angular [img]="BuildingIcon" class="size-3.5 shrink-0 text-ink-400" />
            <span class="truncate font-medium">{{ offer().company }}</span>
          </p>
        </div>

        <app-score-ring [score]="offer().match.score" [size]="52" />
      </div>

      <!-- Métadonnées -->
      <ul class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-600">
        <li class="inline-flex items-center gap-1">
          <lucide-angular [img]="MapPinIcon" class="size-3.5 text-ink-400" />
          {{ offer().city }}
        </li>
        <li class="inline-flex items-center gap-1">
          <lucide-angular [img]="LaptopIcon" class="size-3.5 text-ink-400" />
          {{ workModeLabel() }}
        </li>
        <li class="inline-flex items-center gap-1">
          <lucide-angular [img]="ClockIcon" class="size-3.5 text-ink-400" />
          {{ i18n.formatDate(offer().publishedAt, { day: 'numeric', month: 'short', year: undefined }) }}
        </li>
        @if (salaryLabel()) {
          <li class="inline-flex items-center gap-1 font-semibold text-ink-800">
            <lucide-angular [img]="BanknoteIcon" class="size-3.5 text-ink-400" />
            {{ salaryLabel() }}
          </li>
        }
      </ul>

      <!-- Badges -->
      <div class="flex flex-wrap gap-1.5">
        <span
          class="badge"
          [class]="
            offer().language === 'FR'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-ink-100 text-ink-600'
          "
          [attr.title]="i18n.t('language.offer.' + offer().language.toLowerCase())"
        >
          {{ offer().language }}
        </span>
        <span class="badge-neutral">{{ contractLabel() }}</span>
        <span class="badge-neutral">{{ experienceLabel() }}</span>
        @for (skill of visibleSkills(); track skill.slug) {
          <span
            class="badge"
            [class]="
              skill.matched
                ? 'bg-success-50 text-success-700'
                : 'bg-ink-100 text-ink-500'
            "
          >
            @if (skill.matched) {
              <lucide-angular [img]="CheckIcon" class="size-3" />
            }
            {{ skill.label }}
          </span>
        }
        @if (extraSkillCount() > 0) {
          <span class="badge-neutral">+{{ extraSkillCount() }}</span>
        }
      </div>

      <!-- Pourquoi cette offre vous correspond -->
      @if (offer().match.reasons.length) {
        <p class="flex items-start gap-1.5 rounded-lg bg-brand-50/70 px-2.5 py-2 text-xs leading-relaxed text-brand-900">
          <lucide-angular [img]="SparkleIcon" class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
          <span>{{ offer().match.reasons[0] }}</span>
        </p>
      }
      @if (offer().match.warnings.length) {
        <p class="flex items-start gap-1.5 text-xs leading-relaxed text-warn-700">
          <lucide-angular [img]="WarnIcon" class="mt-0.5 size-3.5 shrink-0" />
          <span>{{ offer().match.warnings[0] }}</span>
        </p>
      }

      <!-- Actions -->
      <div class="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
        <a
          [routerLink]="['/app/jobs', offer().id]"
          class="btn-secondary flex-1 py-2 text-xs sm:text-sm"
        >
          {{ i18n.t('jobs.viewOffer') }}
        </a>
        <button
          type="button"
          class="btn-icon shrink-0"
          [class]="isBookmarked() ? 'text-brand-600 hover:bg-brand-50' : ''"
          [disabled]="isPending()"
          [attr.aria-label]="i18n.t(isBookmarked() ? 'bookmarks.remove' : 'bookmarks.add')"
          [attr.aria-pressed]="isBookmarked()"
          (click)="toggleBookmark()"
        >
          <lucide-angular
            [img]="isBookmarked() ? BookmarkCheckIcon : BookmarkIcon"
            class="size-4.5"
          />
        </button>
        <a
          [href]="offer().applyUrl ?? offer().url"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary py-2 text-xs sm:text-sm"
        >
          {{ i18n.t('jobs.apply') }}
          <lucide-angular [img]="ExternalIcon" class="size-3.5" />
        </a>
      </div>
    </article>
  `,
})
export class JobCardComponent {
  readonly offer = input.required<JobOffer>();

  private readonly bookmarks = inject(BookmarksStore);
  protected readonly i18n = inject(I18nService);

  readonly MapPinIcon = MapPin;
  readonly LaptopIcon = Laptop;
  readonly ClockIcon = Clock;
  readonly BanknoteIcon = Banknote;
  readonly BuildingIcon = Building2;
  readonly CheckIcon = CircleCheck;
  readonly WarnIcon = TriangleAlert;
  readonly SparkleIcon = LucideSparkle;
  readonly BookmarkIcon = Bookmark;
  readonly BookmarkCheckIcon = BookmarkCheck;
  readonly ExternalIcon = ExternalLink;

  readonly isBookmarked = computed(() => this.bookmarks.isBookmarked(this.offer().id));
  readonly isPending = computed(() => this.bookmarks.isPending(this.offer().id));

  readonly companyInitials = computed(() =>
    this.offer()
      .company.split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  readonly contractLabel = computed(() => this.i18n.t(`contract.${this.offer().contractType}`));
  readonly workModeLabel = computed(() => this.i18n.t(`workMode.${this.offer().workMode}`));
  readonly experienceLabel = computed(() => this.i18n.t(`experience.${this.offer().experienceLevel}`));

  readonly salaryLabel = computed(() => {
    const { salaryMin, salaryMax, salaryCurrency } = this.offer();
    if (!salaryMin && !salaryMax) return null;
    const format = (value: number) =>
      new Intl.NumberFormat(this.i18n.locale(), {
        style: 'currency',
        currency: salaryCurrency,
        maximumFractionDigits: 0,
        notation: 'compact',
      }).format(value);
    if (salaryMin && salaryMax) return `${format(salaryMin)} – ${format(salaryMax)}`;
    return format((salaryMin ?? salaryMax)!);
  });

  /** Les 5 premières compétences, en signalant celles déjà présentes au profil. */
  readonly visibleSkills = computed(() => {
    const matched = new Set(this.offer().match.matchedSkills);
    return this.offer()
      .skills.slice(0, 5)
      .map((skill) => ({ ...skill, matched: matched.has(skill.label) }));
  });

  readonly extraSkillCount = computed(() =>
    Math.max(0, this.offer().skills.length - this.visibleSkills().length),
  );

  toggleBookmark(): void {
    if (this.isBookmarked()) {
      const bookmark = this.bookmarks
        .items()
        .find((item) => item.offer.id === this.offer().id);
      if (bookmark) this.bookmarks.remove(bookmark.id);
      return;
    }
    this.bookmarks.add(this.offer().id).subscribe();
  }
}
