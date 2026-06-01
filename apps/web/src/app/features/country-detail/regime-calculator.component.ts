import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../../state/app.store';
import { RegimeCalculationService, RegimeCalculationResult, CalculationStep } from '../../core/services/regime-calculation.service';
import { Country } from '../../core/models/country.model';

@Component({
  selector: 'app-regime-calculator',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (!income()) {
      <!-- No income prompt -->
      <div class="p-4 rounded-lg border border-dashed border-[var(--color-border)] text-center">
        <p class="text-[11px] text-[var(--color-text-tertiary)]">
          {{ 'regimeCard.enterIncomePrompt' | translate:{ count: country().computableRegimes!.length } }}
        </p>
      </div>
    } @else {
      @let cmp = comparison();
      @if (cmp) {

        <!-- Comparison summary bar -->
        <div class="mb-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
          <div class="flex items-center justify-between gap-2 text-xs">
            <div>
              <span class="text-[var(--color-text-faint)]">Best: </span>
              <span class="font-medium text-[var(--color-text-secondary)] truncate">{{ shortName(cmp.best) }}</span>
              <span class="font-mono font-semibold ml-1" [style.color]="rateColor(cmp.best.effectiveRate)">{{ fmtEuro(cmp.best.net) }}</span>
              <span class="text-[var(--color-text-faint)] ml-1">({{ fmtRate(cmp.best.effectiveRate) }})</span>
            </div>
            @if (worst(); as w) {
              @if (w.regimeId !== cmp.best.regimeId) {
                <div class="text-right shrink-0">
                  <span class="text-[var(--color-text-faint)]">Worst: </span>
                  <span class="font-mono text-[var(--color-text-secondary)]">{{ fmtEuro(w.net) }}</span>
                  <p class="text-[10px] text-[var(--color-text-faint)] mt-0.5">
                    Δ {{ fmtEuro(cmp.best.net - w.net) }}/yr
                  </p>
                </div>
              }
            }
          </div>
        </div>

        <!-- Regime cards -->
        <div class="space-y-3">
          @for (r of cmp.regimes; track r.regimeId) {
            @let isWinner = r.regimeId === cmp.best.regimeId;
            @let expanded = expandedIds().has(r.regimeId);

            <div
              class="rounded-lg border transition-all duration-150"
              [style]="isWinner
                ? 'background: var(--color-surface-hover); border: 2px solid var(--color-accent); box-shadow: 0 0 16px color-mix(in srgb, var(--color-accent) 12%, transparent)'
                : 'background: var(--color-surface-hover); border: 1px solid var(--color-border)'"
            >
              <!-- Card inner padding -->
              <div class="p-3">

                <!-- Header row -->
                <div class="flex items-start gap-2 mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      @if (isWinner) {
                        <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                              style="background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent); border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)">
                          ✓ {{ 'regimeCard.best' | translate }}
                        </span>
                      }
                      <h4 class="text-sm font-medium text-[var(--color-text-primary)] leading-tight">
                        {{ shortName(r) }}
                      </h4>
                    </div>
                    @if (regimeEligibility(r); as elig) {
                      <p class="text-[10px] text-[var(--color-text-faint)] mt-0.5 leading-relaxed">{{ elig }}</p>
                    }
                  </div>
                  <span
                    class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                    [style]="r.regimeType === 'employment'
                      ? 'background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); border-color: var(--color-border); color: var(--color-text-secondary)'
                      : 'background: color-mix(in srgb, var(--color-accent) 8%, transparent); border-color: color-mix(in srgb, var(--color-accent) 30%, transparent); color: var(--color-accent)'"
                  >{{ (r.regimeType === 'employment' ? 'regimeCard.employed' : 'regimeCard.selfEmpl') | translate }}</span>
                </div>

                <!-- Net income display -->
                <div class="mb-3">
                  <div class="text-[28px] leading-none font-mono font-semibold"
                       [style.color]="rateColor(r.effectiveRate)">
                    {{ fmtEuro(r.net) }}
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs font-medium" [style.color]="rateColor(r.effectiveRate)">
                      {{ fmtRate(r.effectiveRate) }} {{ 'detail.effectiveRate' | translate }}
                    </span>
                    <span class="text-[10px] text-[var(--color-text-faint)]">
                      · {{ 'detail.gross' | translate }} {{ fmtEuro(r.gross) }}
                    </span>
                  </div>
                  @if (r.effectiveRate < 0) {
                    <p class="text-[10px] mt-1" style="color: var(--color-warning)">
                      {{ 'detail.negativeRateWarning' | translate }}
                    </p>
                  }
                </div>

                <!-- Quick deduction summary (always visible) -->
                <div class="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] mb-2">
                  @if (r.socialSecurity > 0) {
                    <span class="font-mono" style="color: var(--color-danger)">SS −{{ fmtEuro(r.socialSecurity) }}</span>
                  }
                  @if (r.incomeTax > 0) {
                    <span class="font-mono" style="color: var(--color-danger)">Tax −{{ fmtEuro(r.incomeTax) }}</span>
                  }
                  @if (r.additionalLevies > 0) {
                    <span class="font-mono" style="color: var(--color-danger)">Levy −{{ fmtEuro(r.additionalLevies) }}</span>
                  }
                </div>

                <!-- Expand toggle -->
                <button
                  class="w-full text-left text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors flex items-center gap-1"
                  [attr.aria-expanded]="expanded"
                  (click)="toggleExpand(r.regimeId)"
                >
                  <span class="text-[10px] leading-none">{{ expanded ? '▲' : '▼' }}</span>
                  {{ (expanded ? 'regimeCard.hideBreakdown' : 'regimeCard.showBreakdown') | translate }}
                </button>

                <!-- Breakdown steps (expanded) -->
                @if (expanded) {
                  <div class="mt-2 pt-2 border-t border-[var(--color-border)] space-y-1">
                    @for (step of r.steps; track step.label + $index) {
                      <div
                        class="flex items-baseline gap-1 text-[11px]"
                        [class.opacity-70]="step.label === 'Gross income'"
                      >
                        <span class="text-[var(--color-text-tertiary)] flex-1 min-w-0 leading-relaxed">
                          {{ step.label }}
                        </span>
                        @if (step.formula) {
                          <span class="text-[10px] text-[var(--color-text-faint)] truncate shrink-0 max-w-[110px] hidden sm:block">
                            {{ step.formula }}
                          </span>
                        }
                        <span
                          class="font-mono shrink-0 font-medium"
                          [style.color]="stepAmountColor(step, r)"
                        >
                          {{ step.label === 'Gross income' ? fmtEuro(step.amount) : fmtSigned(step.amount) }}
                        </span>
                      </div>
                    }
                  </div>
                }

                <!-- Warnings -->
                @if (r.warnings.length > 0 && expanded) {
                  <div class="mt-2 p-2 rounded text-[10px] space-y-1"
                       style="background: color-mix(in srgb, var(--color-warning) 6%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)">
                    @for (w of r.warnings; track $index) {
                      <p style="color: var(--color-warning)">⚠ {{ w }}</p>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Accuracy note -->
        <p class="mt-3 text-[10px] text-[var(--color-text-faint)] text-center italic">
          {{ 'detail.breakdownNote' | translate }}
        </p>

      }
    }
  `,
})
export class RegimeCalculatorComponent {
  private readonly store = inject(AppStore);
  private readonly regimeCalc = inject(RegimeCalculationService);

  readonly country = input.required<Country>();
  readonly income = this.store.userIncome;

  private readonly _expandedIds = signal<Set<string>>(new Set<string>());
  readonly expandedIds = this._expandedIds.asReadonly();

  readonly comparison = computed(() => {
    const inc = this.income();
    if (!inc) return null;
    return this.regimeCalc.calculateAll(this.country(), inc);
  });

  readonly worst = computed<RegimeCalculationResult | null>(() => {
    const cmp = this.comparison();
    if (!cmp || cmp.regimes.length < 2) return null;
    return cmp.regimes.reduce((w, c) => (c.net < w.net ? c : w));
  });

  constructor() {
    effect(() => {
      const cmp = this.comparison();
      untracked(() => {
        this._expandedIds.set(cmp ? new Set([cmp.best.regimeId]) : new Set<string>());
      });
    });
  }

  toggleExpand(id: string): void {
    this._expandedIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  regimeEligibility(r: RegimeCalculationResult): string | null {
    const regime = this.country().computableRegimes?.find(cr => cr.id === r.regimeId);
    if (!regime) return null;
    const parts: string[] = [];
    if (regime.eligibility) parts.push(regime.eligibility);
    if (regime.duration) parts.push('Duration: ' + regime.duration);
    return parts.length > 0 ? parts.join(' · ').slice(0, 120) : null;
  }

  stepAmountColor(step: CalculationStep, r: RegimeCalculationResult): string {
    if (step.label === 'Gross income') return 'var(--color-text-secondary)';
    if (step.label === 'Net income') return this.rateColor(r.effectiveRate);
    return step.amount < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)';
  }

  rateColor(r: number): string {
    if (r <= 0) return 'var(--rate-low)';
    if (r < 0.10) return 'var(--rate-low)';
    if (r < 0.20) return 'var(--rate-low-mid)';
    if (r < 0.30) return 'var(--rate-mid)';
    if (r < 0.40) return 'var(--rate-high-mid)';
    return 'var(--rate-high)';
  }

  fmtEuro(n: number): string {
    return '€' + Math.round(n).toLocaleString('en-US');
  }

  fmtRate(r: number): string {
    const clamped = Math.max(0, r);
    return (clamped * 100).toFixed(1) + '%';
  }

  fmtSigned(n: number): string {
    if (Math.round(n) === 0) return '€0';
    const abs = '€' + Math.round(Math.abs(n)).toLocaleString('en-US');
    return n < 0 ? '−' + abs : '+' + abs;
  }

  shortName(r: RegimeCalculationResult): string {
    const regime = this.country().computableRegimes?.find(cr => cr.id === r.regimeId);
    return regime?.shortName ?? r.regimeName;
  }
}
