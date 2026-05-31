import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CountriesData } from '../models/country.model';

@Injectable({ providedIn: 'root' })
export class CountriesService {
  private http = inject(HttpClient);

  loadCountries() {
    return this.http.get<CountriesData>('/assets/data/countries.json');
  }
}
