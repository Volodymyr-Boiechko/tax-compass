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

const MY_LIST: Region[] = [];
const EU_REGIONS: Region[] = ['western-europe', 'northern-europe', 'southern-europe', 'eastern-europe'];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [LucideX, ViewToggleComponent],
  template: `
    <aside class="w-[260px] h-full bg-zinc-950 border-r border-zinc-800 overflow-y-auto flex flex-col shrink-0">

      <!-- View -->
      <section class="p-4 border-b border-zinc-800">
        <p class="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-3">View</p>
        <app-view-toggle />
      </section>

      <!-- Regions -->
      <section class="p-4 border-b border-zinc-800">
        <p class="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-3">Regions</p>
        <div class="flex flex-col gap-1.5">
          @for (r of store.allRegions(); track r) {
            <label class="flex items-center gap-2.5 cursor-pointer group">
              <div
                class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                [class]="isRegionSelected(r)
                  ? 'bg-lime-400 border-lime-400'
                  : 'border-zinc-700 group-hover:border-zinc-500'"
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
                [class]="isRegionSelected(r) ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-300'"
                (click)="toggleRegion(r)"
              >{{ regionLabel(r) }}</span>
            </label>
          }
        </div>
      </section>

      <!-- Confidence -->
      <section class="p-4 border-b border-zinc-800">
        <p class="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-3">Confidence</p>
        <div class="flex flex-wrap gap-1.5">
          @for (c of confidenceOpts; track c.value) {
            <button
              class="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
              [class]="isConfSelected(c.value)
                ? 'bg-lime-400/10 border-lime-400 text-lime-400'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'"
              (click)="toggleConfidence(c.value)"
            >{{ c.label }}</button>
          }
        </div>
      </section>

      <!-- Quick filters -->
      <section class="p-4 border-b border-zinc-800">
        <p class="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-3">Quick Filters</p>
        <div class="flex flex-col gap-1">
          @for (f of quickFilters; track f.action) {
            <button
              class="text-left px-2 py-1.5 rounded text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              (click)="applyQuickFilter(f.action)"
            >{{ f.label }}</button>
          }
        </div>
      </section>

      <!-- Active / Reset -->
      @if (store.activeFilterCount() > 0) {
        <section class="p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-zinc-500">{{ store.activeFilterCount() }} filter{{ store.activeFilterCount() === 1 ? '' : 's' }} active</span>
            <button
              class="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
              (click)="store.clearFilters()"
            >
              <svg lucideX class="size-3"></svg>
              Reset all
            </button>
          </div>
        </section>
      }

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Count -->
      <div class="p-4 border-t border-zinc-800">
        <p class="text-xs text-zinc-500">
          <span class="text-zinc-100 font-medium">{{ store.filteredCount() }}</span>
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

  isRegionSelected(r: Region): boolean {
    return this.store.selectedRegions().includes(r);
  }

  toggleRegion(r: Region): void {
    const current = this.store.selectedRegions();
    if (current.includes(r)) {
      this.store.setRegions(current.filter(x => x !== r));
    } else {
      this.store.setRegions([...current, r]);
    }
  }

  isConfSelected(c: Confidence): boolean {
    return this.store.selectedConfidence().includes(c);
  }

  toggleConfidence(c: Confidence): void {
    const current = this.store.selectedConfidence();
    if (current.includes(c)) {
      this.store.setConfidence(current.filter(x => x !== c));
    } else {
      this.store.setConfidence([...current, c]);
    }
  }

  applyQuickFilter(action: string): void {
    switch (action) {
      case 'zero-tax':
        this.store.clearFilters();
        this.store.setConfidence(['high', 'medium-high', 'medium']);
        break;
      case 'eu':
        this.store.clearFilters();
        this.store.setRegions(EU_REGIONS);
        break;
      case 'my-list':
        this.store.clearFilters();
        this.store.setSearch('');
        break;
      case 'tax-havens':
        this.store.clearFilters();
        this.store.setRegions(['caribbean', 'pacific']);
        break;
    }
  }
}
