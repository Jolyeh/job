import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Anneau de score de matching (0-100), 100 % CSS (conic-gradient).
 * La couleur évolue avec le score : vert ≥ 75, ambre ≥ 50, rouge sinon.
 */
@Component({
  selector: 'app-score-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="score-ring grid shrink-0 place-items-center rounded-full"
      [style.--score]="score()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-label]="'Score de correspondance ' + score() + ' sur 100'"
      role="img"
    >
      <div
        class="grid place-items-center rounded-full bg-white"
        [style.width.px]="size() - 8"
        [style.height.px]="size() - 8"
      >
        <span
          class="font-display font-bold tabular-nums"
          [class]="textClass()"
          [style.font-size.px]="size() * 0.32"
        >
          {{ score() }}
        </span>
        @if (size() >= 64) {
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-400">match</span>
        }
      </div>
    </div>
  `,
})
export class ScoreRingComponent {
  readonly score = input.required<number>();
  readonly size = input<number>(56);

  readonly textClass = computed(() => {
    const score = this.score();
    if (score >= 75) return 'text-success-700';
    if (score >= 50) return 'text-warn-700';
    return 'text-danger-700';
  });
}
