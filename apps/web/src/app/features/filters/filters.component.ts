import { Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AppStore } from '../../state/app.store';
import { Confidence, Region } from '../../core/models/country.model';
import { regionLabel } from '../../core/utils/region.utils';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="filters-bar">
      <div class="filters-row">

        <!-- Search -->
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="field-search">
          <mat-label>Search</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            [value]="store.searchQuery()"
            (input)="onSearch($event)"
            placeholder="Country name or code…"
          />
          @if (store.searchQuery()) {
            <button matSuffix mat-icon-button aria-label="Clear search" (click)="store.setSearch('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <!-- Region multi-select -->
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="field-region">
          <mat-label>Region</mat-label>
          <mat-select
            multiple
            [value]="store.selectedRegions()"
            (selectionChange)="onRegionChange($event)"
          >
            @for (r of store.allRegions(); track r) {
              <mat-option [value]="r">{{ regionLabel(r) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Confidence toggle group -->
        <div class="conf-group">
          <span class="conf-group-label">Confidence</span>
          <mat-button-toggle-group
            multiple
            [value]="store.selectedConfidence()"
            (change)="onConfidenceChange($event)"
            class="conf-toggles"
          >
            <mat-button-toggle value="high">High</mat-button-toggle>
            <mat-button-toggle value="medium-high">Med+</mat-button-toggle>
            <mat-button-toggle value="medium">Med</mat-button-toggle>
            <mat-button-toggle value="low">Low</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <!-- Status + clear -->
        <div class="filter-actions">
          @if (store.activeFilterCount() > 0) {
            <button mat-stroked-button color="warn" (click)="store.clearFilters()">
              <mat-icon>filter_alt_off</mat-icon>
              Clear ({{ store.activeFilterCount() }})
            </button>
          }
          <span class="result-count">
            <strong>{{ store.filteredCount() }}</strong>
            <span class="of"> / {{ store.countryCount() }}</span>
          </span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .filters-bar {
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      padding: 10px 16px 8px;
      position: sticky;
      top: 64px;
      z-index: 90;
    }
    .filters-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .field-search { width: 230px; }
    .field-region { width: 190px; }
    .conf-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .conf-group-label {
      font-size: 12px;
      color: rgba(0,0,0,0.54);
      white-space: nowrap;
    }
    .conf-toggles ::ng-deep .mat-button-toggle {
      font-size: 12px;
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
    }
    .result-count {
      font-size: 14px;
      white-space: nowrap;
    }
    .result-count strong {
      color: #1565c0;
      font-weight: 700;
    }
    .result-count .of {
      color: rgba(0,0,0,0.5);
    }
  `],
})
export class FiltersComponent {
  readonly store = inject(AppStore);
  readonly regionLabel = regionLabel;

  onSearch(event: Event): void {
    this.store.setSearch((event.target as HTMLInputElement).value);
  }

  onRegionChange(event: MatSelectChange): void {
    this.store.setRegions(event.value as Region[]);
  }

  onConfidenceChange(event: MatButtonToggleChange): void {
    this.store.setConfidence(event.value as Confidence[]);
  }
}
