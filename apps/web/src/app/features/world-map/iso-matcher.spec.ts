import { matchGeoFeature, logCoverageWarnings } from './iso-matcher';

// Helper to build GeoJSON-style properties
function props(iso2: string, iso3: string, name: string): Record<string, unknown> {
  return { 'ISO3166-1-Alpha-2': iso2, 'ISO3166-1-Alpha-3': iso3, name };
}

describe('matchGeoFeature', () => {

  // ── Strategy 1: ISO-2 direct match ──────────────────────────────────────────

  it('ISO-2 uppercase 2-letter → lowercase code', () => {
    expect(matchGeoFeature(props('DE', 'DEU', 'Germany'))).toBe('de');
  });

  it('ISO-2 for Spain', () => {
    expect(matchGeoFeature(props('ES', 'ESP', 'Spain'))).toBe('es');
  });

  it('ISO-2 for Portugal', () => {
    expect(matchGeoFeature(props('PT', 'PRT', 'Portugal'))).toBe('pt');
  });

  it('ISO-2 "-99" is rejected (falls through to ISO-3)', () => {
    // Taiwan has ISO2=CN-TW and ISO3=TWN → should match via ISO3
    expect(matchGeoFeature(props('CN-TW', 'TWN', 'Taiwan'))).toBe('tw');
  });

  it('ISO-2 non-standard value is rejected', () => {
    // Arbitrary non-standard ISO2 with a valid ISO3
    expect(matchGeoFeature(props('XX-YY', 'FRA', 'France'))).toBe('fr');
  });

  // ── Strategy 2: ISO-3 lookup ─────────────────────────────────────────────────

  it('ISO-3 TWN → tw (Taiwan; ISO2 is non-standard "CN-TW")', () => {
    expect(matchGeoFeature(props('CN-TW', 'TWN', 'Taiwan'))).toBe('tw');
  });

  it('ISO-3 FRA → fr', () => {
    expect(matchGeoFeature(props('-99', 'FRA', 'France'))).toBe('fr');
  });

  it('ISO-3 USA → us', () => {
    expect(matchGeoFeature(props('-99', 'USA', 'United States'))).toBe('us');
  });

  it('ISO-3 KOR → kr', () => {
    expect(matchGeoFeature(props('-99', 'KOR', 'South Korea'))).toBe('kr');
  });

  it('ISO-3 "-99" is skipped; falls through to name', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Kosovo'))).toBe('xk');
  });

  // ── Strategy 3: name-based fallback ─────────────────────────────────────────

  it('name "france" → fr (actual GeoJSON case: both ISO fields = -99)', () => {
    expect(matchGeoFeature(props('-99', '-99', 'France'))).toBe('fr');
  });

  it('name "norway" → no', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Norway'))).toBe('no');
  });

  it('name "kosovo" → xk', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Kosovo'))).toBe('xk');
  });

  it('alias "Czechia" → cz', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Czechia'))).toBe('cz');
  });

  it('alias "Czech Republic" → cz', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Czech Republic'))).toBe('cz');
  });

  it('alias "Russian Federation" → ru', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Russian Federation'))).toBe('ru');
  });

  it('alias "United Kingdom" → gb', () => {
    expect(matchGeoFeature(props('-99', '-99', 'United Kingdom'))).toBe('gb');
  });

  it('alias "Republic of Korea" → kr', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Republic of Korea'))).toBe('kr');
  });

  it('name is matched case-insensitively', () => {
    expect(matchGeoFeature(props('-99', '-99', 'FRANCE'))).toBe('fr');
    expect(matchGeoFeature(props('-99', '-99', 'france'))).toBe('fr');
  });

  it('leading/trailing whitespace in name is stripped', () => {
    expect(matchGeoFeature(props('-99', '-99', '  Norway  '))).toBe('no');
  });

  // ── Garbage / unknown input → undefined ──────────────────────────────────────

  it('non-standard ISO2 with unknown ISO3 and unknown name → undefined', () => {
    // 'X9' has a digit so it fails the /^[A-Z]{2}$/ test; 'ZZZ' is not in ISO3_TO_CODE
    expect(matchGeoFeature(props('X9', 'ZZZ', 'Atlantis'))).toBeUndefined();
  });

  it('unknown name with -99 ISO fields → undefined', () => {
    expect(matchGeoFeature(props('-99', '-99', 'Narnia'))).toBeUndefined();
  });

  it('empty properties → undefined', () => {
    expect(matchGeoFeature({})).toBeUndefined();
  });

  it('null ISO2 and unknown name → undefined', () => {
    expect(matchGeoFeature({ 'ISO3166-1-Alpha-2': null, 'ISO3166-1-Alpha-3': null, name: 'Wakanda' })).toBeUndefined();
  });
});

// ── logCoverageWarnings ──────────────────────────────────────────────────────

describe('logCoverageWarnings', () => {
  let warnSpy: jasmine.Spy;

  beforeEach(() => {
    warnSpy = spyOn(console, 'warn');
  });

  it('emits no warning when all dataset codes are covered', () => {
    const features = [
      { properties: props('DE', 'DEU', 'Germany') },
      { properties: props('ES', 'ESP', 'Spain') },
    ];
    logCoverageWarnings(['de', 'es'], features);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when a dataset code has no matching feature', () => {
    const features = [{ properties: props('DE', 'DEU', 'Germany') }];
    logCoverageWarnings(['de', 'xk'], features);
    expect(warnSpy).toHaveBeenCalledWith(
      jasmine.stringContaining('[TaxCompass]'),
      jasmine.arrayContaining(['xk']),
    );
  });

  it('handles features with null properties gracefully', () => {
    const features = [
      { properties: null },
      { properties: props('DE', 'DEU', 'Germany') },
    ];
    expect(() => logCoverageWarnings(['de'], features)).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns for each unmatched code', () => {
    logCoverageWarnings(['xy', 'zz'], []);
    const [, unmatched] = warnSpy.calls.mostRecent().args;
    expect(unmatched).toContain('xy');
    expect(unmatched).toContain('zz');
  });
});
