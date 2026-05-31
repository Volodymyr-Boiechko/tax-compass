import { Component, computed, inject } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { AppStore } from '../../state/app.store';
import { CalculationService, CalculationResult } from '../../core/services/calculation.service';
import { Country } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

type MetricKey = 'empl30k' | 'empl60k' | 'empl100k' | 'se30k' | 'se60k' | 'se100k' | 'topPIT';

const METRICS: Array<{ key: MetricKey; get: (c: Country) => number | null | undefined }> = [
  { key: 'empl30k',  get: c => c.effectiveRates.employment['30k'] },
  { key: 'empl60k',  get: c => c.effectiveRates.employment['60k'] },
  { key: 'empl100k', get: c => c.effectiveRates.employment['100k'] },
  { key: 'se30k',    get: c => c.effectiveRates.bestSelfEmployment['30k'] },
  { key: 'se60k',    get: c => c.effectiveRates.bestSelfEmployment['60k'] },
  { key: 'se100k',   get: c => c.effectiveRates.bestSelfEmployment['100k'] },
  { key: 'topPIT',   get: c => c.personalIncomeTax?.topRate },
];

interface IncomeRow { country: Country; employment: CalculationResult; selfEmployment: CalculationResult; }

@Component({
  selector: 'app-comparison-view',
  standalone: true,
  imports: [LucideX],
  template: `
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">

      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-base font-semibold text-[var(--color-text-primary)]">Side-by-side comparison</h2>
        <button class="p-1.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors" (click)="store.closeComparison()">
          <svg lucideX class="size-4"></svg>
        </button>
      </div>

      @if (countries().length < 2) {
        <div class="py-16 text-center text-[var(--color-text-faint)] text-sm italic">Add at least 2 countries to compare.</div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-[var(--color-border)]">
                <th class="px-4 py-3 text-left text-xs text-[var(--color-text-tertiary)] font-medium w-36">Metric</th>
                @for (c of countries(); track c.code) {
                  <th class="px-4 py-3 text-left">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">{{ c.flag ?? '🏳' }}</span>
                      <div>
                        <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ c.name }}</p>
                        <p class="text-[10px] text-[var(--color-text-tertiary)]">{{ regionLabel(c.region) }}</p>
                      </div>
                    </div>
                  </th>
                }
              </tr>
            </thead>

            <tbody>
              @if (incomeResults(); as ir) {
                <tr class="bg-[var(--color-surface-hover)]/50">
                  <td class="px-4 py-2.5 text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium" colspan="999">
                    Your income · €{{ fmtNum(ir.income) }}
                  </td>
                </tr>
                <tr class="border-b border-[var(--color-border)]/40">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">Employment net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm"
                        [style]="r.employment.net === ir.maxEmplNet ? 'background: color-mix(in srgb, var(--color-accent) 8%, transparent)' : ''">
                      <span [style.color]="r.employment.net === ir.maxEmplNet ? 'var(--color-accent)' : 'var(--color-text-secondary)'" class="font-semibold">
                        {{ fmtEuro(r.employment.net) }}
                      </span>
                      <span class="block text-[10px]" [style.color]="rateColor(r.employment.effectiveRate)">
                        {{ fmtRate(r.employment.effectiveRate) }}
                      </span>
                    </td>
                  }
                </tr>
                <tr class="border-b border-[var(--color-border)]/40">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">Best SE net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm">
                      <span [style.color]="r.selfEmployment.net === ir.maxSeNet ? 'var(--color-accent)' : 'var(--color-text-secondary)'" class="font-semibold">
                        {{ fmtEuro(r.selfEmployment.net) }}
                      </span>
                      <span class="block text-[10px] text-[var(--color-text-faint)]">{{ r.selfEmployment.method }}</span>
                    </td>
                  }
                </tr>
              }

              <tr class="bg-[var(--color-surface-hover)]/50">
                <td class="px-4 py-2.5 text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium" colspan="999">
                  Pre-computed effective rates
                </td>
              </tr>

              @for (row of rateRows; track row.label) {
                <tr class="border-b border-[var(--color-border)]/40 hover:bg-[var(--color-surface-hover)]/30 transition-colors">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ row.label }}</td>
                  @for (c of countries(); track c.code) {
                    <td class="px-4 py-2.5 font-mono text-sm"
                        [style]="isWinner(c.code, row.metric) ? 'background: color-mix(in srgb, var(--color-accent) 6%, transparent)' : ''">
                      <span [style.color]="rateColor(row.get(c))" [class]="isWinner(c.code, row.metric) ? 'font-semibold' : ''">
                        {{ fmtRate(row.get(c)) }}
                      </span>
                    </td>
                  }
                </tr>
              }

              <tr class="border-b border-[var(--color-border)]/40">
                <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">Confidence</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{{ confLabel(c.confidence) }}</td>
                }
              </tr>

              <tr class="border-b border-[var(--color-border)]/40">
                <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">Best SE regime</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    {{ c.effectiveRates.bestSelfEmployment.regime ?? '—' }}
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ComparisonViewComponent {
  readonly store = inject(AppStore);
  readonly calcService = inject(CalculationService);
  readonly regionLabel = regionLabel;

  readonly countries = this.store.comparedCountries;

  readonly rateRows: Array<{ label: string; metric: MetricKey; get: (c: Country) => number | null | undefined }> = [
    { label: 'Employment 30k',  metric: 'empl30k',  get: c => c.effectiveRates.employment['30k'] },
    { label: 'Employment 60k',  metric: 'empl60k',  get: c => c.effectiveRates.employment['60k'] },
    { label: 'Employment 100k', metric: 'empl100k', get: c => c.effectiveRates.employment['100k'] },
    { label: 'Best SE 30k',     metric: 'se30k',    get: c => c.effectiveRates.bestSelfEmployment['30k'] },
    { label: 'Best SE 60k',     metric: 'se60k',    get: c => c.effectiveRates.bestSelfEmployment['60k'] },
    { label: 'Best SE 100k',    metric: 'se100k',   get: c => c.effectiveRates.bestSelfEmployment['100k'] },
    { label: 'Top PIT',         metric: 'topPIT',   get: c => c.personalIncomeTax?.topRate },
  ];

  readonly winners = computed(() => {
    const list = this.countries();
    const result = new Map<string, Set<string>>();
    for (const m of METRICS) {
      const vals = list.map(c => ({ code: c.code, val: m.get(c) ?? null }))
        .filter((x): x is { code: string; val: number } => x.val !== null);
      if (!vals.length) continue;
      const min = Math.min(...vals.map(v => v.val));
      for (const { code } of vals.filter(v => v.val === min)) {
        if (!result.has(code)) result.set(code, new Set());
        result.get(code)!.add(m.key);
      }
    }
    return result;
  });

  readonly incomeResults = computed(() => {
    const income = this.store.userIncome();
    if (!income || this.countries().length < 2) return null;
    const results: IncomeRow[] = this.countries().map(c => ({
      country: c,
      employment: this.calcService.calculateEmployment(c, income),
      selfEmployment: this.calcService.calculateBestSelfEmployment(c, income),
    }));
    return {
      income,
      results,
      maxEmplNet: Math.max(...results.map(r => r.employment.net)),
      maxSeNet: Math.max(...results.map(r => r.selfEmployment.net)),
    };
  });

  isWinner(code: string, metric: string): boolean {
    return this.winners().get(code)?.has(metric) ?? false;
  }

  rateColor(r: number | null | undefined): string {
    if (r == null) return 'var(--rate-na)';
    if (r < 0.10) return 'var(--rate-low)';
    if (r < 0.20) return 'var(--rate-low-mid)';
    if (r < 0.30) return 'var(--rate-mid)';
    if (r < 0.40) return 'var(--rate-high-mid)';
    return 'var(--rate-high)';
  }

  fmtRate(r: number | null | undefined): string {
    if (r == null) return '—';
    return (r * 100).toFixed(1) + '%';
  }

  fmtEuro(n: number): string { return '€' + Math.round(n).toLocaleString('en-US'); }
  fmtNum(n: number): string  { return n.toLocaleString('en-US'); }

  confLabel(c: string | null): string {
    const MAP: Record<string, string> = { high: 'High', 'medium-high': 'Med+', medium: 'Medium', low: 'Low' };
    return c ? (MAP[c] ?? c) : 'Unknown';
  }
}
