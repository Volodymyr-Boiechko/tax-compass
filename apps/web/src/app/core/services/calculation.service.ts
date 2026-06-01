import { Injectable } from '@angular/core';
import { Country, TaxBracket } from '../models/country.model';

export interface CalculationResult {
  gross: number;
  socialSecurity: number;
  incomeTax: number;
  net: number;
  effectiveRate: number;
  method: string;
}

@Injectable({ providedIn: 'root' })
export class CalculationService {

  /**
   * Calculate employment net income.
   * SS is applied first; PIT is applied to (gross - SS).
   */
  calculateEmployment(country: Country, grossEUR: number): CalculationResult {
    const ss = this.employeeSS(country, grossEUR);
    const taxable = Math.max(0, grossEUR - ss);
    const pit = this.computePIT(country, taxable);
    const net = grossEUR - ss - pit;
    return {
      gross: grossEUR,
      socialSecurity: ss,
      incomeTax: pit,
      net,
      effectiveRate: grossEUR > 0 ? 1 - net / grossEUR : 0,
      method: 'employment',
    };
  }

  /**
   * Calculate best self-employment net.
   * Tries each special regime as a flat all-in rate on gross (no SS for those regimes),
   * plus standard PIT as baseline. Returns the option with highest net.
   */
  calculateBestSelfEmployment(country: Country, grossEUR: number): CalculationResult {
    const standard: CalculationResult = {
      ...this.calculateEmployment(country, grossEUR),
      method: 'self-employment (standard PIT)',
    };

    const regimes = country.specialRegimes ?? [];
    const candidates: CalculationResult[] = [standard];

    for (const r of regimes) {
      if (r.rate === null) continue;
      const pit = grossEUR * r.rate;
      const net = grossEUR - pit;
      candidates.push({
        gross: grossEUR,
        socialSecurity: 0,
        incomeTax: pit,
        net,
        effectiveRate: grossEUR > 0 ? pit / grossEUR : 0,
        method: `self-employment (${r.name})`,
      });
    }

    return candidates.reduce((best, curr) => curr.net > best.net ? curr : best);
  }

  private employeeSS(country: Country, gross: number): number {
    const ss = country.socialSecurity;
    if (!ss || ss.employeeRate === null) return 0;
    const capped = ss.annualCap !== null ? Math.min(gross, ss.annualCap) : gross;
    return capped * ss.employeeRate;
  }

  private computePIT(country: Country, taxable: number): number {
    const pit = country.personalIncomeTax;
    if (!pit) return 0;
    const brackets = pit.brackets;
    // Only use brackets when: denominated in EUR (or unspecified) AND strictly increasing `from` values.
    // Brackets stored in foreign currencies or with all-zero `from` fields (cumulative format artifact)
    // would apply incorrectly to EUR input — fall through to topRate instead.
    if (
      brackets &&
      brackets.length > 0 &&
      (pit.currency === null || pit.currency === 'EUR') &&
      this.bracketsAreValid(brackets)
    ) {
      return this.applyBrackets(brackets, taxable);
    }
    return pit.topRate !== null ? taxable * pit.topRate : 0;
  }

  private bracketsAreValid(brackets: TaxBracket[]): boolean {
    for (let i = 1; i < brackets.length; i++) {
      if (brackets[i].from <= brackets[i - 1].from) return false;
    }
    return true;
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
