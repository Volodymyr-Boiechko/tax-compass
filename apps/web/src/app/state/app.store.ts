import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CountriesService } from '../core/services/countries.service';
import { Country } from '../core/models/country.model';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private countriesService = inject(CountriesService);

  readonly countries = signal<Country[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly countryCount = computed(() => this.countries().length);

  readonly byRegion = computed(() => {
    const map = new Map<string, Country[]>();
    for (const c of this.countries()) {
      const list = map.get(c.region) ?? [];
      list.push(c);
      map.set(c.region, list);
    }
    return map;
  });

  readonly regionCount = computed(() => this.byRegion().size);

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
