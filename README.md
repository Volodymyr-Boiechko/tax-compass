# Tax Compass

A structured personal tax and immigration data set covering **147 jurisdictions worldwide**, compiled from EY and cross-verified against PwC. Built to power a web app that helps individuals compare effective tax rates when deciding where to live and work.

---

## Data

### `data/countries.json` — primary data source

Single JSON file containing all 147 country profiles. Schema:

```json
{
  "generatedAt": "2026-05-31",
  "sourceCount": 147,
  "primarySource": "EY Worldwide Personal Tax and Immigration Guide 2025-26",
  "verificationSource": "PwC Worldwide Tax Summaries",
  "countries": [
    {
      "code": "es",
      "name": "Spain",
      "flag": "🇪🇸",
      "region": "southern-europe",
      "confidence": "high",
      "lastReviewed": "2025-10-01",
      "personalIncomeTax": {
        "topRate": 0.47,
        "brackets": [{ "from": 0, "to": 12450, "rate": 0.19 }, "..."],
        "currency": "EUR"
      },
      "socialSecurity": {
        "employeeRate": 0.065,
        "annualCap": 61214
      },
      "specialRegimes": [
        { "name": "Beckham Law", "rate": 0.24 }
      ],
      "effectiveRates": {
        "employment": { "30k": 0.18, "60k": 0.28, "100k": 0.36 },
        "bestSelfEmployment": { "30k": 0.22, "60k": 0.32, "100k": 0.38, "regime": "Autónomo" }
      },
      "changes2026": ["..."],
      "knownGaps": ["..."],
      "crossVerification": { "status": "confirmed", "verdict": "..." },
      "sources": { "ey": "pp.1433-1449", "pwc": "https://taxsummaries.pwc.com/..." }
    }
  ]
}
```

**Confidence levels:** `high` (105 countries), `medium-high` (18), `medium` (21), `low` (3)

**Regions:** africa, caribbean, central-america, central-asia, east-asia, eastern-europe, middle-east, north-america, northern-europe, pacific, south-america, south-asia, southeast-asia, southern-europe, western-europe

### `data/extracted/` — quality-assurance records

| File | Purpose |
|---|---|
| `verification-report.md` | EY vs PwC cross-check results; 86% agreement across 147 countries |
| `global-summary.md` | Executive summary of all 147 countries |
| `pdf-index-full.md` | EY PDF page index by country |

### `data/sources/`

- `ey-worldwide-tax-2025-26.pdf` — source PDF (EY Worldwide Personal Tax and Immigration Guide 2025-26, data as of 1 October 2025)

---

## Data Quality

- **Primary source:** EY Worldwide Personal Tax and Immigration Guide 2025-26 (October 2025)
- **Cross-verification:** PwC Worldwide Tax Summaries (fetched May 2026)
- **4 major discrepancies fixed:** Greece (Law 5246/2025 bracket restructure), Nigeria (Finance Act 2025), Finland (expat flat rate 32%→25%), Egypt (SS rates transposed)
- **14 partial mismatches resolved:** indexation updates (Germany, Cyprus, Isle of Man, Malta, Portugal, Peru), source lag (Barbados, Pakistan non-salaried 35%→45%, Isle of Man allowance), presentation clarifications (Costa Rica, Korea, Ecuador)

---

## Archive

- **Branch `data-archive`** — contains all 147 raw markdown profiles (`data/extracted/per-country/*.md`) with full extraction and verification history
- **Tag `pre-cleanup-2026-05-31`** — snapshot of HEAD before this cleanup; full 326-commit history recoverable

---

## Scripts

| Script | Purpose |
|---|---|
| `scripts/generate-json.js` | Regenerates `data/countries.json` from per-country markdown |
| `scripts/validate-json.js` | Validates JSON structure and field coverage |

To regenerate:
```bash
node scripts/generate-json.js
node scripts/validate-json.js
```

---

## Next Steps

- **`apps/web/`** — Angular app (to be scaffolded)
  - Country comparison table
  - Effective rate calculator at custom income
  - Filter by region, confidence, special regime availability
  - Special regime deep-dives (Non-Dom, NHR/IFICI, Georgia SBS, Romania PFA, etc.)
