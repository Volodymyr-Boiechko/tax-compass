import { inject, Injectable } from '@angular/core';
import { Country } from '../models/country.model';
import { RegimeCalculationService } from './regime-calculation.service';

export interface CalculationResult {
  gross: number;
  socialSecurity: number;
  incomeTax: number;
  net: number;
  effectiveRate: number;
  method: string;
  isDerived?: boolean;
  isApproximation?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CalculationService {
  private readonly regimeCalc = inject(RegimeCalculationService);

  calculateEmployment(country: Country, grossEUR: number): CalculationResult | null {
    if (grossEUR <= 0) return null;
    const cmp = this.regimeCalc.calculateAll(country, grossEUR);
    const emp = cmp.regimes.find(r => r.regimeType === 'employment') ?? cmp.best;
    return {
      gross: emp.gross,
      socialSecurity: emp.socialSecurity,
      incomeTax: emp.incomeTax,
      net: emp.net,
      effectiveRate: emp.effectiveRate,
      method: emp.regimeName,
      isApproximation: emp.isApproximation,
    };
  }

  calculateBestSelfEmployment(country: Country, grossEUR: number): CalculationResult | null {
    if (grossEUR <= 0) return null;
    const cmp = this.regimeCalc.calculateAll(country, grossEUR);
    const se = cmp.regimes
      .filter(r => r.regimeType === 'self-employment')
      .reduce<typeof cmp.regimes[0] | null>((b, r) => (!b || r.net > b.net ? r : b), null)
      ?? cmp.best;
    return {
      gross: se.gross,
      socialSecurity: se.socialSecurity,
      incomeTax: se.incomeTax,
      net: se.net,
      effectiveRate: se.effectiveRate,
      method: se.regimeName,
      isApproximation: se.isApproximation,
    };
  }
}
