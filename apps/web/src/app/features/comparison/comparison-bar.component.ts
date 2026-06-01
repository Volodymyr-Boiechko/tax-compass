import { Component, inject } from '@angular/core';
import { LucideX, LucideBarChart2 } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-comparison-bar',
  standalone: true,
  imports: [LucideX, LucideBarChart2, TranslatePipe],
  template: `
    <div
      class="h-14 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center px-4 gap-4 transition-colors duration-150 anim-slide-in-up"
      role="region"
      aria-label="Comparison selection"
    >

      <span class="text-sm text-[var(--color-text-tertiary)] shrink-0">
        {{ 'comparison.comparing' | translate }}
        <span class="text-[var(--color-text-primary)] font-medium">{{ store.comparedCodes().length }}/3</span>
      </span>

      <div class="flex items-center gap-2 flex-1 overflow-x-auto min-w-0">
        @for (country of store.comparedCountries(); track country.code) {
          <div class="flex items-center gap-1.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md px-2.5 py-1 shrink-0">
            <span class="text-sm">{{ country.flag ?? '🏳' }}</span>
            <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ country.name }}</span>
            <button
              class="text-[var(--color-text-faint)] hover:text-[var(--color-text-secondary)] transition-colors ml-0.5"
              [attr.aria-label]="'Remove ' + country.name + ' from comparison'"
              (click)="store.removeFromComparison(country.code)"
            >
              <svg lucideX class="size-3" aria-hidden="true"></svg>
            </button>
          </div>
        }
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          [class]="store.comparedCodes().length >= 2
            ? 'bg-[var(--color-accent)] text-black hover:opacity-90'
            : 'bg-[var(--color-border)] text-[var(--color-text-faint)] cursor-not-allowed'"
          [disabled]="store.comparedCodes().length < 2"
          (click)="store.openComparison()"
        >
          <svg lucideBarChart2 class="size-3.5" aria-hidden="true"></svg>
          <span class="hidden sm:inline">{{ 'comparison.compare' | translate }}</span>
        </button>
        <button
          class="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          aria-label="Clear all countries from comparison"
          (click)="store.clearComparison()"
        >{{ 'comparison.clear' | translate }}</button>
      </div>
    </div>
  `,
})
export class ComparisonBarComponent {
  readonly store = inject(AppStore);
}
