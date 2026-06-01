import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CountriesService } from '../core/services/countries.service';
import { Country, Confidence, Region } from '../core/models/country.model';
import { RegimeCalculationService } from '../core/services/regime-calculation.service';

const EU_COUNTRY_CODES = new Set([
  'at','be','bg','hr','cy','cz','dk','ee','fi','fr',
  'de','gr','hu','ie','it','lv','lt','lu','mt','nl',
  'pl','pt','ro','sk','si','es','se',
]);

const TAX_HAVEN_CODES = new Set([
  'bs','bm','ky','vg','gg','im','je','mc','ad','mt',
  'cy','ae','bh','qa',
]);

export type SortField =
  | 'name'
  | 'employment30k'
  | 'employment60k'
  | 'employment100k'
  | 'bestSE60k'
  | 'topPIT';

export type SortDir = 'asc' | 'desc';

export interface PrecomputedRates {
  e30k: number | null;
  e60k: number | null;
  e100k: number | null;
  se60k: number | null;
}

@Injectable({ providedIn: 'root' })
export class AppStore {
  private countriesService = inject(CountriesService);
  private regimeCalc = inject(RegimeCalculationService);

  // --- Raw data ---
  readonly countries = signal<Country[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // --- Filters ---
  readonly searchQuery = signal<string>('');
  readonly selectedRegions = signal<Region[]>([]);
  readonly selectedConfidence = signal<Confidence[]>([]);
  readonly quickFilter = signal<string | null>(null);
  readonly myList = signal<string[]>([]);

  // --- Sort ---
  readonly sortField = signal<SortField>('employment60k');
  readonly sortDir = signal<SortDir>('asc');

  // --- Precomputed rates from regimes (used for static ranking table + sort) ---
  readonly precomputedRates = computed(() => {
    const map = new Map<string, PrecomputedRates>();
    for (const c of this.countries()) {
      const r30 = this.regimeCalc.calculateAll(c, 30000);
      const r60 = this.regimeCalc.calculateAll(c, 60000);
      const r100 = this.regimeCalc.calculateAll(c, 100000);
      const empl30 = r30.regimes.find(r => r.regimeType === 'employment') ?? r30.best;
      const empl60 = r60.regimes.find(r => r.regimeType === 'employment') ?? r60.best;
      const empl100 = r100.regimes.find(r => r.regimeType === 'employment') ?? r100.best;
      const se60 = r60.regimes
        .filter(r => r.regimeType === 'self-employment')
        .reduce<typeof r60.regimes[0] | null>((b, r) => (!b || r.net > b.net ? r : b), null)
        ?? r60.best;
      map.set(c.code, {
        e30k: empl30.effectiveRate,
        e60k: empl60.effectiveRate,
        e100k: empl100.effectiveRate,
        se60k: se60.effectiveRate,
      });
    }
    return map;
  });

  // --- Computed stats ---
  readonly countryCount = computed(() => this.countries().length);

  readonly byRegion = computed(() => {
    const map = new Map<Region, Country[]>();
    for (const c of this.countries()) {
      const list = map.get(c.region) ?? [];
      list.push(c);
      map.set(c.region, list);
    }
    return map;
  });

  readonly allRegions = computed<Region[]>(() =>
    ([...this.byRegion().keys()] as Region[]).sort()
  );

  readonly regionCount = computed(() => this.byRegion().size);

  // --- Filtered + sorted dataset ---
  readonly filteredCountries = computed<Country[]>(() => {
    let list = this.countries();
    const rates = this.precomputedRates();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }

    const regions = this.selectedRegions();
    if (regions.length) {
      list = list.filter(c => regions.includes(c.region));
    }

    const confidence = this.selectedConfidence();
    if (confidence.length) {
      list = list.filter(
        c => c.confidence != null && confidence.includes(c.confidence)
      );
    }

    const qf = this.quickFilter();
    if (qf === 'zero-tax') {
      list = list.filter(c => (rates.get(c.code)?.e60k ?? 1) < 0.01);
    } else if (qf === 'eu') {
      list = list.filter(c => EU_COUNTRY_CODES.has(c.code));
    } else if (qf === 'my-list') {
      const ml = this.myList();
      list = list.filter(c => ml.includes(c.code));
    } else if (qf === 'tax-havens') {
      list = list.filter(c => TAX_HAVEN_CODES.has(c.code));
    }

    const field = this.sortField();
    const dir = this.sortDir();

    const val = (c: Country): number | string | null => {
      switch (field) {
        case 'name':
          return c.name;
        case 'employment30k':
          return rates.get(c.code)?.e30k ?? null;
        case 'employment60k':
          return rates.get(c.code)?.e60k ?? null;
        case 'employment100k':
          return rates.get(c.code)?.e100k ?? null;
        case 'bestSE60k':
          return rates.get(c.code)?.se60k ?? null;
        case 'topPIT':
          return c.personalIncomeTax?.topRate ?? null;
      }
    };

    return [...list].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      // Nulls always last regardless of direction
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv);
        return dir === 'asc' ? cmp : -cmp;
      }
      const diff = (av as number) - (bv as number);
      return dir === 'asc' ? diff : -diff;
    });
  });

  readonly filteredCount = computed(() => this.filteredCountries().length);

  // --- UI State ---
  readonly selectedCountry = signal<Country | null>(null);
  readonly activeView = signal<'table' | 'map'>('table');
  readonly showComparison = signal<boolean>(false);
  readonly sidebarOpen = signal<boolean>(false);

  // --- Income ---
  readonly userIncome = signal<number | null>(null);

  // --- Comparison ---
  readonly comparedCodes = signal<string[]>([]);

  readonly comparedCountries = computed(() =>
    this.comparedCodes()
      .map(code => this.countries().find(c => c.code === code))
      .filter((c): c is Country => c !== undefined)
  );

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.searchQuery().trim()) n++;
    if (this.selectedRegions().length) n++;
    if (this.selectedConfidence().length) n++;
    if (this.quickFilter()) n++;
    return n;
  });

  constructor() {
    this.loadComparison();
    this.loadIncome();
    this.loadActiveView();
    this.loadMyList();
  }

  // --- Actions ---
  setSearch(q: string): void {
    this.searchQuery.set(q);
  }

  setRegions(regions: Region[]): void {
    this.selectedRegions.set(regions);
  }

  setConfidence(confidence: Confidence[]): void {
    this.selectedConfidence.set(confidence);
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedRegions.set([]);
    this.selectedConfidence.set([]);
    this.quickFilter.set(null);
  }

  setQuickFilter(filter: string | null): void {
    if (filter !== null) {
      this.searchQuery.set('');
      this.selectedRegions.set([]);
      this.selectedConfidence.set([]);
    }
    this.quickFilter.set(filter);
  }

  toggleMyList(code: string): void {
    const current = this.myList();
    this.myList.set(
      current.includes(code) ? current.filter(c => c !== code) : [...current, code]
    );
    this.saveMyList();
  }

  isInMyList(code: string): boolean {
    return this.myList().includes(code);
  }

  selectCountry(country: Country | null): void {
    this.selectedCountry.set(country);
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void  { this.sidebarOpen.set(false); }

  setActiveView(view: 'table' | 'map'): void {
    this.activeView.set(view);
    try { localStorage.setItem('tax-compass-view', view); } catch {}
  }

  openComparison(): void { this.showComparison.set(true); }
  closeComparison(): void { this.showComparison.set(false); }

  private loadActiveView(): void {
    try {
      const v = localStorage.getItem('tax-compass-view');
      if (v === 'table' || v === 'map') this.activeView.set(v);
    } catch {}
  }

  setIncome(value: number | null): void {
    this.userIncome.set(value);
    this.saveIncome();
  }

  addToComparison(code: string): boolean {
    const current = this.comparedCodes();
    if (current.includes(code)) return false;
    if (current.length >= 3) return false;
    this.comparedCodes.set([...current, code]);
    this.saveComparison();
    return true;
  }

  removeFromComparison(code: string): void {
    this.comparedCodes.set(this.comparedCodes().filter(c => c !== code));
    this.saveComparison();
  }

  clearComparison(): void {
    this.comparedCodes.set([]);
    this.saveComparison();
  }

  isInComparison(code: string): boolean {
    return this.comparedCodes().includes(code);
  }

  canAddMore(): boolean {
    return this.comparedCodes().length < 3;
  }

  private saveIncome(): void {
    try {
      const v = this.userIncome();
      if (v === null) {
        localStorage.removeItem('tax-compass-income');
      } else {
        localStorage.setItem('tax-compass-income', String(v));
      }
    } catch { /* ignore */ }
  }

  private loadIncome(): void {
    try {
      const stored = localStorage.getItem('tax-compass-income');
      if (stored) {
        const n = Number(stored);
        if (!isNaN(n) && n > 0) this.userIncome.set(n);
      }
    } catch { /* ignore */ }
  }

  private saveMyList(): void {
    try {
      localStorage.setItem('tax-compass-my-list', JSON.stringify(this.myList()));
    } catch {}
  }

  private loadMyList(): void {
    try {
      const stored = localStorage.getItem('tax-compass-my-list');
      if (stored) {
        const codes = JSON.parse(stored);
        if (Array.isArray(codes)) {
          this.myList.set(codes.filter(c => typeof c === 'string'));
        }
      }
    } catch {}
  }

  private saveComparison(): void {
    try {
      localStorage.setItem('tax-compass-comparison', JSON.stringify(this.comparedCodes()));
    } catch {
      // ignore quota errors
    }
  }

  private loadComparison(): void {
    try {
      const stored = localStorage.getItem('tax-compass-comparison');
      if (stored) {
        const codes = JSON.parse(stored);
        if (Array.isArray(codes)) {
          this.comparedCodes.set(codes.filter(c => typeof c === 'string').slice(0, 3));
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.countriesService.loadCountries());
      this.countries.set(data.countries);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.loading.set(false);
    }
  }
}
