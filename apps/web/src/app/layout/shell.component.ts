import { Component, inject, OnInit } from '@angular/core';
import { AppStore } from '../state/app.store';
import { TopNavComponent } from './top-nav.component';
import { SidebarComponent } from './sidebar.component';
import { RankingTableComponent } from '../features/ranking-table/ranking-table.component';
import { WorldMapComponent } from '../features/world-map/world-map.component';
import { CountryDetailPanelComponent } from '../features/country-detail/country-detail-panel.component';
import { ComparisonBarComponent } from '../features/comparison/comparison-bar.component';
import { ComparisonViewComponent } from '../features/comparison/comparison-view.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    TopNavComponent, SidebarComponent, RankingTableComponent, WorldMapComponent,
    CountryDetailPanelComponent, ComparisonBarComponent, ComparisonViewComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-hidden transition-colors duration-150"
         style="font-family: 'Geist', system-ui, sans-serif">

      <app-top-nav class="shrink-0" />

      <div class="flex flex-1 overflow-hidden">
        <app-sidebar class="hidden md:flex shrink-0" />

        <main class="flex-1 overflow-auto bg-[var(--color-bg)]">
          @if (store.loading()) {
            <div class="flex flex-col items-center justify-center h-full gap-4 text-[var(--color-text-tertiary)]">
              <div class="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
              <p class="text-sm">Loading 147 countries…</p>
            </div>
          } @else if (store.error()) {
            <div class="flex items-center justify-center h-full">
              <div class="max-w-md p-4 rounded-lg text-sm text-[var(--color-danger)]"
                   style="background:color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)">
                ⚠ {{ store.error() }}
              </div>
            </div>
          } @else if (store.activeView() === 'map') {
            <div class="h-full"><app-world-map /></div>
          } @else {
            <app-ranking-table />
          }
        </main>
      </div>

      @if (store.comparedCodes().length > 0) {
        <app-comparison-bar class="shrink-0" />
      }
    </div>

    <app-country-detail-panel />

    @if (store.showComparison()) {
      <div
        class="fixed inset-0 z-50 backdrop-blur-sm flex items-start justify-center overflow-auto p-4 pt-16"
        style="background: color-mix(in srgb, var(--color-bg) 90%, transparent)"
        (click)="store.closeComparison()"
      >
        <div class="w-full max-w-5xl" (click)="$event.stopPropagation()">
          <app-comparison-view />
        </div>
      </div>
    }
  `,
})
export class ShellComponent implements OnInit {
  readonly store = inject(AppStore);
  ngOnInit(): void { void this.store.loadAll(); }
}
