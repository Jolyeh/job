import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Bookmark,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-angular';
import {
  ApplicationStatus,
  Bookmark as BookmarkModel,
} from '../../core/models/api.models';
import {
  BookmarksStore,
  STATUS_ORDER,
} from '../../core/services/bookmarks.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

/**
 * Suivi de candidatures : tableau par statut, changement d'étape en un clic,
 * notes et prochaine action.
 */
@Component({
  selector: 'app-bookmarks-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, LucideAngularModule, RouterLink],
  template: `
    <div class="mx-auto max-w-7xl">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="badge-brand">
            <lucide-angular [img]="BookmarkIcon" class="size-3.5" />
            {{ i18n.t('bookmarks.title') }}
          </p>
          <h1 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {{ i18n.t('bookmarks.count', { count: store.total() }) }}
          </h1>
          <p class="mt-1.5 text-sm text-ink-500">
            {{ i18n.t('bookmarks.subtitle') }}
          </p>
        </div>

        @if (store.stats(); as stats) {
          <dl class="flex gap-3">
            <div class="card px-4 py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t('bookmarks.kpi.applied') }}</dt>
              <dd class="font-display text-xl font-extrabold tabular-nums">{{ stats.applied }}</dd>
            </div>
            <div class="card px-4 py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t('bookmarks.kpi.responses') }}</dt>
              <dd class="font-display text-xl font-extrabold tabular-nums">{{ stats.responseRate }}%</dd>
            </div>
            <div class="card px-4 py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t('bookmarks.kpi.followUp') }}</dt>
              <dd class="font-display text-xl font-extrabold tabular-nums">{{ stats.upcomingActions }}</dd>
            </div>
          </dl>
        }
      </header>

      @if (store.error(); as error) {
        <div
          class="mb-4 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700"
          role="alert"
        >
          <lucide-angular [img]="AlertIcon" class="mt-0.5 size-4 shrink-0" />
          <span>{{ error }}</span>
        </div>
      }

      @if (store.isLoading() && store.total() === 0) {
        <div class="grid gap-4 md:grid-cols-3">
          @for (item of [1, 2, 3]; track item) {
            <div class="card space-y-3 p-5">
              <div class="skeleton h-4 w-1/2"></div>
              <div class="skeleton h-20 w-full"></div>
              <div class="skeleton h-20 w-full"></div>
            </div>
          }
        </div>
      } @else if (store.total() === 0) {
        <div class="card">
          <app-empty-state
            [title]="i18n.t('bookmarks.emptyTitle')"
            [description]="i18n.t('bookmarks.emptyText')"
            [actionLabel]="i18n.t('bookmarks.emptyAction')"
            [icon]="BookmarkIcon"
            (action)="goToJobs()"
          />
        </div>
      } @else {
        <!-- Colonnes par statut -->
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (status of visibleStatuses; track status) {
            @if (columnFor(status).length > 0) {
              <section class="rounded-2xl border border-ink-200/70 bg-white/60 p-3">
                <header class="mb-2.5 flex items-center justify-between px-1.5">
                  <h2 class="flex items-center gap-2 text-sm font-bold text-ink-800">
                    <span class="size-2 rounded-full" [class]="statusDot(status)"></span>
                    {{ statusLabel(status) }}
                  </h2>
                  <span class="badge-neutral tabular-nums">{{ columnFor(status).length }}</span>
                </header>

                <ul class="space-y-2.5">
                  @for (bookmark of columnFor(status); track bookmark.id) {
                    <li class="card p-3.5">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <h3 class="truncate text-sm font-bold text-ink-900">
                            <a [routerLink]="['/app/jobs', bookmark.offer.id]" class="hover:text-brand-700">
                              {{ bookmark.offer.title }}
                            </a>
                          </h3>
                          <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                            <span class="inline-flex items-center gap-1">
                              <lucide-angular [img]="BuildingIcon" class="size-3" />
                              {{ bookmark.offer.company }}
                            </span>
                            <span class="inline-flex items-center gap-1">
                              <lucide-angular [img]="PinIcon" class="size-3" />
                              {{ bookmark.offer.city }}
                            </span>
                          </p>
                        </div>
                        <span class="badge-brand shrink-0 tabular-nums">{{ bookmark.matchScore }}</span>
                      </div>

                      @if (bookmark.nextActionAt) {
                        <p class="mt-2 flex items-center gap-1 rounded-lg bg-warn-50 px-2 py-1 text-[11px] font-semibold text-warn-700">
                          <lucide-angular [img]="CalendarIcon" class="size-3" />
                          {{ i18n.t('bookmarks.nextAction') }} {{ i18n.formatDate(bookmark.nextActionAt, { year: undefined, day: 'numeric', month: 'short' }) }}
                        </p>
                      }

                      @if (bookmark.notes) {
                        <p class="mt-2 line-clamp-2 text-xs italic text-ink-500">« {{ bookmark.notes }} »</p>
                      }

                      <!-- Avancement rapide -->
                      <div class="mt-2.5 flex items-center gap-1.5 border-t border-ink-100 pt-2.5">
                        @if (nextStatus(bookmark); as next) {
                          <button
                            type="button"
                            class="btn-primary flex-1 px-2 py-1.5 text-[11px]"
                            (click)="advance(bookmark, next)"
                          >
                            <lucide-angular [img]="NextIcon" class="size-3.5" />
                            {{ statusLabel(next) }}
                          </button>
                        }
                        <button
                          type="button"
                          class="btn-icon size-7"
                          [attr.aria-label]="i18n.t('bookmarks.edit') + ' ' + bookmark.offer.title"
                          (click)="openEditor(bookmark)"
                        >
                          <lucide-angular [img]="EditIcon" class="size-3.5" />
                        </button>
                        <button
                          type="button"
                          class="btn-icon size-7 hover:bg-danger-50 hover:text-danger-700"
                          [attr.aria-label]="i18n.t('bookmarks.remove') + ' ' + bookmark.offer.title"
                          (click)="store.remove(bookmark.id)"
                        >
                          <lucide-angular [img]="TrashIcon" class="size-3.5" />
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              </section>
            }
          }
        </div>
      }

      <!-- Panneau d'édition -->
      @if (editing(); as bookmark) {
        <div class="fixed inset-0 z-70 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            (click)="closeEditor()"
            aria-hidden="true"
          ></div>
          <div
            class="relative w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="editor-title" class="text-base font-bold">{{ i18n.t('bookmarks.editor.title') }}</h2>
                <p class="text-xs text-ink-500">{{ bookmark.offer.title }}</p>
              </div>
              <button type="button" class="btn-icon" [attr.aria-label]="i18n.t('common.close')" (click)="closeEditor()">
                <lucide-angular [img]="CloseIcon" class="size-5" />
              </button>
            </div>

            <form class="space-y-4" (submit)="saveEditor($event)">
              <div>
                <label class="field-label" for="editor-status">{{ i18n.t('bookmarks.editor.status') }}</label>
                <select id="editor-status" class="select" [value]="editStatus()" (change)="onStatusChange($event)">
                  @for (status of visibleStatuses; track status) {
                    <option [value]="status">{{ statusLabel(status) }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="field-label" for="editor-next">{{ i18n.t('bookmarks.editor.next') }}</label>
                <input
                  id="editor-next"
                  type="date"
                  class="input"
                  [value]="editNextAction()"
                  (input)="onNextActionChange($event)"
                />
              </div>

              <div>
                <label class="field-label" for="editor-notes">{{ i18n.t('bookmarks.editor.notes') }}</label>
                <textarea
                  id="editor-notes"
                  rows="3"
                  class="textarea resize-y"
                  [placeholder]="i18n.t('bookmarks.editor.notesPlaceholder')"
                  [value]="editNotes()"
                  (input)="onNotesChange($event)"
                ></textarea>
              </div>

              <div class="flex justify-end gap-2 border-t border-ink-100 pt-4">
                <button type="button" class="btn-secondary" (click)="closeEditor()">{{ i18n.t('common.cancel') }}</button>
                <button type="submit" class="btn-primary">
                  <lucide-angular [img]="SendIcon" class="size-4" />
                  {{ i18n.t('common.save') }}
                </button>
              </div>
            </form>

            <!-- Historique -->
            @if (bookmark.events.length) {
              <div class="mt-4 border-t border-ink-100 pt-3">
                <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                  <lucide-angular [img]="HistoryIcon" class="size-3.5" />
                  {{ i18n.t('bookmarks.editor.history') }}
                </p>
                <ol class="space-y-1.5">
                  @for (event of bookmark.events; track event.id) {
                    <li class="flex items-center gap-2 text-[11px] text-ink-500">
                      <span class="size-1.5 rounded-full bg-brand-400"></span>
                      <span class="font-medium text-ink-700">{{ statusLabel(event.status) }}</span>
                      <span>· {{ i18n.formatDate(event.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                      @if (event.comment) {
                        <span class="truncate italic">— {{ event.comment }}</span>
                      }
                    </li>
                  }
                </ol>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class BookmarksPageComponent implements OnInit {
  readonly store = inject(BookmarksStore);
  readonly i18n = inject(I18nService);
  /** Libellé traduit d'un statut de candidature. */
  statusLabel(status: ApplicationStatus): string {
    return this.i18n.t(`status.${status}`);
  }
  readonly visibleStatuses = STATUS_ORDER;

  readonly BookmarkIcon = Bookmark;
  readonly BuildingIcon = Building2;
  readonly PinIcon = MapPin;
  readonly CalendarIcon = CalendarClock;
  readonly AlertIcon = CircleAlert;
  readonly NextIcon = ChevronRight;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly CloseIcon = X;
  readonly SendIcon = Send;
  readonly PlusIcon = Plus;
  readonly HistoryIcon = MessageSquare;

  readonly editing = signal<BookmarkModel | null>(null);
  readonly editStatus = signal<ApplicationStatus>('SAVED');
  readonly editNotes = signal('');
  readonly editNextAction = signal('');

  /** Candidatures d'une colonne (méthode simple : appelée dans le template). */
  columnFor(status: ApplicationStatus): BookmarkModel[] {
    return this.store.byStatus().get(status) ?? [];
  }

  ngOnInit(): void {
    this.store.load();
  }

  goToJobs(): void {
    // Navigation simple : évite d'injecter le Router pour un seul bouton.
    globalThis.location?.assign('/app/jobs');
  }

  /** Étape suivante logique du parcours de candidature. */
  nextStatus(bookmark: BookmarkModel): ApplicationStatus | null {
    const flow: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
      SAVED: 'APPLIED',
      APPLIED: 'INTERVIEW',
      INTERVIEW: 'OFFER',
    };
    return flow[bookmark.status] ?? null;
  }

  advance(bookmark: BookmarkModel, status: ApplicationStatus): void {
    this.store.update(bookmark.id, { status }).subscribe();
  }

  statusDot(status: ApplicationStatus): string {
    const colors: Record<ApplicationStatus, string> = {
      SAVED: 'bg-ink-400',
      APPLIED: 'bg-brand-500',
      INTERVIEW: 'bg-accent-500',
      OFFER: 'bg-success-500',
      REJECTED: 'bg-danger-500',
      WITHDRAWN: 'bg-ink-300',
    };
    return colors[status];
  }

  openEditor(bookmark: BookmarkModel): void {
    this.editing.set(bookmark);
    this.editStatus.set(bookmark.status);
    this.editNotes.set(bookmark.notes ?? '');
    this.editNextAction.set(bookmark.nextActionAt ? bookmark.nextActionAt.slice(0, 10) : '');
  }

  closeEditor(): void {
    this.editing.set(null);
  }

  onStatusChange(event: Event): void {
    this.editStatus.set((event.target as HTMLSelectElement).value as ApplicationStatus);
  }

  onNotesChange(event: Event): void {
    this.editNotes.set((event.target as HTMLTextAreaElement).value);
  }

  onNextActionChange(event: Event): void {
    this.editNextAction.set((event.target as HTMLInputElement).value);
  }

  saveEditor(event: Event): void {
    event.preventDefault();
    const bookmark = this.editing();
    if (!bookmark) return;

    this.store
      .update(bookmark.id, {
        status: this.editStatus(),
        notes: this.editNotes() || undefined,
        nextActionAt: this.editNextAction()
          ? new Date(this.editNextAction()).toISOString()
          : undefined,
      })
      .subscribe(() => this.closeEditor());
  }
}
