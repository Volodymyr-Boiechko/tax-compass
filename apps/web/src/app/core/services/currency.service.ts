import { Injectable, signal, computed } from '@angular/core';

export type CurrencyCode = 'EUR' | 'USD' | 'UAH';
export type Period = 'annual' | 'monthly';
export type RatesStatus = 'loading' | 'live' | 'fallback';

const FALLBACK_RATES: Record<string, number> = { EUR: 1, USD: 1.08, UAH: 45 };
const FX_URL = 'https://open.er-api.com/v6/latest/EUR';
const TTL_MS = 12 * 60 * 60 * 1000;

const LS_FX       = 'tax-compass-fx';
const LS_CURRENCY = 'tax-compass-currency';
const LS_PERIOD   = 'tax-compass-period';

interface FxCache {
  rates: Record<string, number>;
  ts: number;
}

const CURRENCY_META: Record<CurrencyCode, { symbol: string; symbolBefore: boolean; locale: string }> = {
  EUR: { symbol: '€', symbolBefore: true,  locale: 'en-US' },
  USD: { symbol: '$', symbolBefore: true,  locale: 'en-US' },
  UAH: { symbol: '₴', symbolBefore: false, locale: 'uk-UA' },
};

const REFERENCE_CURRENCIES: CurrencyCode[] = ['EUR', 'UAH'];

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  readonly currency      = signal<CurrencyCode>('EUR');
  readonly period        = signal<Period>('annual');
  readonly rates         = signal<Record<string, number>>(FALLBACK_RATES);
  readonly ratesStatus   = signal<RatesStatus>('loading');
  readonly ratesUpdatedAt = signal<number | null>(null);

  readonly meta = computed(() => CURRENCY_META[this.currency()]);

  constructor() {
    this.loadPrefs();
    this.loadCache();
    this.refreshRates();
  }

  private loadPrefs(): void {
    try {
      const c = localStorage.getItem(LS_CURRENCY);
      if (c === 'EUR' || c === 'USD' || c === 'UAH') this.currency.set(c);
      const p = localStorage.getItem(LS_PERIOD);
      if (p === 'annual' || p === 'monthly') this.period.set(p);
    } catch { /* ignore */ }
  }

  private loadCache(): void {
    try {
      const raw = localStorage.getItem(LS_FX);
      if (!raw) return;
      const cache: FxCache = JSON.parse(raw);
      if (cache?.rates && Date.now() - cache.ts < TTL_MS) {
        this.rates.set({ EUR: 1, USD: cache.rates['USD'] ?? 1.08, UAH: cache.rates['UAH'] ?? 45 });
        this.ratesUpdatedAt.set(cache.ts);
        this.ratesStatus.set('live');
      }
    } catch { /* ignore */ }
  }

  async refreshRates(): Promise<void> {
    try {
      const res  = await fetch(FX_URL);
      const json = await res.json();
      if (json?.rates?.USD && json?.rates?.UAH) {
        const rates: Record<string, number> = { EUR: 1, USD: json.rates.USD, UAH: json.rates.UAH };
        const ts = (json.time_last_update_unix ?? Math.floor(Date.now() / 1000)) * 1000;
        this.rates.set(rates);
        this.ratesUpdatedAt.set(ts);
        this.ratesStatus.set('live');
        try { localStorage.setItem(LS_FX, JSON.stringify({ rates, ts })); } catch { /* ignore */ }
      } else {
        this.applyFallback();
      }
    } catch {
      this.applyFallback();
    }
  }

  private applyFallback(): void {
    if (this.ratesStatus() !== 'live') {
      this.rates.set({ ...FALLBACK_RATES });
      this.ratesStatus.set('fallback');
    }
  }

  fromEUR(eur: number, code?: CurrencyCode): number {
    const c    = code ?? this.currency();
    const rate = this.rates()[c] ?? 1;
    return eur * rate;
  }

  toEUR(amount: number, code?: CurrencyCode): number {
    const c    = code ?? this.currency();
    const rate = this.rates()[c] ?? 1;
    return amount / rate;
  }

  format(
    eur: number | null | undefined,
    opts: { monthly?: boolean; signed?: boolean; code?: CurrencyCode } = {},
  ): string {
    if (eur == null || isNaN(eur as number)) return '—';
    const c = opts.code ?? this.currency();
    const m = CURRENCY_META[c];
    let amount = this.fromEUR(eur as number, c);
    if (opts.monthly) amount = amount / 12;
    const rounded = Math.round(amount);

    if (opts.signed && rounded === 0) {
      return m.symbolBefore ? m.symbol + '0' : '0' + m.symbol;
    }

    const absStr = Math.abs(rounded).toLocaleString('en-US');
    const formatted = m.symbolBefore ? m.symbol + absStr : absStr + m.symbol;

    if (opts.signed) {
      return (rounded < 0 ? '−' : '+') + formatted;
    }
    return formatted;
  }

  equivalentsLine(eur: number | null | undefined, opts?: { monthly?: boolean }): string {
    if (eur == null || isNaN(eur as number)) return '';
    const active = this.currency();
    const parts = REFERENCE_CURRENCIES
      .filter(code => code !== active)
      .map(code => this.format(eur, { monthly: opts?.monthly, code }));
    return parts.length ? '≈ ' + parts.join(' · ') : '';
  }

  setCurrency(c: CurrencyCode): void {
    this.currency.set(c);
    try { localStorage.setItem(LS_CURRENCY, c); } catch { /* ignore */ }
  }

  setPeriod(p: Period): void {
    this.period.set(p);
    try { localStorage.setItem(LS_PERIOD, p); } catch { /* ignore */ }
  }
}
