import { TestBed } from '@angular/core/testing';
import { RegimeCalculationService } from './regime-calculation.service';
import { ComputableRegime, Country, TaxBracket } from '../models/country.model';

const BRACKETS: TaxBracket[] = [
  { from: 0,     to: 10000, rate: 0.10 },
  { from: 10000, to: 30000, rate: 0.20 },
  { from: 30000, to: null,  rate: 0.30 },
];

function mkRegime(overrides: Partial<ComputableRegime> = {}): ComputableRegime {
  return {
    id: 'r1',
    name: 'Test Regime',
    type: 'employment',
    pit: { kind: 'zero', appliesTo: 'gross' },
    socialSecurity: { kind: 'none' },
    ...overrides,
  } as ComputableRegime;
}

function mkCountry(regimes: ComputableRegime[] = [], pit?: Partial<Country['personalIncomeTax']>): Country {
  return {
    code: 'TS',
    name: 'Testland',
    flag: null,
    region: 'western-europe',
    confidence: 'high',
    lastReviewed: null,
    personalIncomeTax: { topRate: 0, brackets: null, currency: null, ...pit },
    socialSecurity: null,
    specialRegimes: null,
    changes2026: [],
    knownGaps: [],
    crossVerification: null,
    sources: null,
    computableRegimes: regimes,
  };
}

describe('RegimeCalculationService', () => {
  let svc: RegimeCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(RegimeCalculationService);
  });

  // ── Social Security ───────────────────────────────────────────────────────

  it('SS none → socialSecurity = 0', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ socialSecurity: { kind: 'none' } }), 50000);
    expect(r.socialSecurity).toBe(0);
    expect(r.net).toBe(50000);
  });

  it('SS percentage without cap', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ socialSecurity: { kind: 'percentage', rate: 0.10 } }), 50000);
    expect(r.socialSecurity).toBeCloseTo(5000);
  });

  it('SS percentage with cap → capped', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ socialSecurity: { kind: 'percentage', rate: 0.20, cap: 30000 } }), 50000);
    expect(r.socialSecurity).toBeCloseTo(6000);
  });

  it('SS fixed-monthly → 12 × monthly', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ socialSecurity: { kind: 'fixed-monthly', monthly: 500 } }), 60000);
    expect(r.socialSecurity).toBeCloseTo(6000);
  });

  it('SS banded → lower band when gross ≤ upTo', () => {
    const regime = mkRegime({
      socialSecurity: { kind: 'banded', bands: [{ upTo: 50000, monthly: 300 }, { upTo: null, monthly: 600 }] },
    });
    expect(svc.calculate(mkCountry(), regime, 40000).socialSecurity).toBeCloseTo(3600);
  });

  it('SS banded → upper band when gross > first upTo', () => {
    const regime = mkRegime({
      socialSecurity: { kind: 'banded', bands: [{ upTo: 50000, monthly: 300 }, { upTo: null, monthly: 600 }] },
    });
    expect(svc.calculate(mkCountry(), regime, 60000).socialSecurity).toBeCloseTo(7200);
  });

  // ── PIT ──────────────────────────────────────────────────────────────────

  it('PIT zero → incomeTax = 0, net = gross', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ pit: { kind: 'zero', appliesTo: 'gross' } }), 50000);
    expect(r.incomeTax).toBe(0);
    expect(r.net).toBe(50000);
  });

  it('PIT lump-sum without cap', () => {
    const r = svc.calculate(
      mkCountry(),
      mkRegime({ pit: { kind: 'lump-sum', appliesTo: 'gross', rate: 0.10 } }),
      50000,
    );
    expect(r.incomeTax).toBeCloseTo(5000);
    expect(r.net).toBeCloseTo(45000);
  });

  it('PIT lump-sum cap exceeded → caps base and emits warning', () => {
    const r = svc.calculate(
      mkCountry(),
      mkRegime({ pit: { kind: 'lump-sum', appliesTo: 'gross', rate: 0.10, cap: { amount: 150000, currency: 'EUR' } } }),
      200000,
    );
    expect(r.incomeTax).toBeCloseTo(15000);
    expect(r.net).toBeCloseTo(185000);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('PIT flat on gross', () => {
    const r = svc.calculate(
      mkCountry(),
      mkRegime({ pit: { kind: 'flat', appliesTo: 'gross', rate: 0.15 } }),
      100000,
    );
    expect(r.incomeTax).toBeCloseTo(15000);
    expect(r.net).toBeCloseTo(85000);
  });

  it('PIT flat with deductionPercent → reduced base', () => {
    const r = svc.calculate(
      mkCountry(),
      mkRegime({ pit: { kind: 'flat', appliesTo: 'taxable', rate: 0.15, deductionPercent: 25 } }),
      100000,
    );
    // base = 100000 * 0.75 = 75000, tax = 11250
    expect(r.incomeTax).toBeCloseTo(11250);
    expect(r.net).toBeCloseTo(88750);
  });

  it('PIT progressive bracket math (regime brackets)', () => {
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable', brackets: BRACKETS },
      socialSecurity: { kind: 'none' },
    });
    const r = svc.calculate(mkCountry(), regime, 50000);
    // base = 50000 − 0 = 50000
    // 0–10k: 1000 | 10–30k: 4000 | 30–50k: 6000 → pit = 11000
    expect(r.incomeTax).toBeCloseTo(11000);
    expect(r.net).toBeCloseTo(39000);
    expect(r.effectiveRate).toBeCloseTo(0.22);
  });

  it('PIT progressive uses SS-reduced base (taxable, no deductionPercent)', () => {
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable', brackets: BRACKETS },
      socialSecurity: { kind: 'percentage', rate: 0.10 },
    });
    const r = svc.calculate(mkCountry(), regime, 50000);
    // ss = 5000, base = 50000 − 5000 = 45000
    // 0–10k: 1000 | 10–30k: 4000 | 30–45k: 4500 → pit = 9500
    expect(r.socialSecurity).toBeCloseTo(5000);
    expect(r.incomeTax).toBeCloseTo(9500);
    expect(r.net).toBeCloseTo(35500);
  });

  it('personalAllowance reduces progressive base', () => {
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable', brackets: BRACKETS },
      socialSecurity: { kind: 'none' },
      personalAllowance: { amount: 5000, currency: 'EUR' },
    });
    const r = svc.calculate(mkCountry(), regime, 50000);
    // base = 50000 − 5000 = 45000
    // 0–10k: 1000 | 10–30k: 4000 | 30–45k: 4500 → pit = 9500
    expect(r.incomeTax).toBeCloseTo(9500);
    expect(r.net).toBeCloseTo(40500);
  });

  // ── Additional levies ─────────────────────────────────────────────────────

  it('additionalLevies applied on gross and subtracted from net', () => {
    const regime = mkRegime({
      socialSecurity: { kind: 'none' },
      pit: { kind: 'zero', appliesTo: 'gross' },
      additionalLevies: [{ name: 'Military', rate: 0.015, appliesTo: 'gross' }],
    });
    const r = svc.calculate(mkCountry(), regime, 50000);
    expect(r.additionalLevies).toBeCloseTo(750);
    expect(r.net).toBeCloseTo(49250);
  });

  it('multiple levies accumulate', () => {
    const regime = mkRegime({
      socialSecurity: { kind: 'none' },
      pit: { kind: 'zero', appliesTo: 'gross' },
      additionalLevies: [
        { name: 'Levy A', rate: 0.01, appliesTo: 'gross' },
        { name: 'Levy B', rate: 0.02, appliesTo: 'gross' },
      ],
    });
    const r = svc.calculate(mkCountry(), regime, 100000);
    expect(r.additionalLevies).toBeCloseTo(3000);
    expect(r.net).toBeCloseTo(97000);
  });

  // ── effectiveRate ──────────────────────────────────────────────────────────

  it('effectiveRate = 1 − net/gross', () => {
    const r = svc.calculate(mkCountry(), mkRegime({ pit: { kind: 'flat', appliesTo: 'gross', rate: 0.20 } }), 80000);
    expect(r.effectiveRate).toBeCloseTo(0.20);
  });

  // ── isApproximation ────────────────────────────────────────────────────────

  it('isApproximation true when incompleteData set', () => {
    const r = svc.calculate(
      mkCountry(),
      mkRegime({ incompleteData: { reason: 'no-brackets' } }),
      50000,
    );
    expect(r.isApproximation).toBeTrue();
  });

  it('isApproximation falsy when incompleteData absent', () => {
    expect(svc.calculate(mkCountry(), mkRegime(), 50000).isApproximation).toBeFalsy();
  });

  // ── zeroResult ─────────────────────────────────────────────────────────────

  it('gross = 0 → zeroResult with warning', () => {
    const r = svc.calculate(mkCountry(), mkRegime(), 0);
    expect(r.net).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.socialSecurity).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.warnings).toContain('Gross income is zero or negative.');
  });

  it('gross < 0 → zeroResult', () => {
    const r = svc.calculate(mkCountry(), mkRegime(), -100);
    expect(r.net).toBe(-100);
    expect(r.effectiveRate).toBe(0);
  });

  // ── Bracket resolution ──────────────────────────────────────────────────────

  it('progressive uses country EUR brackets when regime has none', () => {
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable' },
      socialSecurity: { kind: 'none' },
    });
    const country = mkCountry([], { brackets: BRACKETS, currency: 'EUR', topRate: 0.30 });
    const r = svc.calculate(country, regime, 50000);
    expect(r.incomeTax).toBeCloseTo(11000);
    expect(r.warnings.length).toBe(0);
  });

  it('progressive falls back to topRate when no brackets available', () => {
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable' },
      socialSecurity: { kind: 'none' },
    });
    const country = mkCountry([], { topRate: 0.25, brackets: null, currency: null });
    const r = svc.calculate(country, regime, 50000);
    // base = 50000, pit = 50000 * 0.25 = 12500
    expect(r.incomeTax).toBeCloseTo(12500);
    expect(r.warnings.some(w => w.includes('topRate'))).toBeTrue();
  });

  it('regime brackets override country brackets', () => {
    const regimeBrackets: TaxBracket[] = [{ from: 0, to: null, rate: 0.05 }];
    const regime = mkRegime({
      pit: { kind: 'progressive', appliesTo: 'taxable', brackets: regimeBrackets },
      socialSecurity: { kind: 'none' },
    });
    const country = mkCountry([], { brackets: BRACKETS, currency: 'EUR', topRate: 0.30 });
    const r = svc.calculate(country, regime, 50000);
    expect(r.incomeTax).toBeCloseTo(2500);
  });

  // ── calculateAll ─────────────────────────────────────────────────────────────

  it('calculateAll returns all regimes and picks best (highest net)', () => {
    const zero = mkRegime({ id: 'zero', name: 'Zero',  pit: { kind: 'zero', appliesTo: 'gross' } });
    const high = mkRegime({ id: 'high', name: 'Heavy', pit: { kind: 'flat', appliesTo: 'gross', rate: 0.40 } });
    const country = mkCountry([zero, high]);
    const cmp = svc.calculateAll(country, 50000);
    expect(cmp.regimes.length).toBe(2);
    expect(cmp.best.regimeId).toBe('zero');
    expect(cmp.best.net).toBeCloseTo(50000);
  });

  it('calculateAll with single regime → best = only regime', () => {
    const regime = mkRegime({ pit: { kind: 'flat', appliesTo: 'gross', rate: 0.20 } });
    const cmp = svc.calculateAll(mkCountry([regime]), 100000);
    expect(cmp.regimes.length).toBe(1);
    expect(cmp.best.regimeId).toBe('r1');
  });
});
