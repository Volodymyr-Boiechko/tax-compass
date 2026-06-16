import { Component, effect, inject, signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../state/app.store';
import { CurrencyService, CurrencyCode } from '../core/services/currency.service';

@Component({
  selector: 'app-income-input',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="hidden md:flex items-center gap-1.5">

      <!-- Currency selector -->
      <div class="flex items-center bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5"
           role="group" aria-label="Currency selection">
        @for (c of currencies; track c) {
          <button
            class="px-2 py-1 rounded text-xs font-medium transition-colors"
            [class]="currency.currency() === c
              ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
            [attr.aria-pressed]="currency.currency() === c"
            (click)="currency.setCurrency(c)"
          >{{ c }}</button>
        }
      </div>

      <!-- Period toggle -->
      <div class="flex items-center bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5"
           role="group" aria-label="Period selection">
        <button
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          [class]="currency.period() === 'annual'
            ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="currency.period() === 'annual'"
          (click)="currency.setPeriod('annual')"
        >{{ 'currency.year' | translate }}</button>
        <button
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          [class]="currency.period() === 'monthly'
            ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
          [attr.aria-pressed]="currency.period() === 'monthly'"
          (click)="currency.setPeriod('monthly')"
        >{{ 'currency.month' | translate }}</button>
      </div>

      <!-- Amount input -->
      <div class="relative">
        @if (currency.meta().symbolBefore) {
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] text-sm pointer-events-none select-none">
            {{ currency.meta().symbol }}
          </span>
        }
        <input
          type="number"
          [placeholder]="'topNav.incomeLabel' | translate"
          min="0"
          step="1000"
          aria-label="Your income"
          class="w-32 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          [class]="currency.meta().symbolBefore ? 'pl-7 pr-3' : 'pl-3 pr-7'"
          [value]="draft()"
          (input)="onInput($event)"
        />
        @if (!currency.meta().symbolBefore) {
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] text-sm pointer-events-none select-none">
            {{ currency.meta().symbol }}
          </span>
        }
      </div>

      <!-- Rates status note (only when not EUR) -->
      @if (currency.currency() !== 'EUR') {
        <span
          class="text-[10px] text-[var(--color-text-faint)] cursor-default"
          [title]="ratesTitle()"
        >
          {{ (currency.ratesStatus() === 'live' ? 'currency.ratesLive' : 'currency.ratesApprox') | translate }}
        </span>
      }
    </div>
  `,
})
export class IncomeInputComponent {
  readonly currency = inject(CurrencyService);
  readonly store    = inject(AppStore);

  readonly currencies: CurrencyCode[] = ['EUR', 'USD', 'UAH'];
  readonly draft = signal<string>('');

  private inputTimer: ReturnType<typeof setTimeout> | null = null;
  private isTyping = false;

  constructor() {
    // Sync draft → whenever currency or period changes (not while typing)
    effect(() => {
      const cur = this.currency.currency();
      const per = this.currency.period();
      if (this.isTyping) return;
      untracked(() => {
        const income = this.store.userIncome();
        if (income == null) { this.draft.set(''); return; }
        const inCur = this.currency.fromEUR(income, cur);
        const amount = per === 'monthly' ? inCur / 12 : inCur;
        this.draft.set(String(Math.round(amount)));
      });
    });
  }

  onInput(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    this.draft.set(raw);
    this.isTyping = true;
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => {
      this.isTyping = false;
      const n = Number(raw);
      if (!raw || isNaN(n) || n <= 0) {
        this.store.setIncome(null);
        return;
      }
      const multiplier  = this.currency.period() === 'monthly' ? 12 : 1;
      const annualInCur = n * multiplier;
      const annualEUR   = this.currency.toEUR(annualInCur);
      this.store.setIncome(annualEUR);
    }, 300);
  }

  ratesTitle(): string {
    const ts = this.currency.ratesUpdatedAt();
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  }
}
