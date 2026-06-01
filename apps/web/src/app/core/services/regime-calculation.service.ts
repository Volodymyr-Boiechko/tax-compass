import { Injectable } from '@angular/core';
import {
  AdditionalLevy,
  ComputableRegime,
  ComputableRegimePit,
  ComputableRegimeSS,
  Country,
  TaxBracket,
} from '../models/country.model';

// ─── Public types ──────────────────────────────────────────────────────────

export interface CalculationStep {
  label: string;
  amount: number;      // positive = income, negative = cost
  rate?: number;
  formula?: string;
}

export interface RegimeCalculationResult {
  regimeId: string;
  regimeName: string;
  regimeType: 'employment' | 'self-employment';
  gross: number;
  steps: CalculationStep[];
  socialSecurity: number;
  incomeTax: number;
  additionalLevies: number;
  net: number;
  effectiveRate: number;
  warnings: string[];
}

export interface RegimeComparison {
  regimes: RegimeCalculationResult[];
  best: RegimeCalculationResult;
}

// ─── Service ──────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RegimeCalculationService {

  // ── Public API ────────────────────────────────────────────────────────

  calculate(
    country: Country,
    regime: ComputableRegime,
    grossEUR: number,
  ): RegimeCalculationResult {
    const steps: CalculationStep[] = [];
    const warnings: string[] = [];

    if (grossEUR <= 0) {
      return this.zeroResult(regime, grossEUR);
    }

    steps.push({ label: 'Gross income', amount: grossEUR });

    // 1. Social security (computed on gross, independent of PIT base)
    const ss = this.computeSS(regime.socialSecurity, grossEUR, steps, warnings);

    // 2. Additional levies (military, solidarity, SDI, etc.)
    const levies = this.computeLevies(regime, grossEUR, steps);

    // 3. PIT taxable base
    const pitBase = this.computePITBase(regime, grossEUR, ss);

    // 4. Income tax
    const pit = this.computePIT(regime, country, pitBase, grossEUR, steps, warnings);

    // 5. Net
    const net = grossEUR - ss - pit - levies;
    steps.push({ label: 'Net income', amount: net });

    return {
      regimeId: regime.id,
      regimeName: regime.name,
      regimeType: regime.type,
      gross: grossEUR,
      steps,
      socialSecurity: ss,
      incomeTax: pit,
      additionalLevies: levies,
      net,
      effectiveRate: 1 - net / grossEUR,
      warnings,
    };
  }

  calculateAll(country: Country, grossEUR: number): RegimeComparison | null {
    const regimes = country.computableRegimes;
    if (!regimes || regimes.length === 0) return null;

    const results = regimes.map(r => this.calculate(country, r, grossEUR));
    const best = results.reduce((b, c) => (c.net > b.net ? c : b));
    return { regimes: results, best };
  }

  // ── PIT base ──────────────────────────────────────────────────────────

  /**
   * Determine the base to which PIT is applied, before bracket/rate lookup.
   *
   * Rules:
   * - lump-sum / zero: base = gross (SS is always separate)
   * - flat + gross/revenue: base = gross
   * - flat + taxable: base = gross × (1 − deductionPercent/100)  [e.g. Forfettario 78%]
   * - flat + profit: base = gross (no expense modeling; warns)
   * - progressive + taxable (no deductionPercent): base = gross − SS  [standard employment]
   * - progressive + taxable + deductionPercent: base = gross × (1 − deductionPercent/100)
   * - progressive + revenue + deductionPercent: base = gross × (1 − deductionPercent/100)
   * - progressive + profit: base = gross − SS (approximate)
   *
   * Personal allowance is subtracted after, if present and relevant.
   */
  private computePITBase(
    regime: ComputableRegime,
    gross: number,
    ss: number,
  ): number {
    const { pit } = regime;
    const deductFraction =
      pit.deductionPercent !== undefined ? pit.deductionPercent / 100 : 0;

    let base: number;

    switch (pit.kind) {
      case 'zero':
        return 0;

      case 'lump-sum':
        return gross;

      case 'flat':
        switch (pit.appliesTo) {
          case 'taxable':
            base = gross * (1 - deductFraction);
            break;
          case 'gross':
          case 'revenue':
          case 'profit':
            base = gross;
            break;
        }
        break;

      case 'progressive':
        switch (pit.appliesTo) {
          case 'taxable':
            // deductionPercent present → revenue coefficient (e.g. no case in current data)
            // deductionPercent absent → SS deductible from gross (standard employment)
            base =
              deductFraction > 0
                ? gross * (1 - deductFraction)
                : Math.max(0, gross - ss);
            break;
          case 'revenue':
            // Revenue coefficient (PT simplified B2B, FR Micro-BNC 34% abattement)
            base = gross * (1 - deductFraction);
            break;
          case 'profit':
          case 'gross':
            // Approximate: gross − SS; no expense modeling
            base = Math.max(0, gross - ss);
            break;
        }
        break;
    }

    // Subtract personal allowance for progressive PIT
    if (pit.kind === 'progressive' && regime.personalAllowance) {
      base = Math.max(0, base - regime.personalAllowance.amount);
    }

    return base;
  }

  // ── PIT computation ───────────────────────────────────────────────────

  private computePIT(
    regime: ComputableRegime,
    country: Country,
    pitBase: number,
    gross: number,
    steps: CalculationStep[],
    warnings: string[],
  ): number {
    const pit = regime.pit;

    switch (pit.kind) {
      case 'zero':
        steps.push({ label: 'Income tax', amount: 0, formula: '0% (no PIT)' });
        return 0;

      case 'lump-sum': {
        if (pit.cap) {
          const capEUR = pit.cap.amount;
          if (gross > capEUR) {
            warnings.push(
              `Gross EUR ${fmt(gross)} exceeds ${pit.cap.currency} cap (EUR ${fmt(capEUR)}); ` +
              `capping lump-sum base at cap amount.`,
            );
          }
        }
        const base = pit.cap ? Math.min(gross, pit.cap.amount) : gross;
        const rate = pit.rate ?? 0;
        const tax = base * rate;
        steps.push({
          label: 'Income tax (lump-sum)',
          amount: -tax,
          rate,
          formula: `${pct(rate)} × ${fmt(base)}`,
        });
        return tax;
      }

      case 'flat': {
        if (pit.cap) {
          const capEUR = pit.cap.amount;
          if (gross > capEUR) {
            warnings.push(
              `Revenue ${fmt(gross)} exceeds ${pit.cap.currency} cap EUR ${fmt(capEUR)} ` +
              `for this flat-rate regime.`,
            );
          }
        }
        const rate = pit.rate ?? 0;
        const tax = pitBase * rate;
        const deductNote =
          pit.deductionPercent !== undefined
            ? ` (${100 - pit.deductionPercent}% coefficient on gross)`
            : '';
        steps.push({
          label: 'Income tax (flat)',
          amount: -tax,
          rate,
          formula: `${pct(rate)} × ${fmt(pitBase)}${deductNote}`,
        });
        return tax;
      }

      case 'progressive': {
        const brackets = this.resolveBrackets(regime.pit, country, warnings);
        return this.applyBrackets(brackets, pitBase, steps);
      }
    }
  }

  /** Pick brackets: regime override → country brackets (if valid) → topRate fallback. */
  private resolveBrackets(
    pit: ComputableRegimePit,
    country: Country,
    warnings: string[],
  ): TaxBracket[] {
    // 1. Regime-level override
    if (pit.brackets && pit.brackets.length > 0) return pit.brackets;

    // 2. Country-level brackets — validate sequential `from` values
    const cb = country.personalIncomeTax?.brackets;
    if (cb && cb.length > 0 && this.bracketsAreValid(cb)) return cb;

    // 3. Fall back to topRate as a single bracket
    const topRate = country.personalIncomeTax?.topRate ?? 0;
    warnings.push(
      `No valid brackets found for progressive PIT; using flat topRate ${pct(topRate)} as approximation.`,
    );
    return [{ from: 0, to: null, rate: topRate }];
  }

  private bracketsAreValid(brackets: TaxBracket[]): boolean {
    for (let i = 1; i < brackets.length; i++) {
      if (brackets[i].from <= brackets[i - 1].from) return false;
    }
    return true;
  }

  private applyBrackets(
    brackets: TaxBracket[],
    taxable: number,
    steps: CalculationStep[],
  ): number {
    if (taxable <= 0) {
      steps.push({ label: 'Income tax (progressive)', amount: 0, formula: 'Taxable base ≤ 0' });
      return 0;
    }
    let total = 0;
    for (const b of brackets) {
      if (taxable <= b.from) break;
      const upper = b.to !== null ? b.to : Infinity;
      const inBand = Math.min(taxable, upper) - b.from;
      if (inBand > 0) total += inBand * b.rate;
    }
    steps.push({
      label: 'Income tax (progressive)',
      amount: -total,
      formula: `Progressive on ${fmt(taxable)}`,
    });
    return total;
  }

  // ── Social Security ───────────────────────────────────────────────────

  private computeSS(
    ss: ComputableRegimeSS,
    gross: number,
    steps: CalculationStep[],
    warnings: string[],
  ): number {
    switch (ss.kind) {
      case 'none':
        return 0;

      case 'percentage': {
        const base = ss.cap !== undefined ? Math.min(gross, ss.cap) : gross;
        const rate = ss.rate ?? 0;
        const amount = base * rate;
        const capNote = ss.cap !== undefined && gross > ss.cap ? ' (capped)' : '';
        steps.push({
          label: 'Social security',
          amount: -amount,
          rate,
          formula: `${pct(rate)} × ${fmt(base)}${capNote}`,
        });
        return amount;
      }

      case 'fixed-monthly': {
        const monthly = ss.monthly ?? 0;
        const annual = monthly * 12;
        steps.push({
          label: 'Social security',
          amount: -annual,
          formula: `${fmt(monthly)}/month × 12 (fixed)`,
        });
        return annual;
      }

      case 'banded': {
        const bands = ss.bands;
        if (!bands || bands.length === 0) return 0;
        // Find the first band where upTo is null (last/top) or gross ≤ upTo
        const band =
          bands.find(b => b.upTo === null || gross <= b.upTo) ??
          bands[bands.length - 1];
        const monthly = band.monthly ?? 0;
        if (monthly === 0 && band.upTo !== null) {
          warnings.push(`SS banded lookup: band.monthly is null/0 for gross ${fmt(gross)}.`);
        }
        const annual = monthly * 12;
        const bandLabel =
          band.upTo !== null ? `band ≤ ${fmt(band.upTo)}` : 'top band';
        steps.push({
          label: 'Social security',
          amount: -annual,
          formula: `${fmt(monthly)}/month × 12 (${bandLabel})`,
        });
        return annual;
      }
    }
  }

  // ── Additional levies ─────────────────────────────────────────────────

  private computeLevies(
    regime: ComputableRegime,
    gross: number,
    steps: CalculationStep[],
  ): number {
    if (!regime.additionalLevies) return 0;
    let total = 0;
    for (const levy of regime.additionalLevies) {
      const base = this.levyBase(levy, gross);
      const amount = base * levy.rate;
      total += amount;
      steps.push({
        label: levy.name,
        amount: -amount,
        rate: levy.rate,
        formula: `${pct(levy.rate)} × ${fmt(base)}`,
      });
    }
    return total;
  }

  private levyBase(levy: AdditionalLevy, gross: number): number {
    // For Phase 2 all levy bases resolve to gross (revenue / gross / taxable ≈ gross)
    switch (levy.appliesTo) {
      case 'gross':
      case 'revenue':
      case 'taxable':
        return gross;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private zeroResult(regime: ComputableRegime, gross: number): RegimeCalculationResult {
    return {
      regimeId: regime.id,
      regimeName: regime.name,
      regimeType: regime.type,
      gross,
      steps: [{ label: 'Gross income', amount: gross }],
      socialSecurity: 0,
      incomeTax: 0,
      additionalLevies: 0,
      net: gross,
      effectiveRate: 0,
      warnings: ['Gross income is zero or negative.'],
    };
  }
}

// ── Module-level formatting helpers ───────────────────────────────────────

function fmt(n: number): string {
  return '€' + Math.round(n).toLocaleString('en-US');
}

function pct(r: number): string {
  return (r * 100).toFixed(2).replace(/\.?0+$/, '') + '%';
}
