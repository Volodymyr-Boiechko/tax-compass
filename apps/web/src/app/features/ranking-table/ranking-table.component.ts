import { Component, computed, inject } from '@angular/core';
import { LucideSearchX } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore, SortField } from '../../state/app.store';
import { CalculationService, CalculationResult } from '../../core/services/calculation.service';
import { Country, Confidence, Region } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

interface Row {
  country: Country;
  employment?: CalculationResult;
  selfEmployment?: CalculationResult;
  isApproximation?: boolean;
}

@Component({
  selector: 'app-ranking-table',
  standalone: true,
  imports: [LucideSearchX, TranslatePipe],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[900px]">

        <!-- HEADER -->
        <thead class="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--color-border)]"
               style="background: color-mix(in srgb, var(--color-bg) 95%, transparent)">
          @if (store.userIncome() !== null) {
            <tr>
              <th class="px-3 py-2 text-left" colspan="4"></th>
              <th class="px-3 py-2 text-center text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider border-l border-[var(--color-border)]" colspan="2">
                {{ 'table.employment' | translate }} · €{{ fmtNum(store.userIncome()!) }}
              </th>
              <th class="px-3 py-2 text-center text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider border-l border-[var(--color-border)]" colspan="2">
                {{ 'table.bestSe' | translate }} · €{{ fmtNum(store.userIncome()!) }}
              </th>
            </tr>
          } @else {
            <tr>
              <th class="px-3 py-2 text-left" colspan="4"></th>
              <th class="px-3 py-2 text-center text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider border-l border-[var(--color-border)]" colspan="3">
                {{ 'table.employment' | translate }} ({{ 'table.effectiveRate' | translate }})
              </th>
              <th class="px-3 py-2 text-center text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider border-l border-[var(--color-border)]" colspan="2">
                {{ 'table.bestSe' | translate }}
              </th>
              <th class="px-3 py-2 text-center" colspan="1"></th>
            </tr>
          }
          <tr class="border-t border-[var(--color-border)]/50">
            <th class="px-3 py-2.5 text-left text-[11px] text-[var(--color-text-tertiary)] font-medium w-10" scope="col">{{ 'table.rank' | translate }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] text-[var(--color-text-tertiary)] font-medium min-w-[160px]" scope="col">{{ 'table.country' | translate }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] text-[var(--color-text-tertiary)] font-medium min-w-[130px] hidden md:table-cell" scope="col">{{ 'table.region' | translate }}</th>
            <th class="px-3 py-2.5 text-center text-[11px] text-[var(--color-text-tertiary)] font-medium w-16" scope="col">{{ 'table.conf' | translate }}</th>

            @if (store.userIncome() !== null) {
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium border-l border-[var(--color-border)] w-28">{{ 'table.net' | translate }}</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium w-20">{{ 'table.rate' | translate }}</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium border-l border-[var(--color-border)] w-28">{{ 'table.net' | translate }}</th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium w-20">{{ 'table.rate' | translate }}</th>
            } @else {
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium border-l border-[var(--color-border)] w-20 cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors" scope="col" [attr.aria-sort]="ariaSortFor('employment30k')" (click)="store.setSort('employment30k')">
                <span class="flex items-center justify-end gap-1">€30k {{ sortChevron('employment30k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] font-medium w-20 cursor-pointer transition-colors" scope="col"
                  [style.color]="store.sortField() === 'employment60k' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'"
                  [attr.aria-sort]="ariaSortFor('employment60k')"
                  (click)="store.setSort('employment60k')">
                <span class="flex items-center justify-end gap-1">€60k {{ sortChevron('employment60k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium w-20 cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors" scope="col" [attr.aria-sort]="ariaSortFor('employment100k')" (click)="store.setSort('employment100k')">
                <span class="flex items-center justify-end gap-1">€100k {{ sortChevron('employment100k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium border-l border-[var(--color-border)] w-28 cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors" scope="col" [attr.aria-sort]="ariaSortFor('bestSE60k')" (click)="store.setSort('bestSE60k')">
                <span class="flex items-center justify-end gap-1">Best SE 60k {{ sortChevron('bestSE60k') }}</span>
              </th>
              <th class="px-3 py-2.5 text-right text-[11px] text-[var(--color-text-tertiary)] font-medium w-20 cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors hidden lg:table-cell" scope="col" [attr.aria-sort]="ariaSortFor('topPIT')" (click)="store.setSort('topPIT')">
                <span class="flex items-center justify-end gap-1">Top PIT {{ sortChevron('topPIT') }}</span>
              </th>
            }
          </tr>
        </thead>

        <!-- BODY -->
        <tbody>
          @if (store.loading()) {
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <tr class="border-b border-[var(--color-border)]/40">
                <td class="px-3 py-3" colspan="10">
                  <div class="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse"></div>
                </td>
              </tr>
            }
          } @else {
            @for (row of rows(); track row.country.code; let i = $index) {
              <tr
                class="border-b border-[var(--color-border)]/40 transition-colors cursor-pointer group"
                [style]="store.selectedCountry()?.code === row.country.code
                  ? 'background: var(--color-surface-hover); border-left: 2px solid var(--color-accent)'
                  : ''"
                [class]="store.selectedCountry()?.code === row.country.code ? '' : 'hover:bg-[var(--color-surface-hover)]/60'"
                tabindex="0"
                [attr.data-row-code]="row.country.code"
                [attr.aria-selected]="store.selectedCountry()?.code === row.country.code"
                (click)="store.selectCountry(row.country)"
                (keydown.enter)="store.selectCountry(row.country)"
                (keydown.space)="$event.preventDefault(); store.selectCountry(row.country)"
              >
                <td class="px-3 py-2.5 text-[var(--color-text-faint)] tabular-nums text-xs">{{ i + 1 }}</td>

                <td class="px-3 py-3 md:py-2.5">
                  <div class="flex items-center gap-2">
                    <span class="text-lg leading-none">{{ row.country.flag ?? '🏳' }}</span>
                    <span class="font-medium text-[var(--color-text-primary)]">{{ row.country.name }}</span>
                    @if (store.userIncome() !== null) {
                      @if (row.isApproximation) {
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                              style="background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning)"
                              title="Rough estimate — detailed regime data pending"
                              aria-label="Rough estimate"
                              role="img">~</span>
                      } @else {
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                              style="background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent)"
                              title="Calculated from live regime parameters"
                              aria-label="Live regime calculation"
                              role="img">⚡</span>
                      }
                    }
                    <span class="flex-1"></span>
                    <button
                      class="shrink-0 text-base leading-none px-0.5 transition-opacity focus:outline-none"
                      [class]="store.isInMyList(row.country.code)
                        ? 'text-amber-400'
                        : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-faint)] hover:text-amber-400'"
                      (click)="$event.stopPropagation(); store.toggleMyList(row.country.code)"
                      [attr.aria-label]="store.isInMyList(row.country.code) ? 'Remove ' + row.country.name + ' from My List' : 'Add ' + row.country.name + ' to My List'"
                      title="Toggle My List"
                    >{{ store.isInMyList(row.country.code) ? '★' : '☆' }}</button>
                  </div>
                </td>

                <td class="px-3 py-2.5 hidden md:table-cell">
                  <span class="inline-block px-2 py-0.5 rounded text-[11px] bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border)] transition-transform hover:scale-[1.02]">
                    {{ regionLabel(row.country.region) | translate }}
                  </span>
                </td>

                <td class="px-3 py-2.5 text-center">
                  <span
                    class="conf-dot inline-block size-2.5 rounded-full transition-transform"
                    [style.background-color]="confDotColor(row.country.confidence)"
                    [title]="row.country.confidence ?? 'unknown'"
                    [attr.aria-label]="'Confidence: ' + (row.country.confidence ?? 'unknown')"
                  ></span>
                </td>

                @if (store.userIncome() !== null) {
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-[var(--color-border)]/50">
                    <span [style.color]="row.employment?.net != null ? 'var(--color-accent)' : 'var(--color-text-faint)'">{{ fmtEuro(row.employment?.net) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.employment?.effectiveRate ?? null)">{{ fmtRate(row.employment?.effectiveRate ?? null) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-[var(--color-border)]/50">
                    <span [style.color]="row.selfEmployment?.net != null ? 'var(--color-accent)' : 'var(--color-text-faint)'">{{ fmtEuro(row.selfEmployment?.net) }}</span>
                    @if (row.selfEmployment?.method) {
                      <span class="block text-[10px] text-[var(--color-text-faint)] truncate max-w-[100px] ml-auto">
                        {{ regimeShort(row.selfEmployment!.method) }}
                      </span>
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(row.selfEmployment?.effectiveRate ?? null)">{{ fmtRate(row.selfEmployment?.effectiveRate ?? null) }}</span>
                  </td>
                } @else {
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-[var(--color-border)]/50">
                    <span [style.color]="rateColor(store.precomputedRates().get(row.country.code)?.e30k ?? null)">{{ fmtRate(store.precomputedRates().get(row.country.code)?.e30k ?? null) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(store.precomputedRates().get(row.country.code)?.e60k ?? null)">{{ fmtRate(store.precomputedRates().get(row.country.code)?.e60k ?? null) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm">
                    <span [style.color]="rateColor(store.precomputedRates().get(row.country.code)?.e100k ?? null)">{{ fmtRate(store.precomputedRates().get(row.country.code)?.e100k ?? null) }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm border-l border-[var(--color-border)]/50">
                    @if (store.precomputedRates().get(row.country.code)?.se60k != null) {
                      <span [style.color]="rateColor(store.precomputedRates().get(row.country.code)?.se60k ?? null)">{{ fmtRate(store.precomputedRates().get(row.country.code)?.se60k ?? null) }}</span>
                    } @else {
                      <span class="text-[var(--color-text-faint)]">—</span>
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-sm hidden lg:table-cell">
                    <span [style.color]="rateColor(row.country.personalIncomeTax?.topRate ?? null)">{{ fmtRate(row.country.personalIncomeTax?.topRate ?? null) }}</span>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td colspan="10">
                  @if (store.quickFilter() === 'my-list' && store.myList().length === 0) {
                    <div class="flex flex-col items-center justify-center py-20 gap-3 anim-fade-in-up">
                      <span class="text-4xl" aria-hidden="true">⭐</span>
                      <p class="text-sm text-[var(--color-text-tertiary)]">{{ 'table.yourListEmpty' | translate }}</p>
                      <p class="text-xs text-[var(--color-text-faint)]">{{ 'table.emptyMyList' | translate }}</p>
                      <button
                        class="text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity underline"
                        (click)="store.setQuickFilter(null)"
                      >{{ 'table.showAll' | translate }}</button>
                    </div>
                  } @else {
                    <div class="flex flex-col items-center justify-center py-20 gap-3 anim-fade-in-up">
                      <svg lucideSearchX class="size-10 text-[var(--color-text-faint)]" aria-hidden="true"></svg>
                      <p class="text-sm text-[var(--color-text-tertiary)]">{{ 'table.noResults' | translate }}</p>
                      <button
                        class="text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity underline"
                        (click)="store.clearFilters()"
                      >{{ 'table.clearFilters' | translate }}</button>
                    </div>
                  }
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

    const mapped = countries.map(c => {
      const employment = this.calc.calculateEmployment(c, income) ?? undefined;
      const selfEmployment = this.calc.calculateBestSelfEmployment(c, income) ?? undefined;
      const isApproximation = employment?.isApproximation || selfEmployment?.isApproximation;
      return { country: c, employment, selfEmployment, isApproximation };
    });

    return [...mapped].sort((a, b) =>
      (a.selfEmployment?.effectiveRate ?? 1) - (b.selfEmployment?.effectiveRate ?? 1)
    );
  });

  sortChevron(field: SortField): string {
    if (this.store.sortField() !== field) return '↕';
    return this.store.sortDir() === 'asc' ? '↑' : '↓';
  }

  ariaSortFor(field: SortField): 'ascending' | 'descending' | 'none' {
    if (this.store.sortField() !== field) return 'none';
    return this.store.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  rateColor(r: number | null | undefined): string {
    if (r == null) return 'var(--rate-na)';
    if (r < 0.10) return 'var(--rate-low)';
    if (r < 0.20) return 'var(--rate-low-mid)';
    if (r < 0.30) return 'var(--rate-mid)';
    if (r < 0.40) return 'var(--rate-high-mid)';
    return 'var(--rate-high)';
  }

  confDotColor(c: Confidence | null): string {
    const MAP: Record<string, string> = {
      high: 'var(--rate-low)',
      'medium-high': 'var(--rate-low-mid)',
      medium: 'var(--rate-mid)',
      low: 'var(--rate-high)',
    };
    return c ? (MAP[c] ?? 'var(--color-text-faint)') : 'var(--color-border-bright)';
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

  regimeShort(method: string): string {
    const m = method.match(/\((.+)\)$/);
    return m ? m[1] : method;
  }
}
