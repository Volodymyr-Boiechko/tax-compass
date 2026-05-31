import { Component, inject } from '@angular/core';
import { LucideX, LucideBarChart2 } from '@lucide/angular';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-comparison-bar',
  standalone: true,
  imports: [LucideX, LucideBarChart2],
  template: `
    <div class="h-14 bg-zinc-950 border-t border-zinc-800 flex items-center px-4 gap-4">

      <!-- Label -->
      <span class="text-sm text-zinc-500 shrink-0">
        Comparing
        <span class="text-zinc-100 font-medium">{{ store.comparedCodes().length }}/3</span>
      </span>

      <!-- Country chips -->
      <div class="flex items-center gap-2 flex-1 overflow-x-auto min-w-0">
        @for (country of store.comparedCountries(); track country.code) {
          <div class="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 shrink-0">
            <span class="text-sm">{{ country.flag ?? '🏳' }}</span>
            <span class="text-xs font-medium text-zinc-300">{{ country.name }}</span>
            <button
              class="text-zinc-600 hover:text-zinc-300 transition-colors ml-0.5"
              (click)="store.removeFromComparison(country.code)"
            >
              <svg lucideX class="size-3"></svg>
            </button>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          [class]="store.comparedCodes().length >= 2
            ? 'bg-lime-400 text-black hover:bg-lime-300'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'"
          [disabled]="store.comparedCodes().length < 2"
          (click)="store.openComparison()"
        >
          <svg lucideBarChart2 class="size-3.5"></svg>
          Compare
        </button>
        <button
          class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          (click)="store.clearComparison()"
        >Clear</button>
      </div>
    </div>
  `,
})
export class ComparisonBarComponent {
  readonly store = inject(AppStore);
}
