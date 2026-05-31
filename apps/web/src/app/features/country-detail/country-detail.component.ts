import { Component, computed, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Country, TaxBracket } from '../../core/models/country.model';
import { AppStore } from '../../state/app.store';
import { regionLabel } from '../../core/utils/region.utils';

const LEVELS = ['30k', '60k', '100k'] as const;
type Level = typeof LEVELS[number];

@Component({
  selector: 'app-country-detail',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <!-- ─── HEADER ────────────────────────────────────────── -->
    <div mat-dialog-title class="detail-header">
      <div class="detail-title">
        <span class="detail-flag" role="img" [attr.aria-label]="country.name">
          {{ country.flag ?? '🏳' }}
        </span>
        <div class="detail-names">
          <h2 class="detail-country-name" i18n="@@detail.countryName">{{ country.name }}</h2>
          <div class="detail-badges">
            <span class="d-region-chip" [class]="regionClass(country.region)">
              {{ regionLabel(country.region) }}
            </span>
            <span class="d-conf-badge" [class]="confClass(country.confidence)">
              {{ confLabel(country.confidence) }}
            </span>
            @if (country.lastReviewed) {
              <span class="d-reviewed" i18n="@@detail.lastReviewed">
                Updated {{ country.lastReviewed }}
              </span>
            }
          </div>
        </div>
      </div>

      <div class="detail-header-actions">
        <button
          mat-stroked-button
          class="compare-btn"
          [disabled]="!isAdded() && isFull()"
          [matTooltip]="!isAdded() && isFull() ? 'Comparison full (3/3)' : ''"
          (click)="toggleComparison()"
          i18n="@@detail.addToComparison"
        >
          <mat-icon>{{ isAdded() ? 'check' : 'add' }}</mat-icon>
          {{ isAdded() ? '✓ Added' : 'Add to comparison' }}
        </button>
        <button mat-icon-button (click)="dialogRef.close()" aria-label="Close" i18n-aria-label="@@detail.close">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <!-- ─── BODY ──────────────────────────────────────────── -->
    <mat-dialog-content class="detail-content">

      <!-- QUICK STATS -->
      <div class="quick-stats">
        @if (country.effectiveRates.employment['60k'] != null) {
          <div class="stat-card">
            <div class="stat-val" [style.color]="rateColor(country.effectiveRates.employment['60k'])">
              {{ fmtPct(country.effectiveRates.employment['60k']) }}
            </div>
            <div class="stat-label" i18n="@@detail.empl60k">Employment at €60k</div>
          </div>
        }
        @if (country.effectiveRates.bestSelfEmployment['60k'] != null) {
          <div class="stat-card">
            <div class="stat-val" [style.color]="rateColor(country.effectiveRates.bestSelfEmployment['60k'])">
              {{ fmtPct(country.effectiveRates.bestSelfEmployment['60k']) }}
            </div>
            <div class="stat-label" i18n="@@detail.bestSE60k">Best SE at €60k</div>
            @if (country.effectiveRates.bestSelfEmployment.regime) {
              <div class="stat-sub">{{ country.effectiveRates.bestSelfEmployment.regime }}</div>
            }
          </div>
        }
        @if (country.personalIncomeTax?.topRate != null) {
          <div class="stat-card">
            <div class="stat-val" [style.color]="rateColor(country.personalIncomeTax!.topRate!)">
              {{ fmtPct(country.personalIncomeTax!.topRate!) }}
            </div>
            <div class="stat-label" i18n="@@detail.topPIT">Top PIT rate</div>
          </div>
        }
        @if (country.personalIncomeTax?.currency) {
          <div class="stat-card">
            <div class="stat-val stat-currency">{{ country.personalIncomeTax!.currency }}</div>
            <div class="stat-label" i18n="@@detail.currency">Tax currency</div>
          </div>
        }
      </div>

      <!-- PIT BRACKETS -->
      @if (country.personalIncomeTax?.brackets?.length) {
        <section class="d-section">
          <h3 class="d-section-heading" i18n="@@detail.pitBrackets">
            <mat-icon>percent</mat-icon>
            Personal Income Tax Brackets
          </h3>
          <p class="d-note" i18n="@@detail.bracketNote">
            Extracted automatically — may show only key brackets.
          </p>
          <table class="d-table">
            <thead>
              <tr>
                <th i18n="@@detail.bracketRange">Income range</th>
                <th i18n="@@detail.bracketRate">Rate</th>
              </tr>
            </thead>
            <tbody>
              @for (b of country.personalIncomeTax!.brackets!; track $index) {
                <tr>
                  <td>{{ fmtRange(b, country.personalIncomeTax?.currency ?? null) }}</td>
                  <td>
                    <span class="bracket-rate" [style.color]="rateColor(b.rate)">
                      {{ fmtPct(b.rate) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
        <mat-divider />
      }

      <!-- SOCIAL SECURITY -->
      @if (country.socialSecurity) {
        <section class="d-section">
          <h3 class="d-section-heading" i18n="@@detail.socialSecurity">
            <mat-icon>health_and_safety</mat-icon>
            Social Security
          </h3>
          <div class="ss-cards">
            <div class="ss-card">
              <div class="ss-card-title" i18n="@@detail.ssEmployee">Employee</div>
              <div class="ss-rate">
                {{ country.socialSecurity.employeeRate != null
                   ? fmtPct(country.socialSecurity.employeeRate)
                   : 'N/A' }}
              </div>
              @if (country.socialSecurity.annualCap != null) {
                <div class="ss-cap" i18n="@@detail.ssCap">
                  Cap: {{ numFmt(country.socialSecurity.annualCap, country.personalIncomeTax?.currency ?? null) }}/yr
                </div>
              }
            </div>
            <div class="ss-card ss-card-muted">
              <div class="ss-card-title" i18n="@@detail.ssEmployer">Employer</div>
              <div class="ss-note" i18n="@@detail.ssEmployerNote">Not captured in dataset</div>
            </div>
          </div>
        </section>
        <mat-divider />
      }

      <!-- SPECIAL REGIMES -->
      @if (country.specialRegimes?.length) {
        <section class="d-section">
          <h3 class="d-section-heading" i18n="@@regimes.heading">
            <mat-icon>star</mat-icon>
            Special Regimes for Newcomers / Expats
          </h3>
          <div class="regimes-list">
            @for (r of country.specialRegimes!; track r.name) {
              <div class="regime-item">
                <span class="regime-name">{{ r.name }}</span>
                @if (r.rate != null) {
                  <span class="regime-rate" [style.color]="rateColor(r.rate)">
                    {{ fmtPct(r.rate) }}
                  </span>
                }
              </div>
            }
          </div>
        </section>
        <mat-divider />
      }

      <!-- EFFECTIVE RATES TABLE -->
      @if (hasAnyRates()) {
        <section class="d-section">
          <h3 class="d-section-heading" i18n="@@detail.effectiveRates">
            <mat-icon>trending_down</mat-icon>
            Effective Tax Burden by Income Level
          </h3>
          <table class="d-table rates-table">
            <thead>
              <tr>
                <th i18n="@@detail.income">Income</th>
                <th i18n="@@detail.employment">Employment</th>
                <th i18n="@@detail.bestSE">Best self-employment</th>
              </tr>
            </thead>
            <tbody>
              @for (lv of levels; track lv) {
                <tr>
                  <td class="income-lv">€{{ lv }}</td>
                  <td>
                    @if (country.effectiveRates.employment[lv] != null) {
                      <span [style.color]="rateColor(country.effectiveRates.employment[lv]!)">
                        {{ fmtPct(country.effectiveRates.employment[lv]!) }}
                      </span>
                    } @else { <span class="na">—</span> }
                  </td>
                  <td>
                    @if (country.effectiveRates.bestSelfEmployment[lv] != null) {
                      <span [style.color]="rateColor(country.effectiveRates.bestSelfEmployment[lv]!)">
                        {{ fmtPct(country.effectiveRates.bestSelfEmployment[lv]!) }}
                      </span>
                      @if (lv === '60k' && country.effectiveRates.bestSelfEmployment.regime) {
                        <small class="se-regime">
                          {{ country.effectiveRates.bestSelfEmployment.regime }}
                        </small>
                      }
                    } @else { <span class="na">—</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
        <mat-divider />
      }

      <!-- 2026 CHANGES -->
      @if (country.changes2026?.length) {
        <section class="d-section">
          <h3 class="d-section-heading" i18n="@@detail.changes2026">
            <mat-icon>update</mat-icon>
            What Changed in 2026
          </h3>
          <ul class="changes-list">
            @for (c of country.changes2026; track $index) {
              <li>{{ stripMd(c) }}</li>
            }
          </ul>
        </section>
        <mat-divider />
      }

      <!-- KNOWN GAPS (collapsible) -->
      @if (country.knownGaps?.length) {
        <mat-expansion-panel class="gaps-panel" [expanded]="false">
          <mat-expansion-panel-header>
            <mat-panel-title class="gaps-title" i18n="@@detail.knownGaps">
              <mat-icon class="gaps-icon">warning_amber</mat-icon>
              Known gaps in this estimate ({{ country.knownGaps.length }})
            </mat-panel-title>
          </mat-expansion-panel-header>
          <ul class="gaps-list">
            @for (g of country.knownGaps; track $index) {
              <li>{{ g }}</li>
            }
          </ul>
        </mat-expansion-panel>
        <mat-divider />
      }

      <!-- SOURCES -->
      <section class="d-section sources-section">
        <h3 class="d-section-heading" i18n="@@detail.sources">
          <mat-icon>library_books</mat-icon>
          Sources
        </h3>
        <div class="sources-list">
          <div class="source-item">
            <mat-icon class="src-icon">book</mat-icon>
            <span i18n="@@detail.eySource">EY Worldwide Personal Tax Guide 2025-26</span>
            @if (country.sources?.ey) {
              <span class="src-pages">, {{ country.sources!.ey }}</span>
            }
          </div>
          @if (country.sources?.pwc) {
            <div class="source-item">
              <mat-icon class="src-icon">public</mat-icon>
              <span i18n="@@detail.pwcSource">PwC Worldwide Tax Summaries</span>
              <a
                [href]="country.sources!.pwc"
                target="_blank"
                rel="noopener noreferrer"
                class="pwc-link"
                i18n="@@detail.pwcLink"
              >
                <mat-icon class="launch-icon">open_in_new</mat-icon>
                Open
              </a>
            </div>
          }
          @if (country.crossVerification) {
            <div class="cv-status">
              <mat-icon class="src-icon">verified</mat-icon>
              <span i18n="@@detail.cvStatus">Cross-verified: {{ country.crossVerification.status }}</span>
            </div>
          }
        </div>
      </section>

    </mat-dialog-content>
  `,
  styles: [`
    /* ── Header ─────────────────────────────────────── */
    .detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px 12px !important;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0 !important;
    }
    .detail-title { display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 0; }
    .detail-flag { font-size: 36px; line-height: 1; flex-shrink: 0; }
    .detail-names { min-width: 0; }
    .detail-country-name {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .detail-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .d-reviewed { font-size: 11px; color: #9e9e9e; margin-left: 4px; }

    .detail-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .compare-btn { height: 34px; font-size: 13px; }

    /* ── Region / confidence chips (same as table) ─── */
    .d-region-chip {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .r-europe { background: #e8eaf6; color: #3949ab; }
    .r-africa { background: #fff8e1; color: #f57f17; }
    .r-americas { background: #e8f5e9; color: #2e7d32; }
    .r-asia { background: #fce4ec; color: #880e4f; }
    .r-middle-east { background: #fff3e0; color: #e65100; }
    .r-pacific { background: #e0f7fa; color: #006064; }

    .d-conf-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      font-size: 11px; font-weight: 600; white-space: nowrap;
    }
    .conf-high { background: #e8f5e9; color: #2e7d32; }
    .conf-medium-high { background: #f1f8e9; color: #558b2f; }
    .conf-medium { background: #fff8e1; color: #f57f17; }
    .conf-low { background: #ffebee; color: #b71c1c; }
    .conf-unknown { background: #f5f5f5; color: #9e9e9e; }

    /* ── Content body ────────────────────────────────── */
    .detail-content {
      padding: 0 20px 8px !important;
      max-height: calc(90vh - 120px);
    }

    /* Quick stats */
    .quick-stats {
      display: flex; flex-wrap: wrap; gap: 12px;
      padding: 16px 0 12px;
    }
    .stat-card {
      flex: 1; min-width: 110px;
      background: #f8f9ff;
      border: 1px solid #e8eaf6;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .stat-val { font-size: 24px; font-weight: 700; line-height: 1.1; }
    .stat-label { font-size: 11px; color: #666; margin-top: 4px; }
    .stat-sub { font-size: 10px; color: #888; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stat-currency { color: #3f51b5; }

    /* Sections */
    .d-section { padding: 14px 0 10px; }
    .d-section-heading {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600; color: #3f51b5;
      margin: 0 0 10px;
    }
    .d-section-heading mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .d-note { font-size: 11px; color: #9e9e9e; margin: 0 0 8px; }
    mat-divider { margin: 2px 0 !important; }

    /* Tables */
    .d-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .d-table th { text-align: left; font-weight: 600; color: #555; padding: 6px 10px; border-bottom: 2px solid #e0e0e0; font-size: 12px; }
    .d-table td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; }
    .d-table tr:last-child td { border-bottom: none; }
    .d-table tr:hover td { background: #f8f9ff; }
    .bracket-rate { font-weight: 700; }
    .rates-table .income-lv { font-weight: 600; color: #555; }
    .se-regime { display: block; font-size: 10px; color: #888; margin-top: 1px; }

    /* Social security */
    .ss-cards { display: flex; gap: 12px; flex-wrap: wrap; }
    .ss-card {
      flex: 1; min-width: 130px;
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 12px 14px;
    }
    .ss-card-muted { background: #fafafa; }
    .ss-card-title { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
    .ss-rate { font-size: 22px; font-weight: 700; color: #333; }
    .ss-cap { font-size: 11px; color: #888; margin-top: 4px; }
    .ss-note { font-size: 11px; color: #bbb; font-style: italic; margin-top: 4px; }

    /* Special regimes */
    .regimes-list { display: flex; flex-direction: column; gap: 6px; }
    .regime-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      background: #fff8e1;
      border-radius: 6px;
      border-left: 3px solid #ffd54f;
    }
    .regime-name { font-size: 13px; font-weight: 500; flex: 1; }
    .regime-rate { font-size: 14px; font-weight: 700; }

    /* Changes */
    .changes-list {
      margin: 0; padding-left: 18px;
      display: flex; flex-direction: column; gap: 5px;
    }
    .changes-list li { font-size: 13px; color: #444; line-height: 1.5; }

    /* Known gaps */
    .gaps-panel { margin: 0 !important; box-shadow: none !important; border: 1px solid #ffe0b2 !important; border-radius: 6px !important; }
    .gaps-title { display: flex; align-items: center; gap: 6px; color: #e65100; font-size: 13px; }
    .gaps-icon { font-size: 16px; height: 16px; width: 16px; }
    .gaps-list { margin: 0; padding-left: 18px; }
    .gaps-list li { font-size: 12px; color: #666; line-height: 1.6; }

    /* Sources */
    .sources-section { padding-bottom: 4px; }
    .sources-list { display: flex; flex-direction: column; gap: 8px; }
    .source-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .src-icon { font-size: 16px; height: 16px; width: 16px; color: #9e9e9e; }
    .src-pages { color: #666; }
    .pwc-link {
      display: inline-flex; align-items: center; gap: 3px;
      color: #1565c0; text-decoration: none; font-size: 12px; margin-left: 6px;
    }
    .pwc-link:hover { text-decoration: underline; }
    .launch-icon { font-size: 14px; height: 14px; width: 14px; }
    .cv-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #666; }
    .na { color: #bdbdbd; }
  `],
})
export class CountryDetailComponent {
  readonly country = inject<Country>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<CountryDetailComponent>);
  readonly store = inject(AppStore);
  readonly regionLabel = regionLabel;

  readonly levels = LEVELS;

  readonly isAdded = computed(() =>
    this.store.comparedCodes().includes(this.country.code)
  );
  readonly isFull = computed(() => this.store.comparedCodes().length >= 3);

  toggleComparison(): void {
    if (this.store.isInComparison(this.country.code)) {
      this.store.removeFromComparison(this.country.code);
    } else {
      this.store.addToComparison(this.country.code);
    }
  }

  // ── Formatters ──────────────────────────────────────────

  fmtPct(rate: number | null | undefined): string {
    if (rate == null) return '—';
    return (rate * 100).toFixed(1) + '%';
  }

  rateColor(rate: number | null | undefined): string {
    if (rate == null) return '#bdbdbd';
    if (rate < 0.10) return '#1b5e20';
    if (rate < 0.20) return '#388e3c';
    if (rate < 0.30) return '#f9a825';
    if (rate < 0.40) return '#e65100';
    return '#b71c1c';
  }

  numFmt(n: number, currency: string | null): string {
    const s = n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (!currency) return s;
    if (currency === 'EUR') return `€${s}`;
    if (currency === 'USD') return `$${s}`;
    if (currency === 'GBP') return `£${s}`;
    return `${s} ${currency}`;
  }

  fmtRange(b: TaxBracket, currency: string | null): string {
    const fmt = (n: number) => this.numFmt(n, currency);
    if (b.to === null) return `Above ${fmt(b.from)}`;
    if (b.from === 0) return `${fmt(0)} – ${fmt(b.to)}`;
    return `${fmt(b.from)} – ${fmt(b.to)}`;
  }

  stripMd(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  confLabel(c: string | null): string {
    const MAP: Record<string, string> = { high: 'High', 'medium-high': 'Med+', medium: 'Med', low: 'Low' };
    return c ? (MAP[c] ?? c) : '?';
  }

  confClass(c: string | null): string {
    return c ? `d-conf-badge conf-${c}` : 'd-conf-badge conf-unknown';
  }

  regionClass(r: string): string {
    if (r.includes('europe')) return 'd-region-chip r-europe';
    if (r.includes('africa')) return 'd-region-chip r-africa';
    if (r === 'middle-east') return 'd-region-chip r-middle-east';
    if (r === 'pacific') return 'd-region-chip r-pacific';
    if (r.includes('asia')) return 'd-region-chip r-asia';
    return 'd-region-chip r-americas';
  }

  hasAnyRates(): boolean {
    const er = this.country.effectiveRates;
    return LEVELS.some(
      lv => er.employment[lv] != null || er.bestSelfEmployment[lv] != null
    );
  }
}
