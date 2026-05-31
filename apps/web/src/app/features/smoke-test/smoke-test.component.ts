import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, PercentPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-smoke-test',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatChipsModule,
    PercentPipe,
  ],
  template: `
    <div style="max-width: 600px; margin: 48px auto; padding: 0 16px;">

      @if (store.loading()) {
        <mat-card>
          <mat-card-content style="text-align: center; padding: 48px;">
            <mat-spinner diameter="48" style="margin: 0 auto 16px;"></mat-spinner>
            <p>Loading countries data…</p>
          </mat-card-content>
        </mat-card>
      }

      @if (store.error()) {
        <mat-card style="border-left: 4px solid #f44336;">
          <mat-card-header>
            <mat-card-title>Error loading data</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ store.error() }}</p>
          </mat-card-content>
        </mat-card>
      }

      @if (!store.loading() && !store.error()) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              ✅ Loaded {{ store.countryCount() }} countries from {{ store.regionCount() }} regions
            </mat-card-title>
            <mat-card-subtitle>
              Data layer smoke test — Angular 19 + Signals
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <p style="margin: 16px 0 8px; font-weight: 500;">First 5 countries:</p>
            <mat-list>
              @for (c of firstFive(); track c.code) {
                <mat-list-item style="height: auto; padding: 8px 0;">
                  <span matListItemTitle>
                    {{ c.flag }} {{ c.name }}
                    <mat-chip style="margin-left: 8px; font-size: 11px;">{{ c.region }}</mat-chip>
                  </span>
                  <span matListItemLine style="color: #555; font-size: 13px;">
                    @if (c.effectiveRates.bestSelfEmployment['60k'] != null) {
                      Best SE at €60k:
                      <strong>{{ c.effectiveRates.bestSelfEmployment['60k'] | percent:'1.1-1' }}</strong>
                      @if (c.effectiveRates.bestSelfEmployment.regime) {
                        · {{ c.effectiveRates.bestSelfEmployment.regime }}
                      }
                    } @else {
                      SE rate: N/A
                    }
                  </span>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>

          <mat-card-footer style="padding: 8px 16px 16px;">
            <small style="color: #888;">
              Confidence: high {{ highCount() }}, medium {{ mediumCount() }}, low {{ lowCount() }}
            </small>
          </mat-card-footer>
        </mat-card>
      }

    </div>
  `,
})
export class SmokeTestComponent implements OnInit {
  readonly store = inject(AppStore);

  firstFive() {
    return this.store.countries().slice(0, 5);
  }

  highCount() {
    return this.store.countries().filter(c => c.confidence === 'high').length;
  }

  mediumCount() {
    return this.store.countries().filter(c =>
      c.confidence === 'medium' || c.confidence === 'medium-high').length;
  }

  lowCount() {
    return this.store.countries().filter(c => c.confidence === 'low').length;
  }

  ngOnInit() {
    void this.store.loadAll();
  }
}
