import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { CurrencyService } from './currency.service';

const LS_CURRENCY = 'tax-compass-currency';
const LS_PERIOD   = 'tax-compass-period';
const LS_FX       = 'tax-compass-fx';

describe('CurrencyService', () => {
  let lsStore: Record<string, string>;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    lsStore = {};
    spyOn(localStorage, 'getItem').and.callFake((k: string) => lsStore[k] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((k: string, v: string) => { lsStore[k] = v; });
    spyOn(localStorage, 'removeItem').and.callFake((k: string) => { delete lsStore[k]; });

    // Default: fetch returns no USD/UAH → triggers fallback path
    fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({ json: () => Promise.resolve({ rates: {} }) } as any),
    );

    TestBed.configureTestingModule({});
  });

  function svc(): CurrencyService { return TestBed.inject(CurrencyService); }

  // ── fromEUR / toEUR ──────────────────────────────────────────────────────

  describe('fromEUR / toEUR', () => {
    it('EUR → EUR is identity', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.fromEUR(1000)).toBe(1000);
      expect(service.toEUR(1000)).toBe(1000);
    }));

    it('fromEUR(EUR, USD) uses USD rate', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      // fallback USD rate = 1.08
      expect(service.fromEUR(1000, 'USD')).toBeCloseTo(1080);
    }));

    it('toEUR(amount, UAH) divides by UAH rate', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      // fallback UAH rate = 45
      expect(service.toEUR(45000, 'UAH')).toBeCloseTo(1000);
    }));

    it('fromEUR → toEUR round-trips', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      const converted = service.fromEUR(5000, 'USD');
      expect(service.toEUR(converted, 'USD')).toBeCloseTo(5000);
    }));
  });

  // ── format ───────────────────────────────────────────────────────────────

  describe('format', () => {
    it('null → "—"', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(null)).toBe('—');
    }));

    it('undefined → "—"', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(undefined)).toBe('—');
    }));

    it('EUR: symbol before number', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(1000)).toBe('€1,000');
    }));

    it('UAH: symbol after number', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      // 1000 EUR × 45 = 45,000 UAH
      expect(service.format(1000, { code: 'UAH' })).toBe('45,000₴');
    }));

    it('monthly divides by 12', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      // 12000 / 12 = 1000 → €1,000
      expect(service.format(12000, { monthly: true })).toBe('€1,000');
    }));

    it('signed positive → + prefix', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(1000, { signed: true })).toBe('+€1,000');
    }));

    it('signed negative → − prefix', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(-1000, { signed: true })).toBe('−€1,000');
    }));

    it('signed zero → symbol + 0', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.format(0, { signed: true })).toBe('€0');
    }));
  });

  // ── equivalentsLine ───────────────────────────────────────────────────────

  describe('equivalentsLine', () => {
    it('null → empty string', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      expect(service.equivalentsLine(null)).toBe('');
    }));

    it('active EUR → shows UAH only (EUR filtered out)', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      // REFERENCE_CURRENCIES = ['EUR', 'UAH'], active = EUR → only UAH shown
      const line = service.equivalentsLine(1000);
      expect(line.startsWith('≈')).toBeTrue();
      expect(line).toContain('₴');
      expect(line).not.toContain('€');
    }));

    it('active UAH → shows EUR only', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setCurrency('UAH');
      const line = service.equivalentsLine(1000);
      expect(line).toContain('€');
      expect(line).not.toContain('₴');
    }));

    it('active USD → shows EUR and UAH', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setCurrency('USD');
      const line = service.equivalentsLine(1000);
      expect(line).toContain('€');
      expect(line).toContain('₴');
    }));
  });

  // ── setCurrency / setPeriod ───────────────────────────────────────────────

  describe('setCurrency', () => {
    it('updates signal', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setCurrency('USD');
      expect(service.currency()).toBe('USD');
    }));

    it('persists to localStorage', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setCurrency('UAH');
      expect(lsStore[LS_CURRENCY]).toBe('UAH');
    }));
  });

  describe('setPeriod', () => {
    it('updates signal', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setPeriod('monthly');
      expect(service.period()).toBe('monthly');
    }));

    it('persists to localStorage', fakeAsync(() => {
      const service = svc();
      flushMicrotasks();
      service.setPeriod('monthly');
      expect(lsStore[LS_PERIOD]).toBe('monthly');
    }));
  });

  // ── loadPrefs ─────────────────────────────────────────────────────────────

  describe('loadPrefs', () => {
    it('loads saved currency on construction', fakeAsync(() => {
      lsStore[LS_CURRENCY] = 'UAH';
      const service = svc();
      flushMicrotasks();
      expect(service.currency()).toBe('UAH');
    }));

    it('loads saved period on construction', fakeAsync(() => {
      lsStore[LS_PERIOD] = 'monthly';
      const service = svc();
      flushMicrotasks();
      expect(service.period()).toBe('monthly');
    }));

    it('ignores invalid currency value', fakeAsync(() => {
      lsStore[LS_CURRENCY] = 'GBP';
      const service = svc();
      flushMicrotasks();
      expect(service.currency()).toBe('EUR');
    }));

    it('ignores invalid period value', fakeAsync(() => {
      lsStore[LS_PERIOD] = 'weekly';
      const service = svc();
      flushMicrotasks();
      expect(service.period()).toBe('annual');
    }));
  });

  // ── loadCache ─────────────────────────────────────────────────────────────

  describe('loadCache', () => {
    it('valid cache → status live before fetch resolves', fakeAsync(() => {
      lsStore[LS_FX] = JSON.stringify({
        rates: { EUR: 1, USD: 1.07, UAH: 43 },
        ts: Date.now(),
      });
      const service = svc();
      // loadCache runs synchronously in constructor → already live
      expect(service.ratesStatus()).toBe('live');
      expect(service.rates()['USD']).toBeCloseTo(1.07);
      flushMicrotasks();
    }));

    it('stale cache (older than 12h) → ignored', fakeAsync(() => {
      const twelvePlusHours = 13 * 60 * 60 * 1000;
      lsStore[LS_FX] = JSON.stringify({
        rates: { EUR: 1, USD: 1.07, UAH: 43 },
        ts: Date.now() - twelvePlusHours,
      });
      const service = svc();
      // Cache invalid → status still 'loading' until refreshRates resolves
      expect(service.ratesStatus()).toBe('loading');
      flushMicrotasks();
      // fetch returned bad data → fallback
      expect(service.ratesStatus()).toBe('fallback');
    }));
  });

  // ── refreshRates ──────────────────────────────────────────────────────────

  describe('refreshRates', () => {
    it('success → status live, rates and timestamp updated', fakeAsync(() => {
      fetchSpy.and.returnValue(Promise.resolve({
        json: () => Promise.resolve({
          rates: { USD: 1.09, UAH: 42 },
          time_last_update_unix: 1700000000,
        }),
      } as any));

      const service = svc();
      flushMicrotasks();

      expect(service.ratesStatus()).toBe('live');
      expect(service.rates()['USD']).toBeCloseTo(1.09);
      expect(service.rates()['UAH']).toBeCloseTo(42);
      expect(service.ratesUpdatedAt()).toBe(1700000000 * 1000);
    }));

    it('success → saves to localStorage', fakeAsync(() => {
      fetchSpy.and.returnValue(Promise.resolve({
        json: () => Promise.resolve({
          rates: { USD: 1.09, UAH: 42 },
          time_last_update_unix: 1700000000,
        }),
      } as any));

      svc();
      flushMicrotasks();

      expect(lsStore[LS_FX]).toBeDefined();
      const saved = JSON.parse(lsStore[LS_FX]);
      expect(saved.rates['USD']).toBeCloseTo(1.09);
    }));

    it('network error → status fallback', fakeAsync(() => {
      fetchSpy.and.returnValue(Promise.reject(new Error('Network error')));
      const service = svc();
      flushMicrotasks();
      expect(service.ratesStatus()).toBe('fallback');
    }));

    it('bad data (no USD/UAH in rates) → status fallback', fakeAsync(() => {
      fetchSpy.and.returnValue(Promise.resolve({
        json: () => Promise.resolve({ rates: { GBP: 0.85 } }),
      } as any));
      const service = svc();
      flushMicrotasks();
      expect(service.ratesStatus()).toBe('fallback');
    }));

    it('fallback uses hardcoded rates', fakeAsync(() => {
      fetchSpy.and.returnValue(Promise.reject(new Error('offline')));
      const service = svc();
      flushMicrotasks();
      expect(service.rates()['EUR']).toBe(1);
      expect(service.rates()['USD']).toBeCloseTo(1.08);
      expect(service.rates()['UAH']).toBeCloseTo(45);
    }));

    it('does not downgrade live status to fallback after fetch error', fakeAsync(() => {
      // Cache is valid → sets status to 'live'
      lsStore[LS_FX] = JSON.stringify({ rates: { EUR: 1, USD: 1.05, UAH: 43 }, ts: Date.now() });
      fetchSpy.and.returnValue(Promise.reject(new Error('offline')));

      const service = svc();
      flushMicrotasks();

      // applyFallback() guards: only applies when status !== 'live'
      expect(service.ratesStatus()).toBe('live');
    }));
  });
});
