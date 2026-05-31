import { Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AppStore } from '../../state/app.store';
import { ComparisonViewComponent } from './comparison-view.component';

@Component({
  selector: 'app-comparison-drawer',
  standalone: true,
  imports: [MatChipsModule, MatButtonModule, MatIconModule],
  template: `
    @if (store.comparedCodes().length > 0) {
      <div class="drawer" role="region" aria-label="Comparison bar" i18n-aria-label="@@comparison.barLabel">
        <span class="drawer-label" i18n="@@comparison.label">
          🔄 Compare ({{ store.comparedCodes().length }}/3):
        </span>

        <mat-chip-set class="drawer-chips" aria-label="Countries selected for comparison" i18n-aria-label="@@comparison.chipsLabel">
          @for (country of store.comparedCountries(); track country.code) {
            <mat-chip (removed)="store.removeFromComparison(country.code)" class="drawer-chip">
              {{ country.flag ?? '🏳' }} {{ country.name }}
              <button matChipRemove [attr.aria-label]="'Remove ' + country.name">
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip>
          }
        </mat-chip-set>

        <div class="drawer-actions">
          <button
            mat-raised-button
            color="accent"
            [disabled]="store.comparedCodes().length < 2"
            (click)="openComparison()"
            i18n="@@comparison.compareSideBySide"
          >
            Compare side-by-side
          </button>
          <button
            mat-stroked-button
            class="clear-btn"
            (click)="store.clearComparison()"
            i18n="@@comparison.clearAll"
          >
            Clear all
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: #303f9f;
      color: white;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 16px;
      padding: 10px 16px;
      min-height: 56px;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.3);
    }

    .drawer-label {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      color: rgba(255,255,255,0.9);
      flex-shrink: 0;
    }

    .drawer-chips {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }

    ::ng-deep .drawer-chip {
      background: rgba(255,255,255,0.15) !important;
      color: white !important;
    }
    ::ng-deep .drawer-chip .mat-mdc-chip-remove { color: rgba(255,255,255,0.7) !important; }

    .drawer-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    .clear-btn {
      color: white !important;
      border-color: rgba(255,255,255,0.5) !important;
    }
  `],
})
export class ComparisonDrawerComponent {
  readonly store = inject(AppStore);
  readonly dialog = inject(MatDialog);

  openComparison(): void {
    this.dialog.open(ComparisonViewComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  }
}
