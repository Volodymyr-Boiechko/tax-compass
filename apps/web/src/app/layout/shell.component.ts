import { Component, effect, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStore } from '../state/app.store';
import { CurrencyService } from '../core/services/currency.service';
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

        <!-- Desktop sidebar (always visible on md+) -->
        <app-sidebar class="hidden md:flex shrink-0" />

        <!-- Mobile drawer -->
        @if (store.sidebarOpen()) {
          <div
            class="fixed inset-0 z-[60] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation filters"
          >
            <!-- Backdrop -->
            <div
              class="absolute inset-0 anim-fade-in"
              style="background: color-mix(in srgb, var(--color-bg) 75%, transparent)"
              (click)="store.closeSidebar()"
              aria-hidden="true"
            ></div>
            <!-- Drawer panel -->
            <div class="absolute left-0 top-0 bottom-0 w-[280px] z-50 anim-slide-in-left">
              <app-sidebar (closeRequest)="store.closeSidebar()" />
            </div>
          </div>
        }

        <!-- Main content -->
        <main id="main-content" class="flex-1 overflow-auto bg-[var(--color-bg)]" role="main">
          @if (store.loading()) {
            <div class="p-4 space-y-3">
              @for (i of skeletonRows; track i) {
                <div class="flex gap-3 items-center">
                  <div class="skeleton h-4 w-6 shrink-0"></div>
                  <div class="skeleton h-4 flex-1"></div>
                  <div class="skeleton h-4 w-20 hidden md:block"></div>
                  <div class="skeleton h-4 w-16 hidden lg:block"></div>
                </div>
              }
            </div>
          } @else if (store.error()) {
            <div class="flex items-center justify-center h-full">
              <div class="max-w-md p-4 rounded-lg text-sm text-[var(--color-danger)]"
                   style="background:color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)"
                   role="alert">
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

    <!-- Country detail slide-over (fixed, outside flex flow) -->
    <app-country-detail-panel />

    <!-- Comparison view overlay -->
    @if (store.showComparison()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-4 pt-12 md:pt-16 anim-fade-in"
        style="background: color-mix(in srgb, var(--color-bg) 90%, transparent)"
        (click)="store.closeComparison()"
        role="dialog"
        aria-modal="true"
        aria-label="Side-by-side country comparison"
      >
        <div class="w-full max-w-5xl anim-fade-in-up" (click)="$event.stopPropagation()">
          <app-comparison-view />
        </div>
      </div>
    }
  `,
})
export class ShellComponent implements OnInit {
  readonly store = inject(AppStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currency = inject(CurrencyService);

  readonly skeletonRows = Array.from({ length: 12 }, (_, i) => i);

  constructor() {
    effect(() => {
      const codes  = this.store.comparedCodes();
      const income = this.store.userIncome();
      const cur    = this.currency.currency();
      const per    = this.currency.period();

      const params: Record<string, string> = {};
      if (codes.length > 0)              params['c']     = codes.join(',');
      if (income != null && income > 0)  params['gross'] = String(Math.round(income));
      if (cur !== 'EUR')                 params['cur']   = cur;
      if (per !== 'annual')              params['per']   = per;

      void this.router.navigate([], {
        relativeTo:  this.route,
        queryParams: params,
        replaceUrl:  true,
      });
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;

    const c = qp.get('c');
    if (c) {
      const codes = c.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 3);
      if (codes.length > 0) this.store.setComparedCodes(codes);
    }

    const gross = qp.get('gross');
    if (gross) {
      const n = parseInt(gross, 10);
      if (!isNaN(n) && n > 0) this.store.setIncome(n);
    }

    const cur = qp.get('cur');
    if (cur === 'EUR' || cur === 'USD' || cur === 'UAH') this.currency.setCurrency(cur);

    const per = qp.get('per');
    if (per === 'annual' || per === 'monthly') this.currency.setPeriod(per);

    void this.store.loadAll();
  }
}
