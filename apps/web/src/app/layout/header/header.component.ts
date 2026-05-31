import { Component, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppStore } from '../../state/app.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <span class="brand">🌍 Tax Compass</span>
      @if (store.countryCount() > 0) {
        <span class="tagline">
          {{ store.countryCount() }} countries · {{ store.regionCount() }} regions · 2026 data
        </span>
      }
      <span class="spacer"></span>
      <button
        mat-icon-button
        [matTooltip]="locale() === 'en' ? 'Перейти на українську' : 'Switch to English'"
        (click)="toggleLocale()"
        aria-label="Toggle language"
      >
        <span class="lang-flag">{{ locale() === 'en' ? '🇺🇦' : '🇺🇸' }}</span>
      </button>
    </mat-toolbar>
  `,
  styles: [`
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .brand {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-right: 14px;
      white-space: nowrap;
    }
    .tagline {
      font-size: 13px;
      opacity: 0.72;
      font-weight: 400;
    }
    .spacer { flex: 1 1 auto; }
    .lang-flag { font-size: 22px; line-height: 1; }
  `],
})
export class HeaderComponent {
  readonly store = inject(AppStore);
  readonly locale = signal<'en' | 'uk'>('en');

  toggleLocale(): void {
    this.locale.update(l => (l === 'en' ? 'uk' : 'en'));
  }
}
