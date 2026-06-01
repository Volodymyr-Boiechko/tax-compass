import { Component, computed, inject } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../../state/app.store';
import { RegimeCalculationService } from '../../core/services/regime-calculation.service';
import { Country } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

interface IncomeRow {
  country: Country;
  employment: { net: number; effectiveRate: number; isApproximation?: boolean } | null;
  selfEmployment: { net: number; effectiveRate: number; method: string; isApproximation?: boolean } | null;
}

@Component({
  selector: 'app-comparison-view',
  standalone: true,
  imports: [LucideX, TranslatePipe],
  template: `
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">

      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-base font-semibold text-[var(--color-text-primary)]">{{ 'comparison.title' | translate }}</h2>
        <button class="p-1.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="Close comparison" (click)="store.closeComparison()">
          <svg lucideX class="size-4" aria-hidden="true"></svg>
        </button>
      </div>

      @if (countries().length < 2) {
        <div class="py-16 text-center text-[var(--color-text-faint)] text-sm italic">{{ 'comparison.addAtLeast2' | translate }}</div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-[var(--color-border)]">
                <th class="px-4 py-3 text-left text-xs text-[var(--color-text-tertiary)] font-medium w-36">{{ 'comparison.metric' | translate }}</th>
                @for (c of countries(); track c.code) {
                  <th class="px-4 py-3 text-left">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">{{ c.flag ?? '🏳' }}</span>
                      <div>
                        <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ c.name }}</p>
                        <p class="text-[10px] text-[var(--color-text-tertiary)]">{{ regionLabel(c.region) | translate }}</p>
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
                    {{ 'comparison.yourIncome' | translate }} · €{{ fmtNum(ir.income) }}
                  </td>
                </tr>
                <tr class="border-b border-[var(--color-border)]/40">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ 'comparison.employmentNet' | translate }}</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm"
                        [style]="r.employment?.net === ir.maxEmplNet ? 'background: color-mix(in srgb, var(--color-accent) 8%, transparent)' : ''">
                      <span [style.color]="r.employment?.net === ir.maxEmplNet ? 'var(--color-accent)' : 'var(--color-text-secondary)'" class="font-semibold">
                        {{ fmtEuro(r.employment?.net) }}
                      </span>
                      <span class="block text-[10px]" [style.color]="rateColor(r.employment?.effectiveRate ?? null)">
                        {{ fmtRate(r.employment?.effectiveRate ?? null) }}
                        @if (r.employment?.isApproximation) { <span style="color: var(--color-warning)"> ~</span> }
                      </span>
                    </td>
                  }
                </tr>
                <tr class="border-b border-[var(--color-border)]/40">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ 'comparison.bestSeNet' | translate }}</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="px-4 py-2.5 font-mono text-sm">
                      <span [style.color]="r.selfEmployment?.net === ir.maxSeNet ? 'var(--color-accent)' : 'var(--color-text-secondary)'" class="font-semibold">
                        {{ fmtEuro(r.selfEmployment?.net) }}
                      </span>
                      <span class="block text-[10px] text-[var(--color-text-faint)]">
                        {{ r.selfEmployment?.method }}
                        @if (r.selfEmployment?.isApproximation) { <span style="color: var(--color-warning)"> ~</span> }
                      </span>
                    </td>
                  }
                </tr>
              }

              <tr class="bg-[var(--color-surface-hover)]/50">
                <td class="px-4 py-2.5 text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium" colspan="999">
                  {{ 'comparison.effectiveRates' | translate }}
                </td>
              </tr>

              @for (row of rateRows; track row.label) {
                <tr class="border-b border-[var(--color-border)]/40 hover:bg-[var(--color-surface-hover)]/30 transition-colors">
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ row.label }}</td>
                  @for (c of countries(); track c.code) {
                    @let rate = computedRate(c.code, row.income, row.type) ;
                    <td class="px-4 py-2.5 font-mono text-sm"
                        [style]="isWinner(c.code, row.label) ? 'background: color-mix(in srgb, var(--color-accent) 6%, transparent)' : ''">
                      <span [style.color]="rateColor(rate)" [class]="isWinner(c.code, row.label) ? 'font-semibold' : ''">
                        {{ fmtRate(rate) }}
                      </span>
                    </td>
                  }
                </tr>
              }

              <tr class="border-b border-[var(--color-border)]/40">
                <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ 'comparison.topPitRate' | translate }}</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 font-mono text-sm">
                    <span [style.color]="rateColor(c.personalIncomeTax?.topRate ?? null)">{{ fmtRate(c.personalIncomeTax?.topRate ?? null) }}</span>
                  </td>
                }
              </tr>

              <tr class="border-b border-[var(--color-border)]/40">
                <td class="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">{{ 'comparison.confidenceLabel' | translate }}</td>
                @for (c of countries(); track c.code) {
                  <td class="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{{ confKey(c.confidence) | translate }}</td>
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
  readonly regimeCalc = inject(RegimeCalculationService);
  readonly regionLabel = regionLabel;

  readonly countries = this.store.comparedCountries;

  readonly rateRows: Array<{ label: string; income: number; type: 'employment' | 'se' }> = [
    { label: 'Employment 30k',  income: 30000,  type: 'employment' },
    { label: 'Employment 60k',  income: 60000,  type: 'employment' },
    { label: 'Employment 100k', income: 100000, type: 'employment' },
    { label: 'Best SE 30k',     income: 30000,  type: 'se' },
    { label: 'Best SE 60k',     income: 60000,  type: 'se' },
    { label: 'Best SE 100k',    income: 100000, type: 'se' },
  ];

  computedRate(code: string, income: number, type: 'employment' | 'se'): number | null {
    const c = this.countries().find(x => x.code === code);
    if (!c) return null;
    const cmp = this.regimeCalc.calculateAll(c, income);
    if (type === 'employment') {
      return (cmp.regimes.find(r => r.regimeType === 'employment') ?? cmp.best).effectiveRate;
    }
    const se = cmp.regimes
      .filter(r => r.regimeType === 'self-employment')
      .reduce<typeof cmp.regimes[0] | null>((b, r) => (!b || r.net > b.net ? r : b), null)
      ?? cmp.best;
    return se.effectiveRate;
  }

  readonly winners = computed(() => {
    const list = this.countries();
    const result = new Map<string, Set<string>>();
    for (const row of this.rateRows) {
      const vals = list.map(c => ({ code: c.code, val: this.computedRate(c.code, row.income, row.type) }))
        .filter((x): x is { code: string; val: number } => x.val !== null);
      if (!vals.length) continue;
      const min = Math.min(...vals.map(v => v.val));
      for (const { code } of vals.filter(v => v.val === min)) {
        if (!result.has(code)) result.set(code, new Set());
        result.get(code)!.add(row.label);
      }
    }
    return result;
  });

  readonly incomeResults = computed(() => {
    const income = this.store.userIncome();
    if (!income || this.countries().length < 2) return null;
    const results: IncomeRow[] = this.countries().map(c => {
      const cmp = this.regimeCalc.calculateAll(c, income);
      const emp = cmp.regimes.find(r => r.regimeType === 'employment') ?? cmp.best;
      const se = cmp.regimes
        .filter(r => r.regimeType === 'self-employment')
        .reduce<typeof cmp.regimes[0] | null>((b, r) => (!b || r.net > b.net ? r : b), null)
        ?? cmp.best;
      return {
        country: c,
        employment: { net: emp.net, effectiveRate: emp.effectiveRate, isApproximation: emp.isApproximation },
        selfEmployment: { net: se.net, effectiveRate: se.effectiveRate, method: se.regimeName, isApproximation: se.isApproximation },
      };
    });
    return {
      income,
      results,
      maxEmplNet: Math.max(...results.map(r => r.employment?.net ?? 0)),
      maxSeNet: Math.max(...results.map(r => r.selfEmployment?.net ?? 0)),
    };
  });

  isWinner(code: string, label: string): boolean {
    return this.winners().get(code)?.has(label) ?? false;
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

  fmtEuro(n: number | null | undefined): string { return n != null ? '€' + Math.round(n).toLocaleString('en-US') : '—'; }
  fmtNum(n: number): string  { return n.toLocaleString('en-US'); }

  confKey(c: string | null): string {
    const MAP: Record<string, string> = {
      high: 'confidence.high',
      'medium-high': 'confidence.medPlus',
      medium: 'confidence.med',
      low: 'confidence.low',
    };
    return c ? (MAP[c] ?? c) : 'confidence.low';
  }
}
