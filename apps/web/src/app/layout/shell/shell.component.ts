import { Component, inject, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AppStore } from '../../state/app.store';
import { HeaderComponent } from '../header/header.component';
import { FiltersComponent } from '../../features/filters/filters.component';
import { RankingTableComponent } from '../../features/ranking/ranking-table.component';
import { ComparisonDrawerComponent } from '../../features/comparison/comparison-drawer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    HeaderComponent,
    FiltersComponent,
    RankingTableComponent,
    ComparisonDrawerComponent,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  template: `
    <app-header />

    @if (store.loading()) {
      <div class="loading-state">
        <mat-spinner diameter="52" />
        <p>Loading 147 countries…</p>
      </div>
    } @else if (store.error()) {
      <div class="error-wrap">
        <mat-card class="error-card">
          <mat-card-content>⚠️ {{ store.error() }}</mat-card-content>
        </mat-card>
      </div>
    } @else {
      <app-filters />
      <main class="main-content">
        <app-ranking-table />
      </main>
    }

    <app-comparison-drawer />
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      gap: 20px;
      color: #666;
      font-size: 16px;
    }
    .error-wrap { padding: 32px; max-width: 600px; margin: 0 auto; }
    .error-card { border-left: 4px solid #f44336; }
    .main-content { padding: 12px 16px 72px; }
  `],
})
export class ShellComponent implements OnInit {
  readonly store = inject(AppStore);

  ngOnInit(): void {
    void this.store.loadAll();
  }
}
