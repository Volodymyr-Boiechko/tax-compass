import { Component, inject } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { AppStore } from '../state/app.store';
import { ViewToggleComponent } from '../features/view-toggle/view-toggle.component';
import { Confidence, Region } from '../core/models/country.model';
import { regionLabel } from '../core/utils/region.utils';

const QUICK_FILTERS: Array<{ label: string; action: string }> = [
  { label: 'Zero Tax', action: 'zero-tax' },
  { label: 'EU Only', action: 'eu' },
  { label: 'My List', action: 'my-list' },
  { label: 'Tax Havens', action: 'tax-havens' },
];

const CONFIDENCE_OPTS: Array<{ value: Confidence; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium-high', label: 'Med+' },
  { value: 'medium', label: 'Med' },
  { value: 'low', label: 'Low' },
];

const EU_REGIONS: Region[] = ['western-europe', 'northern-europe', 'southern-europe', 'eastern-europe'];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [LucideX, ViewToggleComponent],
  template: `
    <aside class="w-[260px] h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-y-auto flex flex-col shrink-0 transition-colors duration-150">

      <!-- View -->
      <section class="p-4 border-b border-[var(--color-border)]">
        <p class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-medium mb-3">View</p>
        <app-view-toggle />
      </section>

      <!-- Regions -->
      <section class="p-4 border-b border-[var(--color-border)]">
        <p class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-medium mb-3">Regions</p>
        <div class="flex flex-col gap-1.5">
          @for (r of store.allRegions(); track r) {
            <label class="flex items-center gap-2.5 cursor-pointer group">
              <div
                class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                [class]="isRegionSelected(r)
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                  : 'border-[var(--color-border-bright)] group-hover:border-[var(--color-text-tertiary)]'"
                (click)="toggleRegion(r)"
              >
                @if (isRegionSelected(r)) {
                  <svg viewBox="0 0 12 12" class="w-2.5 h-2.5" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                }
              </div>
              <span
                class="text-sm transition-colors"
                [class]="isRegionSelected(r)
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'"
                (click)="toggleRegion(r)"
              >{{ regionLabel(r) }}</span>
            </label>
          }
        </div>
      </section>

      <!-- Confidence -->
      <section class="p-4 border-b border-[var(--color-border)]">
        <p class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-medium mb-3">Confidence</p>
        <div class="flex flex-wrap gap-1.5">
          @for (c of confidenceOpts; track c.value) {
            <button
              class="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
              [class]="isConfSelected(c.value)
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-bright)] hover:text-[var(--color-text-secondary)]'"
              (click)="toggleConfidence(c.value)"
            >{{ c.label }}</button>
          }
        </div>
      </section>

      <!-- Quick filters -->
      <section class="p-4 border-b border-[var(--color-border)]">
        <p class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-medium mb-3">Quick Filters</p>
        <div class="flex flex-col gap-1">
          @for (f of quickFilters; track f.action) {
            <button
              class="text-left px-2 py-1.5 rounded text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              (click)="applyQuickFilter(f.action)"
            >{{ f.label }}</button>
          }
        </div>
      </section>

      <!-- Active / Reset -->
      @if (store.activeFilterCount() > 0) {
        <section class="p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--color-text-tertiary)]">
              {{ store.activeFilterCount() }} filter{{ store.activeFilterCount() === 1 ? '' : 's' }} active
            </span>
            <button
              class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors flex items-center gap-1"
              (click)="store.clearFilters()"
            >
              <svg lucideX class="size-3"></svg>
              Reset all
            </button>
          </div>
        </section>
      }

      <div class="flex-1"></div>

      <!-- Count -->
      <div class="p-4 border-t border-[var(--color-border)]">
        <p class="text-xs text-[var(--color-text-tertiary)]">
          <span class="text-[var(--color-text-primary)] font-medium">{{ store.filteredCount() }}</span>
          / {{ store.countryCount() }} countries
        </p>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  readonly store = inject(AppStore);
  readonly regionLabel = regionLabel;
  readonly confidenceOpts = CONFIDENCE_OPTS;
  readonly quickFilters = QUICK_FILTERS;

  isRegionSelected(r: Region): boolean { return this.store.selectedRegions().includes(r); }

  toggleRegion(r: Region): void {
    const cur = this.store.selectedRegions();
    this.store.setRegions(cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]);
  }

  isConfSelected(c: Confidence): boolean { return this.store.selectedConfidence().includes(c); }

  toggleConfidence(c: Confidence): void {
    const cur = this.store.selectedConfidence();
    this.store.setConfidence(cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }

  applyQuickFilter(action: string): void {
    this.store.clearFilters();
    switch (action) {
      case 'eu':         this.store.setRegions(EU_REGIONS); break;
      case 'tax-havens': this.store.setRegions(['caribbean', 'pacific']); break;
    }
  }
}
