import { Component, computed, inject, signal } from '@angular/core';
import {
  LucideX, LucidePlus, LucideCheck, LucideExternalLink, LucideTrendingDown
} from '@lucide/angular';
import { AppStore } from '../../state/app.store';
import { CalculationService } from '../../core/services/calculation.service';
import { Country, TaxBracket } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

type Tab = 'overview' | 'brackets' | 'regimes' | 'sources';

@Component({
  selector: 'app-country-detail-panel',
  standalone: true,
  imports: [LucideX, LucidePlus, LucideCheck, LucideExternalLink, LucideTrendingDown],
  template: `
    <!-- Backdrop (mobile only) -->
    @if (isVisible()) {
      <div
        class="fixed inset-0 bg-black/60 z-30 md:hidden"
        (click)="close()"
      ></div>
    }

    <!-- Slide-over panel -->
    <div
      class="fixed right-0 top-14 bottom-0 w-full md:w-[480px] bg-zinc-950 border-l border-zinc-800 z-40 flex flex-col transition-transform duration-200 ease-out"
      [class.translate-x-0]="isVisible()"
      [class.translate-x-full]="!isVisible()"
    >
      @if (country(); as c) {

        <!-- Header -->
        <div class="flex items-start gap-3 p-4 border-b border-zinc-800 shrink-0">
          <span class="text-4xl leading-none mt-0.5">{{ c.flag ?? '🏳' }}</span>
          <div class="flex-1 min-w-0">
            <h1 class="text-xl font-semibold text-zinc-100 truncate">{{ c.name }}</h1>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-zinc-400">{{ regionLabel(c.region) }}</span>
              @if (c.confidence) {
                <span class="text-xs text-zinc-500">{{ confLabel(c.confidence) }} confidence</span>
              }
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border"
              [class]="isAdded()
                ? 'bg-lime-400/10 border-lime-400 text-lime-400 hover:bg-lime-400/20'
                : (!canAdd() ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-lime-400 hover:text-lime-400')"
              [disabled]="!isAdded() && !canAdd()"
              (click)="toggleComparison(c)"
            >
              @if (isAdded()) {
                <svg lucideCheck class="size-3.5"></svg>
                Added
              } @else {
                <svg lucidePlus class="size-3.5"></svg>
                Compare
              }
            </button>
            <button class="p-1.5 rounded text-zinc-500 hover:text-zinc-100 transition-colors" (click)="close()">
              <svg lucideX class="size-4"></svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-zinc-800 shrink-0">
          @for (tab of tabs; track tab.id) {
            <button
              class="px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px"
              [class]="activeTab() === tab.id
                ? 'border-lime-400 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'"
              (click)="activeTab.set(tab.id)"
            >{{ tab.label }}</button>
          }
        </div>

        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto p-4">

          <!-- OVERVIEW TAB -->
          @if (activeTab() === 'overview') {

            <!-- Your income row (if set) -->
            @if (incomeCalc(); as calc) {
              <div class="mb-4 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <p class="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">
                  Your income · €{{ fmtNum(store.userIncome()!) }}
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-[10px] text-zinc-600 mb-1">Employment</p>
                    <p class="text-lg font-semibold font-mono" [style.color]="rateColor(calc.employment.effectiveRate)">{{ fmtRate(calc.employment.effectiveRate) }}</p>
                    <p class="text-xs text-zinc-400 font-mono">{{ fmtEuro(calc.employment.net) }} net</p>
                  </div>
                  <div>
                    <p class="text-[10px] text-zinc-600 mb-1">Best SE</p>
                    <p class="text-lg font-semibold font-mono" [style.color]="rateColor(calc.selfEmployment.effectiveRate)">{{ fmtRate(calc.selfEmployment.effectiveRate) }}</p>
                    <p class="text-xs text-zinc-400 font-mono">{{ fmtEuro(calc.selfEmployment.net) }} net</p>
                    <p class="text-[10px] text-zinc-600 mt-0.5">{{ regimeLabel(calc.selfEmployment.method) }}</p>
                  </div>
                </div>
              </div>
            }

            <!-- Quick stats grid -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              @if (c.effectiveRates.employment['60k'] != null) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-[10px] text-zinc-600 mb-1">Employment at €60k</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.effectiveRates.employment['60k'])">
                    {{ fmtRate(c.effectiveRates.employment['60k']) }}
                  </p>
                </div>
              }
              @if (c.effectiveRates.bestSelfEmployment['60k'] != null) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-[10px] text-zinc-600 mb-1">Best SE at €60k</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.effectiveRates.bestSelfEmployment['60k'])">
                    {{ fmtRate(c.effectiveRates.bestSelfEmployment['60k']) }}
                  </p>
                  @if (c.effectiveRates.bestSelfEmployment.regime) {
                    <p class="text-[10px] text-zinc-500 mt-0.5 truncate">{{ c.effectiveRates.bestSelfEmployment.regime }}</p>
                  }
                </div>
              }
              @if (c.personalIncomeTax?.topRate != null) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-[10px] text-zinc-600 mb-1">Top PIT rate</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.personalIncomeTax!.topRate!)">
                    {{ fmtRate(c.personalIncomeTax!.topRate) }}
                  </p>
                </div>
              }
              @if (c.socialSecurity?.employeeRate != null) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-[10px] text-zinc-600 mb-1">Employee SS</p>
                  <p class="text-2xl font-semibold font-mono text-zinc-300">
                    {{ fmtRate(c.socialSecurity!.employeeRate) }}
                  </p>
                  @if (c.socialSecurity!.annualCap) {
                    <p class="text-[10px] text-zinc-500 mt-0.5">Cap: {{ fmtEuro(c.socialSecurity!.annualCap) }}</p>
                  }
                </div>
              }
            </div>

            <!-- Effective rates table -->
            <div class="mb-4">
              <h3 class="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                <svg lucideTrendingDown class="size-3"></svg>
                Effective rate by income level
              </h3>
              <div class="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                @if (store.userIncome() === null) {
                  <p class="px-3 py-2 text-[11px] text-zinc-600 italic border-b border-zinc-800">
                    Enter your income above to see exact calculations
                  </p>
                }
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-zinc-800">
                      <th class="px-3 py-2 text-left text-zinc-500 font-medium">Income</th>
                      <th class="px-3 py-2 text-right text-zinc-500 font-medium">Employment</th>
                      <th class="px-3 py-2 text-right text-zinc-500 font-medium">Best SE</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (lv of levels; track lv) {
                      <tr class="border-b border-zinc-800/50 last:border-0">
                        <td class="px-3 py-2 text-zinc-500 font-mono">€{{ lv }}</td>
                        <td class="px-3 py-2 text-right font-mono" [style.color]="rateColor(c.effectiveRates.employment[lv])">{{ fmtRate(c.effectiveRates.employment[lv]) }}</td>
                        <td class="px-3 py-2 text-right font-mono" [style.color]="rateColor(c.effectiveRates.bestSelfEmployment[lv])">{{ fmtRate(c.effectiveRates.bestSelfEmployment[lv]) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Changes 2026 -->
            @if (c.changes2026?.length) {
              <div class="mb-4">
                <h3 class="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">What Changed in 2026</h3>
                <ul class="space-y-1.5">
                  @for (change of c.changes2026; track $index) {
                    <li class="text-xs text-zinc-400 flex gap-2">
                      <span class="text-lime-600 shrink-0 mt-0.5">→</span>
                      {{ change }}
                    </li>
                  }
                </ul>
              </div>
            }
          }

          <!-- TAX BRACKETS TAB -->
          @if (activeTab() === 'brackets') {
            @if (c.personalIncomeTax?.brackets?.length) {
              <div class="mb-3">
                <h3 class="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">PIT Brackets ({{ c.personalIncomeTax!.currency ?? 'local currency' }})</h3>
                <div class="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-zinc-800">
                        <th class="px-3 py-2 text-left text-zinc-500 font-medium">Income range</th>
                        <th class="px-3 py-2 text-right text-zinc-500 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (b of c.personalIncomeTax!.brackets!; track $index) {
                        <tr class="border-b border-zinc-800/50 last:border-0">
                          <td class="px-3 py-2.5 text-zinc-400 font-mono">{{ fmtRange(b, c.personalIncomeTax?.currency ?? null) }}</td>
                          <td class="px-3 py-2.5 text-right font-mono font-semibold" [style.color]="rateColor(b.rate)">{{ fmtRate(b.rate) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <p class="text-sm text-zinc-600 italic py-8 text-center">No bracket data available</p>
            }
          }

          <!-- SELF-EMPLOYMENT / REGIMES TAB -->
          @if (activeTab() === 'regimes') {
            @if (c.specialRegimes?.length) {
              <div class="space-y-3">
                @for (r of c.specialRegimes!; track r.name) {
                  <div class="p-3 bg-zinc-900 rounded-lg border border-l-4 border-zinc-800"
                       [style.border-left-color]="r.rate !== null ? rateColor(r.rate) : '#27272a'">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-zinc-200">{{ r.name }}</span>
                      @if (r.rate !== null) {
                        <span class="text-lg font-semibold font-mono" [style.color]="rateColor(r.rate)">{{ fmtRate(r.rate) }}</span>
                      } @else {
                        <span class="text-sm text-zinc-600">N/A</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-zinc-600 italic py-8 text-center">No special regimes available</p>
            }
          }

          <!-- SOURCES TAB -->
          @if (activeTab() === 'sources') {
            <div class="space-y-3">
              <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <p class="text-xs font-medium text-zinc-300 mb-1">EY Worldwide Personal Tax Guide 2025-26</p>
                @if (c.sources?.ey) {
                  <p class="text-xs text-zinc-500">{{ c.sources!.ey }}</p>
                }
              </div>
              @if (c.sources?.pwc) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-xs font-medium text-zinc-300 mb-2">PwC Worldwide Tax Summaries</p>
                  <a [href]="c.sources!.pwc" target="_blank" rel="noopener"
                     class="inline-flex items-center gap-1.5 text-xs text-lime-400 hover:text-lime-300 transition-colors">
                    <svg lucideExternalLink class="size-3"></svg>
                    Open source
                  </a>
                </div>
              }
              @if (c.crossVerification) {
                <div class="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p class="text-xs font-medium text-zinc-300 mb-1">Cross-verification</p>
                  <p class="text-xs text-zinc-500">{{ c.crossVerification.status }}</p>
                </div>
              }
              @if (c.knownGaps?.length) {
                <div class="p-3 bg-amber-950/30 rounded-lg border border-amber-900/40">
                  <p class="text-xs font-medium text-amber-400 mb-2">Known gaps ({{ c.knownGaps.length }})</p>
                  <ul class="space-y-1">
                    @for (g of c.knownGaps; track $index) {
                      <li class="text-xs text-zinc-500">• {{ g }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }

        </div>
      }
    </div>
  `,
})
export class CountryDetailPanelComponent {
  readonly store = inject(AppStore);
  readonly calcService = inject(CalculationService);
  readonly regionLabel = regionLabel;

  readonly country = this.store.selectedCountry;
  readonly isVisible = computed(() => this.store.selectedCountry() !== null);

  readonly activeTab = signal<Tab>('overview');
  readonly levels = ['30k', '60k', '100k'] as const;

  readonly tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'brackets', label: 'Tax Brackets' },
    { id: 'regimes', label: 'SE Regimes' },
    { id: 'sources', label: 'Sources' },
  ];

  readonly isAdded = computed(() => {
    const c = this.store.selectedCountry();
    return c ? this.store.comparedCodes().includes(c.code) : false;
  });

  readonly canAdd = computed(() => this.store.canAddMore());

  readonly incomeCalc = computed(() => {
    const income = this.store.userIncome();
    const c = this.store.selectedCountry();
    if (!income || !c) return null;
    return {
      employment: this.calcService.calculateEmployment(c, income),
      selfEmployment: this.calcService.calculateBestSelfEmployment(c, income),
    };
  });

  close(): void { this.store.selectCountry(null); }

  toggleComparison(c: Country): void {
    if (this.store.isInComparison(c.code)) {
      this.store.removeFromComparison(c.code);
    } else {
      this.store.addToComparison(c.code);
    }
  }

  confLabel(c: string | null): string {
    const MAP: Record<string, string> = { high: 'High', 'medium-high': 'Med+', medium: 'Medium', low: 'Low' };
    return c ? (MAP[c] ?? c) : 'Unknown';
  }

  fmtRate(r: number | null | undefined): string {
    if (r == null) return '—';
    return (r * 100).toFixed(1) + '%';
  }

  fmtEuro(n: number | null | undefined): string {
    if (n == null) return '—';
    return '€' + Math.round(n).toLocaleString('en-US');
  }

  fmtNum(n: number): string { return n.toLocaleString('en-US'); }

  rateColor(r: number | null | undefined): string {
    if (r == null) return '#52525b';
    if (r < 0.10) return '#a3e635';
    if (r < 0.20) return '#84cc16';
    if (r < 0.30) return '#facc15';
    if (r < 0.40) return '#fb923c';
    return '#f87171';
  }

  fmtRange(b: TaxBracket, currency: string | null): string {
    const fmt = (n: number) => {
      const s = Math.round(n).toLocaleString('en-US');
      if (currency === 'EUR') return '€' + s;
      if (currency === 'USD') return '$' + s;
      if (currency === 'GBP') return '£' + s;
      return s + (currency ? ' ' + currency : '');
    };
    if (b.to === null) return `Above ${fmt(b.from)}`;
    return `${fmt(b.from)} – ${fmt(b.to)}`;
  }

  regimeLabel(method: string): string {
    const m = method.match(/\((.+)\)$/);
    return m ? m[1] : '';
  }
}
