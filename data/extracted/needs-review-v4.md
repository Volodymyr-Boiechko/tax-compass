# Needs Review — v4 Cross-Verification Findings

Generated: 2026-05-31  
Source: PwC Worldwide Tax Summaries cross-verification of 15 countries (Ghana–Isle of Man batch)

---

## 🚨 Major Discrepancies (structural bracket changes)

### Greece — PIT Bracket Scale Replaced by Law 5246/2025

**File:** `data/extracted/per-country/greece-2026.md`  
**Issue:** EY (October 2025 data) shows a 5-bracket scale where 44% applies above EUR 40,001. PwC (2026 data) confirms a **new 6-bracket scale** enacted under Law 5246/2025 where:
- Old scale (EY): 9% / 22% / 28% / 36% / **44%** (above EUR 40,001)
- New scale (PwC): 9% / 20% / 26% / 34% / 39% / **44%** (above EUR 60,001)

The 44% top rate is unchanged but now applies above EUR 60,001 instead of EUR 40,001. All intermediate rates are lower. This is a significant reduction for taxpayers earning EUR 40k–60k (who now pay 39% instead of 44% on that band). EY explicitly warned "changes to the tax law were expected as of 2026."

**Action required:** Update greece-2026.md effective rate calculations using the new 6-bracket scale.

---

## ⚠️ Partial Mismatches (threshold updates, <10% difference)

### Isle of Man — Personal Allowance Increased for 2026/27

**File:** `data/extracted/per-country/isle-of-man-2026.md`  
**Issue:** EY shows personal allowance GBP 14,750 (tax year 2025/26, effective 6 April 2025). PwC shows GBP 17,000 (likely tax year 2026/27, effective 6 April 2026). This is a +GBP 2,250 / +15.3% increase.

**Action required:** Confirm from Isle of Man Treasury whether GBP 17,000 applies from 6 April 2026 (tax year 2026/27); update isle-of-man-2026.md if confirmed.

---

### Guyana — Bracket Thresholds Updated ~+7.7%

**File:** `data/extracted/per-country/guyana-2026.md`  
**Issue:** PwC shows updated 2026 figures:
- 35% bracket threshold: GYD 3,360,000 (EY: GYD 3,120,000, +7.7%)
- Personal allowance: GYD 1,680,000 (EY: GYD 1,560,000, +7.7%)

Rates unchanged (25%/35%). Consistent with annual inflationary indexation.

**Action required:** Update guyana-2026.md bracket thresholds and effective rate calculations to reflect 2026 GYD figures.

---

### Honduras — Bracket Thresholds Updated ~+5%

**File:** `data/extracted/per-country/honduras-2026.md`  
**Issue:** PwC shows updated 2026 bracket thresholds approximately 5% higher than EY's figures:
- Zero-rate band: HNL 228,324.32 (EY: HNL 217,493.16)
- 15% band upper limit: HNL 348,154.10 (EY: HNL 331,638.50)
- 20% band upper limit: HNL 809,660.75 (EY: HNL 771,252.38)

Rates unchanged (0%/15%/20%/25%). EY flagged brackets as "subject to change by the government."

**Action required:** Update honduras-2026.md bracket thresholds and effective rate calculations to reflect 2026 HNL figures.

---

## ✅ Countries with No Issues (confirmed)

| Country | Verdict |
|---|---|
| Ghana | ✅ confirmed |
| Gibraltar | ✅ confirmed |
| Guatemala | ✅ confirmed |
| Guernsey | ✅ confirmed |
| Hong Kong SAR | ✅ confirmed (standard rate 15% confirmed) |
| Hungary | ✅ confirmed (flat 15% confirmed) |
| India | ✅ confirmed (new regime default confirmed) |
| Indonesia | ✅ confirmed |
| Iraq | ✅ confirmed |
| Ireland | ✅ confirmed (SARP EUR 125,000 threshold confirmed) |

## ℹ️ Not Covered by PwC

| Country | Status |
|---|---|
| Guam | Not covered — taxsummaries.pwc.com/guam returns HTTP 404 (US territory) |
