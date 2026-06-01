import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  LucideX, LucidePlus, LucideCheck, LucideExternalLink, LucideTrendingDown
} from '@lucide/angular';
import { AppStore } from '../../state/app.store';
import { CalculationService, CalculationResult } from '../../core/services/calculation.service';
import { RegimeCalculationService } from '../../core/services/regime-calculation.service';
import { Country, TaxBracket } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';
import { RegimeCalculatorComponent } from './regime-calculator.component';

type Tab = 'overview' | 'brackets' | 'regimes' | 'sources';

@Component({
  selector: 'app-country-detail-panel',
  standalone: true,
  imports: [LucideX, LucidePlus, LucideCheck, LucideExternalLink, LucideTrendingDown, RegimeCalculatorComponent],
  template: `
    @if (isVisible()) {
      <div
        class="fixed inset-0 z-30 md:hidden"
        style="background: color-mix(in srgb, var(--color-bg) 60%, transparent)"
        (click)="close()"
      ></div>
    }

    <div
      class="detail-panel"
      [class.panel-visible]="isVisible()"
      [class.panel-hidden]="!isVisible()"
      [attr.inert]="isVisible() ? null : ''"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="isVisible() ? 'detail-country-name' : null"
    >
      @if (country(); as c) {

        <!-- Header -->
        <div class="flex items-start gap-3 p-4 border-b border-[var(--color-border)] shrink-0">
          <span class="text-4xl leading-none mt-0.5">{{ c.flag ?? '🏳' }}</span>
          <div class="flex-1 min-w-0">
            <h1 id="detail-country-name" class="text-xl font-semibold text-[var(--color-text-primary)] truncate">{{ c.name }}</h1>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded px-2 py-0.5 text-[var(--color-text-secondary)]">{{ regionLabel(c.region) }}</span>
              @if (c.confidence) {
                <span class="text-xs text-[var(--color-text-tertiary)]">{{ confLabel(c.confidence) }} confidence</span>
              }
              @if (c.computableRegimes?.length) {
                <button
                  class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style="background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)"
                  (click)="activeTab.set('overview')"
                  [attr.aria-label]="c.computableRegimes!.length + ' live regime calculators available'"
                  title="Live regime calculator available"
                >⚡ {{ c.computableRegimes!.length }} regimes</button>
              }
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border"
              [class]="isAdded()
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
                : (!canAdd() ? 'bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-faint)] cursor-not-allowed' : 'bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]')"
              [disabled]="!isAdded() && !canAdd()"
              (click)="toggleComparison(c)"
            >
              @if (isAdded()) {
                <svg lucideCheck class="size-3.5" aria-hidden="true"></svg>
                Added
              } @else {
                <svg lucidePlus class="size-3.5" aria-hidden="true"></svg>
                Compare
              }
            </button>
            <button
              class="p-2 md:p-1.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Close country details"
              data-detail-close
              (click)="close()"
            >
              <svg lucideX class="size-5 md:size-4" aria-hidden="true"></svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-[var(--color-border)] shrink-0" role="tablist" aria-label="Country detail sections">
          @for (tab of tabs; track tab.id) {
            <button
              class="px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              [class]="activeTab() === tab.id
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
              (click)="activeTab.set(tab.id)"
            >{{ tab.label }}</button>
          }
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4" role="tabpanel" [attr.aria-label]="activeTab() + ' tab content'">

          <!-- OVERVIEW -->
          @if (activeTab() === 'overview') {

            @if (incomeCalc(); as calc) {
              <div class="mb-4 p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2">
                  Your income · €{{ fmtNum(store.userIncome()!) }}
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Employment</p>
                    @if (calc.employment; as emp) {
                      <p class="text-lg font-semibold font-mono" [style.color]="rateColor(emp.effectiveRate)">{{ fmtRate(emp.effectiveRate) }}</p>
                      <p class="text-xs text-[var(--color-text-secondary)] font-mono">{{ fmtEuro(emp.net) }} net</p>
                      @if (emp.isDerived) {
                        <p class="text-[10px] text-[var(--color-text-faint)] mt-0.5">~ EY/PwC rate</p>
                      }
                    } @else {
                      <p class="text-lg font-semibold text-[var(--color-text-faint)]">—</p>
                      <p class="text-xs text-[var(--color-text-faint)]">No data</p>
                    }
                  </div>
                  <div>
                    <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Best SE</p>
                    @if (calc.selfEmployment; as se) {
                      <p class="text-lg font-semibold font-mono" [style.color]="rateColor(se.effectiveRate)">{{ fmtRate(se.effectiveRate) }}</p>
                      <p class="text-xs text-[var(--color-text-secondary)] font-mono">{{ fmtEuro(se.net) }} net</p>
                      <p class="text-[10px] text-[var(--color-text-faint)] mt-0.5">{{ regimeLabel(se.method) }}</p>
                      @if (se.isDerived) {
                        <p class="text-[10px] text-[var(--color-text-faint)]">~ EY/PwC rate</p>
                      }
                    } @else {
                      <p class="text-lg font-semibold text-[var(--color-text-faint)]">—</p>
                      <p class="text-xs text-[var(--color-text-faint)]">No data</p>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Quick stat cards -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              @if (c.effectiveRates.employment['60k'] != null) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Employment at €60k</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.effectiveRates.employment['60k'])">
                    {{ fmtRate(c.effectiveRates.employment['60k']) }}
                  </p>
                </div>
              }
              @if (c.effectiveRates.bestSelfEmployment['60k'] != null) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Best SE at €60k</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.effectiveRates.bestSelfEmployment['60k'])">
                    {{ fmtRate(c.effectiveRates.bestSelfEmployment['60k']) }}
                  </p>
                  @if (c.effectiveRates.bestSelfEmployment.regime) {
                    <p class="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 truncate">{{ c.effectiveRates.bestSelfEmployment.regime }}</p>
                  }
                </div>
              }
              @if (c.personalIncomeTax?.topRate != null) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Top PIT rate</p>
                  <p class="text-2xl font-semibold font-mono" [style.color]="rateColor(c.personalIncomeTax!.topRate!)">
                    {{ fmtRate(c.personalIncomeTax!.topRate) }}
                  </p>
                </div>
              }
              @if (c.socialSecurity?.employeeRate != null) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-[10px] text-[var(--color-text-faint)] mb-1">Employee SS</p>
                  <p class="text-2xl font-semibold font-mono text-[var(--color-text-secondary)]">
                    {{ fmtRate(c.socialSecurity!.employeeRate) }}
                  </p>
                  @if (c.socialSecurity!.annualCap) {
                    <p class="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Cap: {{ fmtEuro(c.socialSecurity!.annualCap) }}</p>
                  }
                </div>
              }
            </div>

            <!-- Live regime calculator (15 top countries) OR static table fallback -->
            @if (c.computableRegimes && c.computableRegimes.length > 0) {
              <div class="mb-4">
                <h3 class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                  <svg lucideTrendingDown class="size-3" aria-hidden="true"></svg>
                  Live Regime Calculator
                </h3>
                <app-regime-calculator [country]="c" />
              </div>
            } @else {
              <div class="mb-4">
                <h3 class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                  <svg lucideTrendingDown class="size-3" aria-hidden="true"></svg>
                  Effective rate by income level
                </h3>
                @if (store.userIncome() === null) {
                  <p class="text-[11px] text-[var(--color-text-faint)] italic mb-2">Enter your income above to see exact calculations</p>
                }
                <div class="bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-[var(--color-border)]">
                        <th class="px-3 py-2 text-left text-[var(--color-text-tertiary)] font-medium">Income</th>
                        <th class="px-3 py-2 text-right text-[var(--color-text-tertiary)] font-medium">Employment</th>
                        <th class="px-3 py-2 text-right text-[var(--color-text-tertiary)] font-medium">Best SE</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (lv of levels; track lv) {
                        <tr class="border-b border-[var(--color-border)]/50 last:border-0">
                          <td class="px-3 py-2 text-[var(--color-text-tertiary)] font-mono">€{{ lv }}</td>
                          <td class="px-3 py-2 text-right font-mono" [style.color]="rateColor(c.effectiveRates.employment[lv])">{{ fmtRate(c.effectiveRates.employment[lv]) }}</td>
                          <td class="px-3 py-2 text-right font-mono" [style.color]="rateColor(c.effectiveRates.bestSelfEmployment[lv])">{{ fmtRate(c.effectiveRates.bestSelfEmployment[lv]) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (c.changes2026?.length) {
              <div class="mb-4">
                <h3 class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2">What Changed in 2026</h3>
                <ul class="space-y-1.5">
                  @for (change of c.changes2026; track $index) {
                    <li class="text-xs text-[var(--color-text-secondary)] flex gap-2">
                      <span class="text-[var(--color-accent)] shrink-0 mt-0.5">→</span>
                      {{ change }}
                    </li>
                  }
                </ul>
              </div>
            }
          }

          <!-- TAX BRACKETS -->
          @if (activeTab() === 'brackets') {
            @if (c.personalIncomeTax?.brackets?.length) {
              <h3 class="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-3">
                PIT Brackets ({{ c.personalIncomeTax!.currency ?? 'local currency' }})
              </h3>
              <div class="bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-[var(--color-border)]">
                      <th class="px-3 py-2 text-left text-[var(--color-text-tertiary)] font-medium">Income range</th>
                      <th class="px-3 py-2 text-right text-[var(--color-text-tertiary)] font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (b of c.personalIncomeTax!.brackets!; track $index) {
                      <tr class="border-b border-[var(--color-border)]/50 last:border-0">
                        <td class="px-3 py-2.5 text-[var(--color-text-secondary)] font-mono">{{ fmtRange(b, c.personalIncomeTax?.currency ?? null) }}</td>
                        <td class="px-3 py-2.5 text-right font-mono font-semibold" [style.color]="rateColor(b.rate)">{{ fmtRate(b.rate) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-sm text-[var(--color-text-faint)] italic py-8 text-center">No bracket data available</p>
            }
          }

          <!-- REGIMES -->
          @if (activeTab() === 'regimes') {
            @if (c.specialRegimes?.length) {
              <div class="space-y-3">
                @for (r of c.specialRegimes!; track r.name) {
                  <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-l-4 border-[var(--color-border)]"
                       [style.border-left-color]="r.rate !== null ? rateColor(r.rate) : 'var(--color-border)'">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-[var(--color-text-primary)]">{{ r.name }}</span>
                      @if (r.rate !== null) {
                        <span class="text-lg font-semibold font-mono" [style.color]="rateColor(r.rate)">{{ fmtRate(r.rate) }}</span>
                      } @else {
                        <span class="text-sm text-[var(--color-text-faint)]">N/A</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-[var(--color-text-faint)] italic py-8 text-center">No special regimes available</p>
            }
          }

          <!-- SOURCES -->
          @if (activeTab() === 'sources') {
            <div class="space-y-3">
              <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                <p class="text-xs font-medium text-[var(--color-text-primary)] mb-1">EY Worldwide Personal Tax Guide 2025-26</p>
                @if (c.sources?.ey) {
                  <p class="text-xs text-[var(--color-text-tertiary)]">{{ c.sources!.ey }}</p>
                }
              </div>
              @if (c.sources?.pwc) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-xs font-medium text-[var(--color-text-primary)] mb-2">PwC Worldwide Tax Summaries</p>
                  <a [href]="c.sources!.pwc" target="_blank" rel="noopener"
                     class="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity">
                    <svg lucideExternalLink class="size-3" aria-hidden="true"></svg>
                    Open source
                  </a>
                </div>
              }
              @if (c.crossVerification) {
                <div class="p-3 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
                  <p class="text-xs font-medium text-[var(--color-text-primary)] mb-1">Cross-verification</p>
                  <p class="text-xs text-[var(--color-text-tertiary)]">{{ c.crossVerification.status }}</p>
                </div>
              }
              @if (c.knownGaps?.length) {
                <div class="p-3 rounded-lg border"
                     style="background: color-mix(in srgb, var(--color-warning) 6%, transparent); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent)">
                  <p class="text-xs font-medium mb-2" style="color: var(--color-warning)">Known gaps ({{ c.knownGaps.length }})</p>
                  <ul class="space-y-1">
                    @for (g of c.knownGaps; track $index) {
                      <li class="text-xs text-[var(--color-text-tertiary)]">• {{ g }}</li>
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
  readonly regimeCalcService = inject(RegimeCalculationService);
  readonly regionLabel = regionLabel;

  readonly country = this.store.selectedCountry;
  readonly isVisible = computed(() => this.store.selectedCountry() !== null);
  readonly activeTab = signal<Tab>('overview');
  readonly levels = ['30k', '60k', '100k'] as const;

  private readonly lastOpenedCode = signal<string | null>(null);

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const code = this.country()?.code ?? null;
      if (visible && code) {
        untracked(() => this.lastOpenedCode.set(code));
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-detail-close]')?.focus();
        }, 230);
      } else if (!visible) {
        const prev = untracked(() => this.lastOpenedCode());
        if (prev && window.innerWidth >= 768) {
          requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-row-code="${prev}"]`)?.focus();
          });
        }
      }
    });
  }

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

    // For countries with computableRegimes, use the accurate regime calculator
    if ((c.computableRegimes?.length ?? 0) > 0) {
      const cmp = this.regimeCalcService.calculateAll(c, income);
      if (!cmp) return null;
      const empResult = cmp.regimes.find(r => r.regimeType === 'employment');
      const seResult = cmp.regimes
        .filter(r => r.regimeType === 'self-employment')
        .reduce<typeof cmp.regimes[0] | null>((b, r) => (!b || r.net > b.net ? r : b), null);
      const bestResult = cmp.best;
      const toResult = (r: typeof cmp.regimes[0]): CalculationResult => ({
        gross: r.gross, socialSecurity: r.socialSecurity,
        incomeTax: r.incomeTax, net: r.net, effectiveRate: r.effectiveRate,
        method: r.regimeName,
      });
      return {
        employment: empResult ? toResult(empResult) : toResult(bestResult),
        selfEmployment: toResult(seResult ?? bestResult),
      };
    }

    const employment = this.calcService.calculateEmployment(c, income);
    const selfEmployment = this.calcService.calculateBestSelfEmployment(c, income);
    if (!employment && !selfEmployment) return null;
    return { employment, selfEmployment };
  });

  close(): void {
    this.store.selectCountry(null);
  }

  toggleComparison(c: Country): void {
    if (this.store.isInComparison(c.code)) {
      this.store.removeFromComparison(c.code);
    } else {
      this.store.addToComparison(c.code);
    }
  }

  rateColor(r: number | null | undefined): string {
    if (r == null) return 'var(--rate-na)';
    if (r < 0.10) return 'var(--rate-low)';
    if (r < 0.20) return 'var(--rate-low-mid)';
    if (r < 0.30) return 'var(--rate-mid)';
    if (r < 0.40) return 'var(--rate-high-mid)';
    return 'var(--rate-high)';
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

  fmtRange(b: TaxBracket, currency: string | null): string {
    const fmt = (n: number) => {
      const s = Math.round(n).toLocaleString('en-US');
      if (currency === 'EUR') return '€' + s;
      if (currency === 'USD') return '$' + s;
      if (currency === 'GBP') return '£' + s;
      return s + (currency ? ' ' + currency : '');
    };
    return b.to === null ? `Above ${fmt(b.from)}` : `${fmt(b.from)} – ${fmt(b.to)}`;
  }

  regimeLabel(method: string): string {
    const m = method.match(/\((.+)\)$/);
    return m ? m[1] : '';
  }
}
