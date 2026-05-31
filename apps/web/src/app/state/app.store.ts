import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CountriesService } from '../core/services/countries.service';
import { Country, Confidence, Region } from '../core/models/country.model';

export type SortField =
  | 'name'
  | 'employment30k'
  | 'employment60k'
  | 'employment100k'
  | 'bestSE60k'
  | 'topPIT';

export type SortDir = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private countriesService = inject(CountriesService);

  // --- Raw data ---
  readonly countries = signal<Country[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // --- Filters ---
  readonly searchQuery = signal<string>('');
  readonly selectedRegions = signal<Region[]>([]);
  readonly selectedConfidence = signal<Confidence[]>([]);

  // --- Sort ---
  readonly sortField = signal<SortField>('employment60k');
  readonly sortDir = signal<SortDir>('asc');

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

    const field = this.sortField();
    const dir = this.sortDir();

    const val = (c: Country): number | string | null => {
      switch (field) {
        case 'name':
          return c.name;
        case 'employment30k':
          return c.effectiveRates.employment['30k'];
        case 'employment60k':
          return c.effectiveRates.employment['60k'];
        case 'employment100k':
          return c.effectiveRates.employment['100k'];
        case 'bestSE60k':
          return c.effectiveRates.bestSelfEmployment['60k'];
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
    return n;
  });

  constructor() {
    this.loadComparison();
    this.loadIncome();
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
