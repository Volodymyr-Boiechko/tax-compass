import { Component, computed, inject } from '@angular/core';
import { AppStore, SortField } from '../../state/app.store';
import { CalculationService, CalculationResult } from '../../core/services/calculation.service';
import { Country, Confidence, Region } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

interface Row {
  country: Country;
  employment?: CalculationResult;
  selfEmployment?: CalculationResult;
}

const CONF_DOT: Record<string, string> = {
  high: 'bg-lime-400',
  'medium-high': 'bg-lime-600',
  medium: 'bg-yellow-400',
  low: 'bg-red-400',
};

@Component({
  selector: 'app-ranking-table',
  standalone: true,
  imports: [],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[900px]">

        <!-- HEADER -->
        <thead class="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
          @if (store.userIncome() !== null) {
            <!-- Income mode: grouped header -->
            <tr>
              <th class="px-3 py-2 text-left" colspan="4"></th>
              <th class="px-3 py-2 text-center text-[10px] text-zinc-500 uppercase tracking-wider border-l border-zinc-800" colspan="2">
                Employment · €{{ fmtNum(store.userIncome()!) }}
              </th>
              <th class="px-3 py-2 text-center text-[10px] text-zinc-500 uppercase tracking-wider border-l border-zinc-800" colspan="2">
                Best Self-Employment · €{{ fmtNum(store.userIncome()!) }}
              </th>
            </tr>
          } @else {
            <!-- Standard mode: grouped header -->
            <tr>
              <th class="px-3 py-2 text-left" colspan="4"></th>
              <th class="px-3 py-2 text-center text-[10px] text-zinc-500 uppercase tracking-wider border-l border-zinc-800" colspan="3">
                Employment (effective rate)
              </th>
              <th class="px-3 py-2 text-center text-[10px] text-zinc-500 uppercase tracking-wider border-l border-zinc-800" colspan="2">
                Best Self-Employment
              </th>
              <th class="px-3 py-2 text-center" colspan="1"></th>
            </tr>
          }
          <tr class="border-t border-zinc-800/50">
            <th class="px-3 py-2.5 text-left text-[11px] text-zinc-500 font-medium w-10">#</th>
            <th class="px-3 py-2.5 text-left text-[11px] text-zinc-500 font-medium min-w-[160px]">Country</th>
            <th class="px-3 py-2.5 text-left text-[11px] text-zinc-500 font-medium min-w-[130px]">Region</th>
            <th class="px-3 py-2.5 text-center text-[11px] text-zinc-500 font-medium w-16">Conf.</th>

            @if (store.userIncome() !== null) {
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium border-l border-zinc-800 w-28">Net</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium w-20">Rate</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium border-l border-zinc-800 w-28">Net</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium w-20">Rate</th>
            } @else {
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium border-l border-zinc-800 w-20 cursor-pointer hover:text-zinc-300 transition-colors" (click)="store.setSort('employment30k')">
                <span class="flex items-center justify-end gap-1">€30k {{ sortChevron('employment30k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] font-medium w-20 cursor-pointer hover:text-zinc-300 transition-colors"
                  [class]="store.sortField() === 'employment60k' ? 'text-lime-400' : 'text-zinc-500'"
                  (click)="store.setSort('employment60k')">
                <span class="flex items-center justify-end gap-1">€60k {{ sortChevron('employment60k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium w-20 cursor-pointer hover:text-zinc-300 transition-colors" (click)="store.setSort('employment100k')">
                <span class="flex items-center justify-end gap-1">€100k {{ sortChevron('employment100k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium border-l border-zinc-800 w-28 cursor-pointer hover:text-zinc-300 transition-colors" (click)="store.setSort('bestSE60k')">
                <span class="flex items-center justify-end gap-1">Best SE 60k {{ sortChevron('bestSE60k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-zinc-500 font-medium w-20 cursor-pointer hover:text-zinc-300 transition-colors" (click)="store.setSort('topPIT')">
                <span class="flex items-center justify-end gap-1">Top PIT {{ sortChevron('topPIT') }}</span>
              </th>
            }
          </tr>
        </thead>

        <!-- BODY -->
        <tbody>
          @if (store.loading()) {
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <tr class="border-b border-zinc-800/40">
                <td class="px-3 py-3" colspan="10">
                  <div class="h-4 bg-zinc-900 rounded animate-pulse"></div>
                </td>
              </tr>
            }
          } @else {
            @for (row of rows(); track row.country.code; let i = $index) {
              <tr
                class="border-b border-zinc-800/40 transition-colors cursor-pointer group"
                [class]="store.selectedCountry()?.code === row.country.code
                  ? 'bg-zinc-900 border-l-2 border-l-lime-400'
                  : 'hover:bg-zinc-900/60'"
                (click)="store.selectCountry(row.country)"
              >
                <!-- # -->
                <td class="px-3 py-2.5 text-zinc-600 tabular-nums text-xs">{{ i + 1 }}</td>

                <!-- Country -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <span class="text-lg leading-none">{{ row.country.flag ?? '🏳' }}</span>
                    <span class="font-medium text-zinc-100">{{ row.country.name }}</span>
                  </div>
                </td>

                <!-- Region -->
                <td class="px-3 py-2.5">
                  <span class="inline-block px-2 py-0.5 rounded text-[11px] bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {{ regionLabel(row.country.region) }}
                  </span>
                </td>

                <!-- Confidence -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-block size-2 rounded-full"
                    [class]="confDot(row.country.confidence)"
                    [title]="row.country.confidence ?? 'unknown'"
                  ></span>
                </td>

                @if (store.userIncome() !== null) {
                  <!-- Income mode -->
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-zinc-800/50">
                    <span [class]="netColor(row.employment?.net)">{{ fmtEuro(row.employment?.net) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.employment?.effectiveRate ?? null)">{{ fmtRate(row.employment?.effectiveRate ?? null) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-zinc-800/50">
                    <span [class]="netColor(row.selfEmployment?.net)">{{ fmtEuro(row.selfEmployment?.net) }}</span>
                    @if (row.selfEmployment?.method) {
                      <span class="block text-[10px] text-zinc-600 truncate max-w-[100px] ml-auto">
                        {{ regimeShort(row.selfEmployment!.method) }}
                      </span>
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.selfEmployment?.effectiveRate ?? null)">{{ fmtRate(row.selfEmployment?.effectiveRate ?? null) }}</span>
                  </td>
                } @else {
                  <!-- Standard mode -->
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-zinc-800/50">
                    <span [style.color]="rateColor(row.country.effectiveRates.employment['30k'])">{{ fmtRate(row.country.effectiveRates.employment['30k']) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.country.effectiveRates.employment['60k'])">{{ fmtRate(row.country.effectiveRates.employment['60k']) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.country.effectiveRates.employment['100k'])">{{ fmtRate(row.country.effectiveRates.employment['100k']) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-zinc-800/50">
                    @if (row.country.effectiveRates.bestSelfEmployment['60k'] != null) {
                      <span [style.color]="rateColor(row.country.effectiveRates.bestSelfEmployment['60k'])">{{ fmtRate(row.country.effectiveRates.bestSelfEmployment['60k']) }}</span>
                      @if (row.country.effectiveRates.bestSelfEmployment.regime) {
                        <span class="block text-[10px] text-zinc-600 truncate max-w-[100px] ml-auto">{{ row.country.effectiveRates.bestSelfEmployment.regime }}</span>
                      }
                    } @else {
                      <span class="text-zinc-700">—</span>
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.country.personalIncomeTax?.topRate ?? null)">{{ fmtRate(row.country.personalIncomeTax?.topRate ?? null) }}</span>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td colspan="10" class="px-4 py-16 text-center text-zinc-600 text-sm italic">
                  No countries match the current filters.
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class RankingTableComponent {
  readonly store = inject(AppStore);
  readonly calc = inject(CalculationService);
  readonly regionLabel = regionLabel;

  readonly rows = computed<Row[]>(() => {
    const income = this.store.userIncome();
    const countries = this.store.filteredCountries();
    if (income === null) return countries.map(c => ({ country: c }));
    const mapped = countries.map(c => ({
      country: c,
      employment: this.calc.calculateEmployment(c, income),
      selfEmployment: this.calc.calculateBestSelfEmployment(c, income),
    }));
    return [...mapped].sort((a, b) =>
      (a.selfEmployment?.effectiveRate ?? 1) - (b.selfEmployment?.effectiveRate ?? 1)
    );
  });

  sortChevron(field: SortField): string {
    if (this.store.sortField() !== field) return '↕';
    return this.store.sortDir() === 'asc' ? '↑' : '↓';
  }

  fmtRate(r: number | null | undefined): string {
    if (r == null) return '—';
    return (r * 100).toFixed(1) + '%';
  }

  fmtEuro(n: number | null | undefined): string {
    if (n == null) return '—';
    return '€' + Math.round(n).toLocaleString('en-US');
  }

  fmtNum(n: number): string {
    return n.toLocaleString('en-US');
  }

  rateColor(r: number | null | undefined): string {
    if (r == null) return '#52525b';
    if (r < 0.10) return '#a3e635';
    if (r < 0.20) return '#84cc16';
    if (r < 0.30) return '#facc15';
    if (r < 0.40) return '#fb923c';
    return '#f87171';
  }

  netColor(n: number | null | undefined): string {
    return n != null ? 'text-lime-400' : 'text-zinc-600';
  }

  confDot(c: Confidence | null): string {
    return c ? (CONF_DOT[c] ?? 'bg-zinc-600') : 'bg-zinc-700';
  }

  regimeShort(method: string): string {
    const m = method.match(/\((.+)\)$/);
    return m ? m[1] : method;
  }
}
