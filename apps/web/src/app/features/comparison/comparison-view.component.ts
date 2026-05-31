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
    <div class="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <h2 class="text-base font-semibold text-zinc-100">Side-by-side comparison</h2>
        <button class="p-1.5 rounded text-zinc-500 hover:text-zinc-100 transition-colors" (click)="store.closeComparison()">
          <svg lucideX class="size-4"></svg>
        </button>
      </div>

      @if (countries().length < 2) {
        <div class="py-16 text-center text-zinc-600 text-sm italic">Add at least 2 countries to compare.</div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">

            <!-- Country headers -->
            <thead>
              <tr class="border-b border-zinc-800">
                <th class="px-4 py-3 text-left text-xs text-zinc-500 font-medium w-36">Metric</th>
                @for (c of countries(); track c.code) {
                  <th class="px-4 py-3 text-left">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">{{ c.flag ?? '🏳' }}</span>
                      <div>
                        <p class="text-sm font-semibold text-zinc-100">{{ c.name }}</p>
                        <p class="text-[10px] text-zinc-500">{{ regionLabel(c.region) }}</p>
                      </div>
                    </div>
                  </th>
                }
              </tr>
            </thead>

            <tbody>
              <!-- Your income section -->
              @if (incomeResults(); as ir) {
                <tr class="bg-zinc-900/50">
                  <td class="px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium" colspan="999">
                    Your income · €{{ fmtNum(ir.income) }}
                  </td>
                </tr>
                <tr class="border-b border-zinc-800/40">
                  <td class="px-4 py-2.5 text-xs text-zinc-500">Employment net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm" [class.bg-lime-400__10]="r.employment.net === ir.maxEmplNet">
                      <span [class]="r.employment.net === ir.maxEmplNet ? 'text-lime-400 font-semibold' : 'text-zinc-300'">
                        {{ fmtEuro(r.employment.net) }}
                      </span>
                      <span class="block text-[10px] text-zinc-600" [style.color]="rateColor(r.employment.effectiveRate)">
                        {{ fmtRate(r.employment.effectiveRate) }}
                      </span>
                    </td>
                  }
                </tr>
                <tr class="border-b border-zinc-800/40">
                  <td class="px-4 py-2.5 text-xs text-zinc-500">Best SE net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm">
                      <span [class]="r.selfEmployment.net === ir.maxSeNet ? 'text-lime-400 font-semibold' : 'text-zinc-300'">
                        {{ fmtEuro(r.selfEmployment.net) }}
                      </span>
                      <span class="block text-[10px] text-zinc-600">{{ r.selfEmployment.method }}</span>
                    </td>
                  }
                </tr>
              }

              <!-- Pre-computed rates -->
              <tr class="bg-zinc-900/50">
                <td class="px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium" colspan="999">
                  Pre-computed effective rates
                </td>
              </tr>

              @for (row of rateRows; track row.label) {
                <tr class="border-b border-zinc-800/40 hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-2.5 text-xs text-zinc-500">{{ row.label }}</td>
                  @for (c of countries(); track c.code) {
                    <td class="px-4 py-2.5 font-mono text-sm"
                        [class]="isWinner(c.code, row.metric) ? 'bg-lime-400/5' : ''">
                      <span [style.color]="rateColor(row.get(c))" [class]="isWinner(c.code, row.metric) ? 'font-semibold' : ''">
                        {{ fmtRate(row.get(c)) }}
                      </span>
                    </td>
                  }
                </tr>
              }

              <!-- Confidence -->
              <tr class="border-b border-zinc-800/40">
                <td class="px-4 py-2.5 text-xs text-zinc-500">Confidence</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 text-xs text-zinc-400">{{ confLabel(c.confidence) }}</td>
                }
              </tr>

              <!-- Best regime -->
              <tr class="border-b border-zinc-800/40">
                <td class="px-4 py-2.5 text-xs text-zinc-500">Best SE regime</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 text-xs text-zinc-400">
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

  fmtRate(r: number | null | undefined): string {
    if (r == null) return '—';
    return (r * 100).toFixed(1) + '%';
  }

  fmtEuro(n: number): string {
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

  confLabel(c: string | null): string {
    const MAP: Record<string, string> = { high: 'High', 'medium-high': 'Med+', medium: 'Medium', low: 'Low' };
    return c ? (MAP[c] ?? c) : 'Unknown';
  }
}
