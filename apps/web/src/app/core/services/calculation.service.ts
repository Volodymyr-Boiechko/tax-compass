import { Injectable } from '@angular/core';
import { Country, EffectiveRateSet, TaxBracket } from '../models/country.model';

export interface CalculationResult {
  gross: number;
  socialSecurity: number;
  incomeTax: number;
  net: number;
  effectiveRate: number;
  method: string;
  /** True when the result is derived from stored EY/PwC effective rates, not computed from brackets. */
  isDerived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CalculationService {

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Fallback hierarchy (for countries without computableRegimes):
   *   1. Valid EUR brackets → progressive calculation
   *   2. Stored effectiveRates.employment → source of truth (isDerived: true)
   *   3. topRate flat → conservative approximation
   *   4. null → no data
   */
  calculateEmployment(country: Country, grossEUR: number): CalculationResult | null {
    if (grossEUR <= 0) return null;

    const pit = country.personalIncomeTax;
    const ss = this.employeeSS(country, grossEUR);
    const taxable = Math.max(0, grossEUR - ss);

    // Path 1: valid EUR brackets
    if (pit?.brackets?.length && this.isBracketsValid(pit.brackets, pit.currency ?? null)) {
      const incomeTax = this.applyBrackets(pit.brackets, taxable);
      const net = grossEUR - ss - incomeTax;
      return { gross: grossEUR, socialSecurity: ss, incomeTax, net,
        effectiveRate: 1 - net / grossEUR, method: 'employment' };
    }

    // Path 2: stored effective rate (source of truth)
    const storedRate = this.interpolateStoredRate(country.effectiveRates.employment, grossEUR);
    if (storedRate != null) {
      const net = grossEUR * (1 - storedRate);
      return {
        gross: grossEUR,
        socialSecurity: 0,
        incomeTax: grossEUR * storedRate,
        net,
        effectiveRate: storedRate,
        method: 'employment (stored rate)',
        isDerived: true,
      };
    }

    // Path 3: topRate flat fallback
    if (pit?.topRate != null) {
      const incomeTax = taxable * pit.topRate;
      const net = grossEUR - ss - incomeTax;
      return { gross: grossEUR, socialSecurity: ss, incomeTax, net,
        effectiveRate: 1 - net / grossEUR, method: 'employment (top rate)' };
    }

    return null;
  }

  /**
   * Returns the best self-employment result.
   * For countries with valid brackets/topRate: compares employment vs specialRegimes.
   * For stored-rate countries: uses stored bestSelfEmployment rate, also checking specialRegimes.
   */
  calculateBestSelfEmployment(country: Country, grossEUR: number): CalculationResult | null {
    if (grossEUR <= 0) return null;

    const pit = country.personalIncomeTax;
    const hasBrackets = pit?.brackets?.length
      && this.isBracketsValid(pit.brackets, pit.currency ?? null);
    const hasTopRate = pit?.topRate != null;

    if (hasBrackets || hasTopRate) {
      // Dynamic path: compute employment result, then compete against specialRegimes
      const employment = this.calculateEmployment(country, grossEUR);
      const candidates: CalculationResult[] = employment
        ? [{ ...employment, method: 'self-employment (standard)' }]
        : [];
      this.addSpecialRegimeCandidates(country, grossEUR, candidates);
      return candidates.length > 0
        ? candidates.reduce((best, r) => r.net > best.net ? r : best)
        : null;
    }

    // Stored-rate path: use bestSelfEmployment stored rate as baseline, then check specialRegimes
    const candidates: CalculationResult[] = [];

    const storedSERate = this.interpolateStoredRate(country.effectiveRates.bestSelfEmployment, grossEUR);
    if (storedSERate != null) {
      const net = grossEUR * (1 - storedSERate);
      candidates.push({
        gross: grossEUR,
        socialSecurity: 0,
        incomeTax: grossEUR * storedSERate,
        net,
        effectiveRate: storedSERate,
        method: 'self-employment (stored rate)',
        isDerived: true,
      });
    }

    this.addSpecialRegimeCandidates(country, grossEUR, candidates);

    return candidates.length > 0
      ? candidates.reduce((best, r) => r.net > best.net ? r : best)
      : null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private addSpecialRegimeCandidates(
    country: Country,
    grossEUR: number,
    candidates: CalculationResult[],
  ): void {
    for (const r of country.specialRegimes ?? []) {
      if (r.rate == null) continue;
      const incomeTax = grossEUR * r.rate;
      const net = grossEUR - incomeTax;
      candidates.push({
        gross: grossEUR,
        socialSecurity: 0,
        incomeTax,
        net,
        effectiveRate: grossEUR > 0 ? incomeTax / grossEUR : 0,
        method: `self-employment (${r.name})`,
      });
    }
  }

  private isBracketsValid(brackets: TaxBracket[], currency: string | null): boolean {
    if (currency != null && currency !== 'EUR') return false;
    for (let i = 1; i < brackets.length; i++) {
      if (brackets[i].from <= brackets[i - 1].from) return false;
    }
    return true;
  }

  private interpolateStoredRate(rates: EffectiveRateSet, grossEUR: number): number | null {
    if (grossEUR <= 30000) return rates['30k'] ?? rates['60k'] ?? rates['100k'] ?? null;
    if (grossEUR <= 60000) return rates['60k'] ?? rates['30k'] ?? rates['100k'] ?? null;
    return rates['100k'] ?? rates['60k'] ?? rates['30k'] ?? null;
  }

  private employeeSS(country: Country, gross: number): number {
    const ss = country.socialSecurity;
    if (!ss || ss.employeeRate === null) return 0;
    const capped = ss.annualCap !== null ? Math.min(gross, ss.annualCap) : gross;
    return capped * ss.employeeRate;
  }

  private applyBrackets(brackets: TaxBracket[], taxable: number): number {
    let tax = 0;
    for (const b of brackets) {
      if (taxable <= b.from) break;
      const upper = b.to !== null ? b.to : Infinity;
      const inBracket = Math.min(taxable, upper) - b.from;
      if (inBracket > 0) tax += inBracket * b.rate;
    }
    return tax;
  }
}
