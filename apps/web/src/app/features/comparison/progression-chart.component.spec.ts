import { TestBed } from '@angular/core/testing';
import { RegimeCalculationService } from '../../core/services/regime-calculation.service';
import {
  buildSeries,
  CHART_MAX_GROSS,
  CHART_STEP,
  ChartMetric,
} from './progression-chart.component';
import { Country, ComputableRegime } from '../../core/models/country.model';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function mkRegime(overrides: Partial<ComputableRegime> = {}): ComputableRegime {
  return {
    id: 'r1',
    name: 'Test',
    type: 'employment',
    pit: { kind: 'flat', appliesTo: 'gross', rate: 0.20 },
    socialSecurity: { kind: 'none' },
    ...overrides,
  } as ComputableRegime;
}

function mkCountry(overrides: Partial<Country> = {}): Country {
  return {
    code: 'ts',
    name: 'Testland',
    flag: null,
    region: 'western-europe',
    confidence: 'high',
    lastReviewed: null,
    personalIncomeTax: { topRate: 0.20, brackets: null, currency: null },
    socialSecurity: null,
    specialRegimes: null,
    changes2026: [],
    knownGaps: [],
    crossVerification: null,
    sources: null,
    computableRegimes: [mkRegime()],
    ...overrides,
  };
}

const COUNTRY_FLAT20 = mkCountry();
const COUNTRY_ZERO   = mkCountry({ code: 'z0', computableRegimes: [mkRegime({ id: 'r2', pit: { kind: 'zero', appliesTo: 'gross' } })] });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildSeries', () => {
  let calc: RegimeCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    calc = TestBed.inject(RegimeCalculationService);
  });

  function build(countries: Country[], metric: ChartMetric, maxGross = CHART_MAX_GROSS, step = CHART_STEP) {
    return buildSeries(countries, calc, { metric, maxGross, step });
  }

  // ── Point count ───────────────────────────────────────────────────────────

  it('produces maxGross/step + 1 points (includes x=0)', () => {
    const expected = CHART_MAX_GROSS / CHART_STEP + 1;
    expect(build([COUNTRY_FLAT20], 'rate')[0].points.length).toBe(expected);
  });

  it('respects custom maxGross and step', () => {
    const series = build([COUNTRY_FLAT20], 'rate', 10_000, 1_000);
    expect(series[0].points.length).toBe(11);
    expect(series[0].points[10].x).toBe(10_000);
  });

  // ── Monotonic X ───────────────────────────────────────────────────────────

  it('x values increase monotonically by CHART_STEP', () => {
    const pts = build([COUNTRY_FLAT20], 'rate')[0].points;
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x - pts[i - 1].x).toBe(CHART_STEP);
    }
  });

  it('first point has x = 0', () => {
    expect(build([COUNTRY_FLAT20], 'rate')[0].points[0].x).toBe(0);
  });

  it('last point has x = CHART_MAX_GROSS', () => {
    const pts = build([COUNTRY_FLAT20], 'rate')[0].points;
    expect(pts[pts.length - 1].x).toBe(CHART_MAX_GROSS);
  });

  // ── Rate mode: y ∈ [0, 1] ────────────────────────────────────────────────

  it('rate values are in [0, 1]', () => {
    const pts = build([COUNTRY_FLAT20], 'rate')[0].points;
    for (const { y } of pts) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('x=0 point has y=0 in rate mode', () => {
    expect(build([COUNTRY_FLAT20], 'rate')[0].points[0].y).toBe(0);
  });

  it('flat 20% regime → effective rate approaches 0.20 at high income', () => {
    const pts = build([COUNTRY_FLAT20], 'rate')[0].points;
    const last = pts[pts.length - 1];
    expect(last.y).toBeCloseTo(0.20, 5);
  });

  it('zero-tax regime → rate = 0 at all points', () => {
    const pts = build([COUNTRY_ZERO], 'rate')[0].points;
    for (const { y } of pts) {
      expect(y).toBe(0);
    }
  });

  // ── Net mode: net ≤ gross ─────────────────────────────────────────────────

  it('net income never exceeds gross at any sample point', () => {
    const pts = build([COUNTRY_FLAT20], 'net')[0].points;
    for (const { x, y } of pts) {
      expect(y).toBeLessThanOrEqual(x);
    }
  });

  it('x=0 point has y=0 in net mode', () => {
    expect(build([COUNTRY_FLAT20], 'net')[0].points[0].y).toBe(0);
  });

  it('zero-tax regime → net = gross at all points', () => {
    const pts = build([COUNTRY_ZERO], 'net')[0].points;
    for (const { x, y } of pts) {
      expect(y).toBeCloseTo(x, 5);
    }
  });

  it('flat 20% regime → net ≈ gross * 0.80', () => {
    const pts = build([COUNTRY_FLAT20], 'net')[0].points;
    const last = pts[pts.length - 1];
    expect(last.y).toBeCloseTo(last.x * 0.80, 5);
  });

  // ── Multiple countries ────────────────────────────────────────────────────

  it('returns one series per country', () => {
    const series = build([COUNTRY_FLAT20, COUNTRY_ZERO], 'rate');
    expect(series.length).toBe(2);
    expect(series[0].code).toBe('ts');
    expect(series[1].code).toBe('z0');
  });

  it('preserves country name and flag', () => {
    const c = mkCountry({ name: 'Foobar', flag: '🏴' });
    const s = build([c], 'rate')[0];
    expect(s.name).toBe('Foobar');
    expect(s.flag).toBe('🏴');
  });

  it('empty countries → empty series array', () => {
    expect(build([], 'rate').length).toBe(0);
  });
});
