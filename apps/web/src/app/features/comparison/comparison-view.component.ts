import { Component, computed, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AppStore } from '../../state/app.store';
import { Country } from '../../core/models/country.model';
import { CalculationService, CalculationResult } from '../../core/services/calculation.service';
import { regionLabel } from '../../core/utils/region.utils';

const LEVELS = ['30k', '60k', '100k'] as const;
type Level = typeof LEVELS[number];

type MetricKey =
  | 'empl30k' | 'empl60k' | 'empl100k'
  | 'se30k'   | 'se60k'   | 'se100k'
  | 'topPIT';

const METRICS: Array<{ key: MetricKey; get: (c: Country) => number | null | undefined }> = [
  { key: 'empl30k',  get: c => c.effectiveRates.employment['30k'] },
  { key: 'empl60k',  get: c => c.effectiveRates.employment['60k'] },
  { key: 'empl100k', get: c => c.effectiveRates.employment['100k'] },
  { key: 'se30k',    get: c => c.effectiveRates.bestSelfEmployment['30k'] },
  { key: 'se60k',    get: c => c.effectiveRates.bestSelfEmployment['60k'] },
  { key: 'se100k',   get: c => c.effectiveRates.bestSelfEmployment['100k'] },
  { key: 'topPIT',   get: c => c.personalIncomeTax?.topRate },
];

interface IncomeRow {
  country: Country;
  employment: CalculationResult;
  selfEmployment: CalculationResult;
}

interface IncomeResults {
  income: number;
  results: IncomeRow[];
  maxEmplNet: number;
  minEmplNet: number;
  maxSeNet: number;
  minSeNet: number;
}

@Component({
  selector: 'app-comparison-view',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div mat-dialog-title class="cv-header">
      <span i18n="@@comparison.title">Side-by-side comparison</span>
      <button mat-icon-button (click)="dialogRef.close()" aria-label="Close" i18n-aria-label="@@comparison.close">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="cv-content">
      @if (countries().length < 2) {
        <div class="cv-empty" i18n="@@comparison.empty">
          Add at least 2 countries to compare.
        </div>
      } @else {

        <!-- ── YOUR INCOME COMPARISON ──────────────────────── -->
        @if (incomeResults(); as ir) {
          <section class="ic-section">
            <h3 class="ic-title" i18n="@@comparison.yourIncome">
              Your income comparison — {{ fmtEuro(ir.income) }} gross
            </h3>
            <table class="ic-table">
              <thead>
                <tr>
                  <th i18n="@@comparison.icMetric">Metric</th>
                  @for (r of ir.results; track r.country.code) {
                    <th>{{ r.country.flag ?? '🏳' }} {{ r.country.name }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="ic-metric" i18n="@@comparison.icEmplNet">Employment net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td [class.ic-winner]="r.employment.net === ir.maxEmplNet">
                      {{ fmtEuro(r.employment.net) }}
                      <small class="ic-delta">
                        @if (r.employment.net !== ir.minEmplNet) {
                          +{{ fmtEuro(r.employment.net - ir.minEmplNet) }} vs worst
                        } @else {
                          reference
                        }
                      </small>
                    </td>
                  }
                </tr>
                <tr>
                  <td class="ic-metric" i18n="@@comparison.icSeNet">Best SE net</td>
                  @for (r of ir.results; track r.country.code) {
                    <td [class.ic-winner]="r.selfEmployment.net === ir.maxSeNet">
                      {{ fmtEuro(r.selfEmployment.net) }}
                      <small class="ic-delta">
                        @if (r.selfEmployment.net !== ir.minSeNet) {
                          +{{ fmtEuro(r.selfEmployment.net - ir.minSeNet) }} vs worst
                        } @else {
                          reference
                        }
                      </small>
                    </td>
                  }
                </tr>
                <tr>
                  <td class="ic-metric" i18n="@@comparison.icSeMethod">SE regime</td>
                  @for (r of ir.results; track r.country.code) {
                    <td class="ic-regime">{{ r.selfEmployment.method }}</td>
                  }
                </tr>
              </tbody>
            </table>
          </section>
          <mat-divider />
        }

        <div class="cv-grid">
          @for (country of countries(); track country.code) {
            <div class="cv-card">

              <!-- Card header -->
              <div class="cv-card-head">
                <span class="cv-flag">{{ country.flag ?? '🏳' }}</span>
                <h2 class="cv-name">{{ country.name }}</h2>
                <span class="cv-region" [class]="regionClass(country.region)">
                  {{ regionLabel(country.region) }}
                </span>
              </div>

              <mat-divider />

              <!-- Effective rates -->
              <section class="cv-section">
                <h3 class="cv-sec-title" i18n="@@comparison.effectiveRates">Effective tax rates</h3>
                <table class="cv-table">
                  <thead>
                    <tr>
                      <th i18n="@@comparison.income">Income</th>
                      <th i18n="@@comparison.empl">Empl.</th>
                      <th i18n="@@comparison.bestSE">Best SE</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (lv of levels; track lv) {
                      <tr>
                        <td class="cv-lv">€{{ lv }}</td>
                        <td [class.winner]="isWinner(country.code, 'empl' + lv)">
                          {{ fmt(country.effectiveRates.employment[lv]) }}
                        </td>
                        <td [class.winner]="isWinner(country.code, 'se' + lv)">
                          {{ fmt(country.effectiveRates.bestSelfEmployment[lv]) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>

              <mat-divider />

              <!-- Top PIT -->
              <section class="cv-section">
                <h3 class="cv-sec-title" i18n="@@comparison.topPIT">Top PIT marginal rate</h3>
                <div class="cv-big" [class.winner-big]="isWinner(country.code, 'topPIT')">
                  {{ fmt(country.personalIncomeTax?.topRate ?? null) }}
                </div>
              </section>

              @if (country.effectiveRates.bestSelfEmployment.regime) {
                <mat-divider />
                <section class="cv-section">
                  <h3 class="cv-sec-title" i18n="@@comparison.bestRegime">Best regime</h3>
                  <div class="cv-regime-name">{{ country.effectiveRates.bestSelfEmployment.regime }}</div>
                  <div class="cv-regime-rate">
                    {{ fmt(country.effectiveRates.bestSelfEmployment['60k']) }}
                    <span class="cv-at" i18n="@@comparison.at60k">at €60k</span>
                  </div>
                </section>
              }

              <mat-divider />

              <!-- Confidence -->
              <section class="cv-section">
                <h3 class="cv-sec-title" i18n="@@comparison.confidence">Confidence</h3>
                <span [class]="confClass(country.confidence)">
                  {{ confLabel(country.confidence) }}
                </span>
              </section>

              @if (country.specialRegimes?.length) {
                <mat-divider />
                <section class="cv-section">
                  <h3 class="cv-sec-title" i18n="@@comparison.specialRegimes">Special regimes</h3>
                  <ul class="cv-regimes">
                    @for (r of country.specialRegimes!; track r.name) {
                      <li>{{ r.name }}</li>
                    }
                  </ul>
                </section>
              }

            </div>
          }
        </div>
      } <!-- end @else (countries >= 2) -->
    </mat-dialog-content>
  `,
  styles: [`
    .cv-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px 10px !important;
      font-size: 18px; font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0 !important;
    }
    .cv-content { padding: 16px 20px !important; max-height: calc(90vh - 80px); }
    .cv-empty { text-align: center; padding: 48px; color: #9e9e9e; font-style: italic; }

    .cv-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .cv-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }

    .cv-card-head {
      padding: 14px 14px 10px;
      background: #f5f6ff;
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    }
    .cv-flag { font-size: 28px; }
    .cv-name { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.2; }

    .cv-region {
      display: inline-block; padding: 2px 7px; border-radius: 10px;
      font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .r-europe  { background: #e8eaf6; color: #3949ab; }
    .r-africa  { background: #fff8e1; color: #f57f17; }
    .r-americas { background: #e8f5e9; color: #2e7d32; }
    .r-asia    { background: #fce4ec; color: #880e4f; }
    .r-middle-east { background: #fff3e0; color: #e65100; }
    .r-pacific { background: #e0f7fa; color: #006064; }

    .cv-section { padding: 10px 14px; }
    .cv-sec-title {
      font-size: 11px; font-weight: 600; color: #757575;
      text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px;
    }

    .cv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .cv-table th {
      text-align: left; color: #888; font-weight: 600;
      padding: 3px 4px 3px 0; font-size: 11px; border-bottom: 1px solid #e0e0e0;
    }
    .cv-table td { padding: 4px 4px 4px 0; font-weight: 500; border-bottom: 1px solid #f5f5f5; }
    .cv-table tr:last-child td { border-bottom: none; }
    .cv-lv { color: #777; font-size: 11px; }

    .winner { background: #e8f5e9 !important; color: #2e7d32 !important; font-weight: 700; border-radius: 3px; }
    .winner-big { color: #2e7d32 !important; }

    .cv-big { font-size: 20px; font-weight: 700; color: #333; }
    .cv-regime-name { font-size: 13px; font-weight: 500; color: #444; margin-bottom: 2px; }
    .cv-regime-rate { font-size: 16px; font-weight: 700; color: #333; }
    .cv-at { font-size: 11px; color: #888; font-weight: 400; margin-left: 4px; }

    .cv-conf {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 12px; font-weight: 600;
    }
    .conf-high        { background: #e8f5e9; color: #2e7d32; }
    .conf-medium-high { background: #f1f8e9; color: #558b2f; }
    .conf-medium      { background: #fff8e1; color: #f57f17; }
    .conf-low         { background: #ffebee; color: #b71c1c; }
    .conf-unknown     { background: #f5f5f5; color: #9e9e9e; }

    .cv-regimes { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 2px; }
    .cv-regimes li { font-size: 12px; color: #555; }
    mat-divider { margin: 0 !important; }

    /* Income comparison section */
    .ic-section { padding: 14px 0 10px; }
    .ic-title { font-size: 14px; font-weight: 600; color: #1565c0; margin: 0 0 10px; }
    .ic-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .ic-table th {
      text-align: left; font-weight: 600; color: #555;
      padding: 6px 10px; border-bottom: 2px solid #e0e0e0; font-size: 12px;
    }
    .ic-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .ic-table tr:last-child td { border-bottom: none; }
    .ic-metric { font-weight: 600; color: #666; white-space: nowrap; }
    .ic-regime { font-size: 11px; color: #888; }
    .ic-winner { background: #e8f5e9 !important; color: #2e7d32; font-weight: 700; }
    .ic-delta { display: block; font-size: 10px; color: #888; margin-top: 2px; font-weight: 400; }
    .ic-winner .ic-delta { color: #388e3c; }
  `],
})
export class ComparisonViewComponent {
  readonly store = inject(AppStore);
  readonly calcService = inject(CalculationService);
  readonly dialogRef = inject(MatDialogRef<ComparisonViewComponent>);
  readonly regionLabel = regionLabel;
  readonly levels = LEVELS;

  readonly countries = this.store.comparedCountries;

  readonly incomeResults = computed<IncomeResults | null>(() => {
    const income = this.store.userIncome();
    if (income === null) return null;
    const list = this.countries();
    if (list.length < 2) return null;
    const results: IncomeRow[] = list.map(c => ({
      country: c,
      employment: this.calcService.calculateEmployment(c, income),
      selfEmployment: this.calcService.calculateBestSelfEmployment(c, income),
    }));
    return {
      income,
      results,
      maxEmplNet: Math.max(...results.map(r => r.employment.net)),
      minEmplNet: Math.min(...results.map(r => r.employment.net)),
      maxSeNet:   Math.max(...results.map(r => r.selfEmployment.net)),
      minSeNet:   Math.min(...results.map(r => r.selfEmployment.net)),
    };
  });

  readonly winners = computed(() => {
    const list = this.countries();
    const result = new Map<string, Set<string>>();

    for (const metric of METRICS) {
      const withVals = list
        .map(c => ({ code: c.code, val: metric.get(c) ?? null }))
        .filter((x): x is { code: string; val: number } => x.val !== null);

      if (!withVals.length) continue;
      const minVal = Math.min(...withVals.map(x => x.val));

      for (const { code } of withVals.filter(x => x.val === minVal)) {
        if (!result.has(code)) result.set(code, new Set<string>());
        result.get(code)!.add(metric.key);
      }
    }

    return result;
  });

  fmtEuro(n: number): string {
    return '€' + Math.round(n).toLocaleString('en-US');
  }

  isWinner(code: string, metric: string): boolean {
    return this.winners().get(code)?.has(metric) ?? false;
  }

  fmt(rate: number | null | undefined): string {
    if (rate == null) return '—';
    return (rate * 100).toFixed(1) + '%';
  }

  confLabel(c: string | null): string {
    const MAP: Record<string, string> = {
      high: 'High', 'medium-high': 'Med+', medium: 'Med', low: 'Low',
    };
    return c ? (MAP[c] ?? c) : '?';
  }

  confClass(c: string | null): string {
    return c ? `cv-conf conf-${c}` : 'cv-conf conf-unknown';
  }

  regionClass(r: string): string {
    if (r.includes('europe')) return 'cv-region r-europe';
    if (r.includes('africa')) return 'cv-region r-africa';
    if (r === 'middle-east') return 'cv-region r-middle-east';
    if (r === 'pacific') return 'cv-region r-pacific';
    if (r.includes('asia')) return 'cv-region r-asia';
    return 'cv-region r-americas';
  }
}
