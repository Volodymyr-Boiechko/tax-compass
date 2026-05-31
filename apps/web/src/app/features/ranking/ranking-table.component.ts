import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SlicePipe } from '@angular/common';
import { AppStore, SortField } from '../../state/app.store';
import { regionLabel } from '../../core/utils/region.utils';
import { Confidence, Region } from '../../core/models/country.model';

const CONF_LABEL: Record<string, string> = {
  'high': 'High',
  'medium-high': 'Med+',
  'medium': 'Med',
  'low': 'Low',
};

@Component({
  selector: 'app-ranking-table',
  standalone: true,
  imports: [MatTableModule, MatTooltipModule, SlicePipe],
  template: `
    <div class="table-scroll">
      <table mat-table [dataSource]="store.filteredCountries()" class="ranking-table">

        <!-- # (rank) -->
        <ng-container matColumnDef="rank">
          <th mat-header-cell *matHeaderCellDef class="col-num">#</th>
          <td mat-cell *matCellDef="let row; let i = index" class="col-num">{{ i + 1 }}</td>
        </ng-container>

        <!-- Country -->
        <ng-container matColumnDef="country">
          <th mat-header-cell *matHeaderCellDef class="col-country">
            <button class="sort-btn" (click)="store.setSort('name')">
              Country <span class="sort-icon">{{ sortIcon('name') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-country">
            <span class="flag">{{ row.flag ?? '🏳' }}</span>
            <span class="country-name">{{ row.name }}</span>
          </td>
        </ng-container>

        <!-- Region -->
        <ng-container matColumnDef="region">
          <th mat-header-cell *matHeaderCellDef class="col-region">Region</th>
          <td mat-cell *matCellDef="let row" class="col-region">
            <span class="region-chip" [class]="regionClass(row.region)">
              {{ regionLabel(row.region) }}
            </span>
          </td>
        </ng-container>

        <!-- Confidence -->
        <ng-container matColumnDef="confidence">
          <th mat-header-cell *matHeaderCellDef class="col-conf">Conf.</th>
          <td mat-cell *matCellDef="let row" class="col-conf">
            <span class="conf-badge" [class]="confClass(row.confidence)">
              {{ confLabel(row.confidence) }}
            </span>
          </td>
        </ng-container>

        <!-- Employment 30k -->
        <ng-container matColumnDef="empl30k">
          <th mat-header-cell *matHeaderCellDef class="col-rate">
            <button class="sort-btn" (click)="store.setSort('employment30k')">
              Empl 30k <span class="sort-icon">{{ sortIcon('employment30k') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-rate">
            <span
              class="rate-val"
              [style.color]="rateColor(row.effectiveRates.employment['30k'])"
            >{{ fmtRate(row.effectiveRates.employment['30k']) }}</span>
          </td>
        </ng-container>

        <!-- Employment 60k -->
        <ng-container matColumnDef="empl60k">
          <th mat-header-cell *matHeaderCellDef class="col-rate">
            <button class="sort-btn" [class.active-sort]="store.sortField() === 'employment60k'" (click)="store.setSort('employment60k')">
              Empl 60k <span class="sort-icon">{{ sortIcon('employment60k') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-rate">
            <span
              class="rate-val"
              [style.color]="rateColor(row.effectiveRates.employment['60k'])"
            >{{ fmtRate(row.effectiveRates.employment['60k']) }}</span>
          </td>
        </ng-container>

        <!-- Employment 100k -->
        <ng-container matColumnDef="empl100k">
          <th mat-header-cell *matHeaderCellDef class="col-rate">
            <button class="sort-btn" (click)="store.setSort('employment100k')">
              Empl 100k <span class="sort-icon">{{ sortIcon('employment100k') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-rate">
            <span
              class="rate-val"
              [style.color]="rateColor(row.effectiveRates.employment['100k'])"
            >{{ fmtRate(row.effectiveRates.employment['100k']) }}</span>
          </td>
        </ng-container>

        <!-- Best SE 60k -->
        <ng-container matColumnDef="bestSE60k">
          <th mat-header-cell *matHeaderCellDef class="col-rate">
            <button class="sort-btn" (click)="store.setSort('bestSE60k')">
              Best SE 60k <span class="sort-icon">{{ sortIcon('bestSE60k') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-rate col-se">
            @if (row.effectiveRates.bestSelfEmployment['60k'] != null) {
              <span
                class="rate-val"
                [style.color]="rateColor(row.effectiveRates.bestSelfEmployment['60k'])"
              >{{ fmtRate(row.effectiveRates.bestSelfEmployment['60k']) }}</span>
              @if (row.effectiveRates.bestSelfEmployment.regime) {
                <span
                  class="regime-tag"
                  [matTooltip]="row.effectiveRates.bestSelfEmployment.regime"
                >{{ row.effectiveRates.bestSelfEmployment.regime | slice:0:12 }}…</span>
              }
            } @else {
              <span class="na">—</span>
            }
          </td>
        </ng-container>

        <!-- Top PIT -->
        <ng-container matColumnDef="topPIT">
          <th mat-header-cell *matHeaderCellDef class="col-rate">
            <button class="sort-btn" (click)="store.setSort('topPIT')">
              Top PIT <span class="sort-icon">{{ sortIcon('topPIT') }}</span>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="col-rate">
            <span
              class="rate-val"
              [style.color]="rateColor(row.personalIncomeTax?.topRate ?? null)"
            >{{ fmtRate(row.personalIncomeTax?.topRate ?? null) }}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;" class="data-row"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell no-data" [attr.colspan]="columns.length">
            No countries match the current filters.
          </td>
        </tr>
      </table>
    </div>
  `,
  styles: [`
    .table-scroll {
      overflow-x: auto;
      max-height: calc(100vh - 160px);
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    .ranking-table {
      width: 100%;
      min-width: 900px;
    }

    /* Sticky header */
    .mat-mdc-header-row {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #3f51b5;
      color: white;
    }
    .mat-mdc-header-cell {
      color: white !important;
      font-weight: 600;
      font-size: 13px;
      border-bottom-color: rgba(255,255,255,0.2) !important;
    }

    /* Rows */
    .data-row:hover { background: #f3f4ff; }
    .data-row:nth-child(even) { background: #fafafa; }
    .data-row:nth-child(even):hover { background: #f3f4ff; }
    .mat-mdc-cell { font-size: 13px; }

    /* Sort buttons */
    .sort-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .sort-btn.active-sort { color: #ffeb3b; }
    .sort-icon { font-size: 14px; }

    /* Column widths */
    .col-num  { width: 44px;  text-align: center !important; }
    .col-country { min-width: 160px; }
    .col-region  { min-width: 130px; }
    .col-conf    { width: 64px; text-align: center !important; }
    .col-rate    { width: 96px; text-align: right !important; }
    .col-se      { min-width: 130px; }

    /* Country cell */
    .flag { font-size: 18px; margin-right: 8px; }
    .country-name { font-weight: 500; }

    /* Region chip */
    .region-chip {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      background: #e3f2fd;
      color: #1565c0;
    }
    .r-europe  { background: #e8eaf6; color: #3949ab; }
    .r-africa  { background: #fff8e1; color: #f57f17; }
    .r-americas { background: #e8f5e9; color: #2e7d32; }
    .r-asia    { background: #fce4ec; color: #880e4f; }
    .r-middle-east { background: #fff3e0; color: #e65100; }
    .r-pacific { background: #e0f7fa; color: #006064; }

    /* Confidence badge */
    .conf-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .conf-high      { background: #e8f5e9; color: #2e7d32; }
    .conf-medium-high { background: #f1f8e9; color: #558b2f; }
    .conf-medium    { background: #fff8e1; color: #f57f17; }
    .conf-low       { background: #ffebee; color: #b71c1c; }
    .conf-unknown   { background: #f5f5f5; color: #9e9e9e; }

    /* Rate values */
    .rate-val { font-weight: 600; font-size: 13px; }
    .na { color: #bdbdbd; }

    /* SE regime tag */
    .regime-tag {
      display: block;
      font-size: 10px;
      color: #666;
      margin-top: 1px;
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* No data */
    .no-data {
      text-align: center;
      padding: 48px !important;
      color: #9e9e9e;
      font-style: italic;
    }
  `],
})
export class RankingTableComponent {
  readonly store = inject(AppStore);
  readonly regionLabel = regionLabel;

  readonly columns = [
    'rank', 'country', 'region', 'confidence',
    'empl30k', 'empl60k', 'empl100k', 'bestSE60k', 'topPIT',
  ];

  sortIcon(field: SortField): string {
    if (this.store.sortField() !== field) return '↕';
    return this.store.sortDir() === 'asc' ? '↑' : '↓';
  }

  fmtRate(rate: number | null | undefined): string {
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

  confLabel(c: Confidence | null): string {
    return c ? (CONF_LABEL[c] ?? c) : '?';
  }

  confClass(c: Confidence | null): string {
    return c ? `conf-${c}` : 'conf-unknown';
  }

  regionClass(r: Region): string {
    if (r.includes('europe')) return 'region-chip r-europe';
    if (r.includes('africa')) return 'region-chip r-africa';
    if (r === 'middle-east') return 'region-chip r-middle-east';
    if (r === 'pacific') return 'region-chip r-pacific';
    if (r.includes('asia')) return 'region-chip r-asia';
    return 'region-chip r-americas';
  }
}
