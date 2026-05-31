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
    TopNavComponent,
    SidebarComponent,
    RankingTableComponent,
    WorldMapComponent,
    CountryDetailPanelComponent,
    ComparisonBarComponent,
    ComparisonViewComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-black text-zinc-100 overflow-hidden" style="font-family: 'Geist', system-ui, sans-serif">

      <!-- Top navigation -->
      <app-top-nav class="shrink-0" />

      <!-- Content row -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Sidebar -->
        <app-sidebar class="hidden md:flex shrink-0" />

        <!-- Main -->
        <main class="flex-1 overflow-auto">
          @if (store.loading()) {
            <div class="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
              <div class="w-8 h-8 border-2 border-zinc-800 border-t-lime-400 rounded-full animate-spin"></div>
              <p class="text-sm">Loading 147 countries…</p>
            </div>
          } @else if (store.error()) {
            <div class="flex items-center justify-center h-full">
              <div class="max-w-md p-4 bg-red-950/30 border border-red-900/40 rounded-lg text-sm text-red-400">
                ⚠ {{ store.error() }}
              </div>
            </div>
          } @else if (store.activeView() === 'map') {
            <div class="h-full">
              <app-world-map />
            </div>
          } @else {
            <app-ranking-table />
          }
        </main>
      </div>

      <!-- Comparison bar (sticky bottom) -->
      @if (store.comparedCodes().length > 0) {
        <app-comparison-bar class="shrink-0" />
      }
    </div>

    <!-- Fixed overlays (outside flex flow) -->
    <app-country-detail-panel />

    @if (store.showComparison()) {
      <div
        class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-start justify-center overflow-auto p-4 pt-16"
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

  ngOnInit(): void {
    void this.store.loadAll();
  }
}
