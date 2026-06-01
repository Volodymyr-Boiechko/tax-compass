# Architecture

## Overview

Tax Compass is a single-page Angular 19 application. There is no backend — all data ships as a static JSON file fetched at runtime.

```
tax-compass/
├── apps/web/          Angular app
│   └── src/
│       ├── app/
│       │   ├── core/         Services, models, utilities
│       │   ├── features/     Feature components
│       │   ├── layout/       Shell, top-nav, sidebar
│       │   └── state/        AppStore (signal-based)
│       └── assets/
│           └── i18n/         en.json, uk.json
└── data/
    └── countries.json        Primary data source (147 countries)
```

## Data flow

```
data/countries.json
  → CountriesService (HTTP GET at startup)
  → AppStore.countries signal
  → AppStore.filteredCountries (computed, reactive)
  → RankingTableComponent / WorldMapComponent
  → CountryDetailPanelComponent (selected country)
  → RegimeCalculatorComponent (income-based live calc)
```

## RegimeCalculationService

Every country has a `computableRegimes` array describing tax rules as parameters (brackets, SS rates, deductions, caps). `RegimeCalculationService.calculateAll(country, income)` runs all regimes and returns:

```ts
{ regimes: RegimeCalculationResult[], best: RegimeCalculationResult }
```

Each result includes `net`, `effectiveRate`, `steps[]` (the calculation breakdown), and `warnings[]`. Countries without computable regimes fall back to stored EY effective rates (`isApproximation: true`).

## State management

`AppStore` is an Angular `Injectable` service built entirely on signals — no NgRx, no Redux. Reactive derived state is expressed as `computed()`:

- `filteredCountries` — applies search, region, confidence, and quick-filter signals
- `precomputedRates` — runs regime calculations at €30k/60k/100k for all countries (for the static ranking table)
- `comparedCountries` — maps comparison codes to country objects

All localStorage persistence (income, view, language, My List, comparison) lives in the respective service constructors.

## i18n

Runtime language switching via `@ngx-translate/core` v17. Translation files: `assets/i18n/en.json` and `assets/i18n/uk.json`. `LanguageService` reads `localStorage['tax-compass-language']`, falls back to `navigator.language`, and calls `TranslateService.use()` on init.

## Theming

CSS custom properties defined in `styles.scss`, swapped by toggling `[data-theme="dark"]` on `<html>`. No Tailwind `dark:` variants — all color references use `var(--color-*)`. `ThemeService` persists choice to localStorage.

## Map

Leaflet with a custom GeoJSON world map (Crimea-corrected boundaries). Countries are colored as a choropleth of employment effective rate at €60k. The GeoJSON is fetched once and cached at module scope for view toggle performance.
