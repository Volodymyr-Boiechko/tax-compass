# Tax Compass

Side-by-side personal income tax comparison for 147 countries.

[![Production](https://img.shields.io/badge/demo-live-success)](https://tax-compass.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Demo

**https://tax-compass.vercel.app**

## What it does

- Compare net income across 147 countries for any input gross (Employment + Self-Employment)
- Models special tax regimes (Spain Beckham Law, Portugal IFICI/NHR, Italy Forfettario, Ukraine ФОП, etc.) where data is available
- 84% of countries (124/147) have detailed regime parameterization; 16% fall back to EY/PwC aggregate effective rates with clear "rough estimate" markers
- Interactive map and table views, sortable by effective rate at €30k / €60k / €100k
- Save countries to "My List" (localStorage persistent)
- Side-by-side comparison of up to 3 countries
- Mobile-responsive, dark/light theme
- Keyboard shortcuts: `/` search · `T` table · `M` map · `D` theme · `?` help · `Esc` close
- English and Ukrainian UI (EN ↔ UK toggle, persists across sessions)

## How it was built

**Stack:** Angular 19 (signals, standalone components) · Tailwind CSS v4 · Spartan UI · Leaflet (map) · TypeScript strict · ngx-translate

**Data extraction:** EY Worldwide Personal Tax Guide 2025-26 (1748-page PDF) via parallelized AI extraction across 147 country sections; cross-verified with PwC Worldwide Tax Summaries.

**Architecture:** Single source of truth — every country has a `computableRegimes` array consumed by one `RegimeCalculationService`. No duplicated data paths.

## Vibe-coded with Claude

This project was built collaboratively with [Claude](https://claude.ai), Anthropic's AI assistant, over a multi-day sprint:

- ~95% of code was AI-generated with human direction
- All data extraction (1748 PDF pages → structured JSON for 147 countries) was AI
- Architecture decisions, refactors, audit scripts — all collaborative

**What this took:**
- ~12 hours of focused human attention end-to-end
- A Claude Max subscription + a few hundred dollars of API usage

**Without AI:** This would have been weeks of work — especially the data extraction. The interesting questions become: *what direction to give the AI*, *what bugs to investigate*, *what trade-offs to make*. Implementation becomes cheap.

**Lessons learned:**
- Worktree parallelization is the secret weapon for large data tasks (extracting 147 country tax codes in parallel)
- Audit scripts pay for themselves — caught 6 SEVERE bugs before deploy (Romania showing 116%, Azerbaijan 74% effective rates)
- Single source of truth beats three competing data formats every time
- Honest "rough estimate" warnings > false precision

## Accuracy disclaimer

**For educational comparison only.** Tax laws change frequently and have many exceptions; consult a qualified tax advisor before making relocation or career decisions.

Known limitations:
- 23 countries use stored EY aggregate rates (currency-mismatch jurisdictions: Japan, Brazil, Switzerland, Sweden, etc.) — shown with a ⚠ indicator
- Spain regional variations not modeled (uses Madrid rates)
- UK Scotland uses England's bands
- US shows federal only (no state tax)
- Various edge cases (deductions, credits, allowances) approximated

## Run locally

```bash
git clone https://github.com/Volodymyr-Boiechko/tax-compass.git
cd tax-compass/apps/web
npm install
npm start
```

Open http://localhost:4200

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data

### `data/countries.json` — primary data source

Single JSON file with all 147 country profiles. Confidence levels: `high` (105), `medium-high` (18), `medium` (21), `low` (3).

### `data/extracted/` — quality-assurance records

| File | Purpose |
|---|---|
| `verification-report.md` | EY vs PwC cross-check; 86% agreement across 147 countries |
| `global-summary.md` | Executive summary of all 147 countries |
| `pre-deploy-audit-report.md` | Pre-launch audit; caught 6 severe calculation bugs |

## Contributing

Currently a personal project. PRs welcome for data corrections — please cite EY or PwC source.

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Volodymyr Boiechko](https://github.com/Volodymyr-Boiechko) · 2025–2026
