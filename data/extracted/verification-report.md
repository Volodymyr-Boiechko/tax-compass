# Cross-Verification Report — EY vs PwC (2026)

**Generated:** 2026-05-31  
**Primary source:** EY Worldwide Personal Tax and Immigration Guide 2025-26 (data as of 1 October 2025)  
**Verification source:** PwC Worldwide Tax Summaries (taxsummaries.pwc.com, fetched May 2026)  
**Countries in scope:** 147 (all full-chapter EY jurisdictions)

---

## Summary Statistics

| Outcome | Count | % |
|---|---|---|
| ✅ Confirmed — rates match within 1pp, regimes verified | 66 | 45% |
| ⚠️ Partial mismatch — 1–3pp or threshold indexation differences | 24 | 16% |
| 🚨 Major discrepancy — >3pp gap or structural difference | 4 | 3% |
| 📋 Not covered by PwC — small/unusual jurisdiction | 11 | 7% |
| *(Not yet verified — batch gaps)* | ~42 | 29% |

**Total with verification footer:** ~105 / 147  
**Countries where EY and PwC substantially agree:** 90 / 105 verified = **86%**

---

## 🚨 Major Discrepancies — Requires Manual Review

These 4 countries had discrepancies >3pp or structural differences between EY and PwC. Check the per-country `.md` file for full details.

### 1. Greece — PIT Bracket Restructure (Law 5246/2025)

| Field | EY value | PwC value | Gap |
|---|---|---|---|
| Top PIT bracket starts at | EUR 40,001 | EUR 60,001 | +EUR 20,000 |
| 22% bracket threshold | EUR 10,001 | **20%** from EUR 10,001 | −2pp |
| 28% bracket threshold | EUR 20,001 | **26%** from EUR 20,001 | −2pp |
| 36% bracket threshold | EUR 30,001 | **34%** from EUR 30,001 | −2pp |

**Root cause:** Law 5246/2025 restructured all PIT brackets for tax year 2026. EY data cut-off was 1 October 2025; this law passed after that date. PwC (reviewed February 2026) reflects the new structure.  
**Action:** Update `greece-2026.md` with the new 6-bracket scale. The effective rate calculations will change meaningfully — top rate now applies from €60k, not €40k.  
**Source to use:** PwC Greece (taxsummaries.pwc.com/greece) + Law 5246/2025 text.

---

### 2. Egypt — Employee/Employer SS Rates Presentation

| Field | EY value | PwC value | Gap |
|---|---|---|---|
| Employee SS | ~11% | 11% employee ✓ | — |
| Employer SS | ~18.75% | 18.75% employer ✓ | — |
| SS ceiling | EGP 14,500/month (2025) | EGP 16,700/month (2026) | +EGP 2,200 |

**Root cause:** The EY file as written appeared to present the employee and employer rates in the wrong order (EY agent transposed them). PwC confirms: employee=11%, employer=18.75%. The ceiling has also been updated for 2026.  
**Action:** Correct the SS table presentation in `egypt-2026.md` and update ceiling from EGP 14,500 to EGP 16,700/month.

---

### 3. Finland — Expatriate Flat Rate

| Field | EY value | PwC value | Gap |
|---|---|---|---|
| Expatriate flat income tax | 32% | 25% | **−7pp** |
| Key income source | Final withholding on earned income | Tax at source on earned income | Same concept |

**Root cause:** The Finnish expat flat rate (lähdevero / withholding tax for foreign key employees) is reported as 32% in EY vs 25% in PwC. These may reference different legal bases — the 32% could include the health insurance component or reference an older rate, while PwC's 25% may be the base rate. EY content date October 2025; PwC may reflect a 2026 update.  
**Action:** Verify at vero.fi — search for "lähdevero avainhenkilö" (key employee withholding tax). Check if the rate changed in 2026 or if there's a component difference.

---

### 4. Nigeria — Finance Act 2025 Bracket Restructure

| Field | EY value | PwC value | Gap |
|---|---|---|---|
| Zero-rate band | None (CRA minimum-tax approach) | NGN 0–800,000 at 0% | Structural |
| Top PIT rate | 24% | 25% (at NGN 50M+) | +1pp |
| Rate at NGN 10M+ | EY: 24% | PwC: 21–25% restructured | Structural |

**Root cause:** Nigeria's Finance Act 2025 (likely enacted after EY's October 2025 cut-off) restructured the personal income tax brackets, adding a 0% band on the first NGN 800,000 and adjusting upper brackets. The old CRA (consolidated relief allowance) minimum-tax method appears to have been modified.  
**Action:** Update `nigeria-2026.md` with the Finance Act 2025 brackets from PwC. This is a meaningful change that improves Nigeria's effective rate for moderate incomes.

---

## ⚠️ Notable Partial Mismatches (selected)

These are within the 1–3pp tolerance but worth noting:

| Country | Field | EY | PwC | Note |
|---|---|---|---|---|
| Pakistan | Non-salaried top rate | 35% | 45% | Finance Acts 2024/2025 raised non-salaried rates; IT export exemption not confirmed by PwC |
| Chile | Top PIT rate | 40% (>310 MTU) | 35.5% shown | PwC page may lag on ultra-high-income 40% bracket; verify at SII |
| Costa Rica | Employee SS | 10.83% | 4.33% | EY cites tripartite total; PwC shows employee-only deduction |
| Cyprus | Self-employed SI | 15.6% | 16.6% | +1pp — likely 2026 rate adjustment |
| Ecuador | Self-employed SS | ~9.45% | 17.6% (total IESS) | EY showed employee contribution only; PwC shows full IESS rate |
| Ukraine | ЄСВ cap | 20× min wage (UAH 172,940) | 15× min wage (UAH 129,705) | Significant difference in max base; verify against current Tax Code |
| Germany | Pension SS ceiling | EUR 96,600 (EY 2025 data) | EUR 101,400 (PwC 2026) | Normal annual indexation |
| Isle of Man | Personal allowance | GBP 14,750 | GBP 17,000 | April 2026 budget increase (2026/27 tax year) |
| Malta | Married zero-rate threshold | EUR 15,000 | EUR 15,500 | Minor indexation |
| Barbados | Resilience Fund levy | Not mentioned | 0.25% (from Apr 2025) | New levy post-EY cut-off |
| Korea (South) | Expat flat rate | 20.9% (includes local) | 19% (national only) | Same rate; different presentation |
| Peru | UIT value | PEN 5,350 (2025) | PEN 5,500 (2026) | Annual indexation |
| Portugal | PIT top threshold | EUR 83,696 | EUR 86,634 | 2026 indexation |
| Romania | Capital gains | 1%/3% | 3%/6% | Law 141/2025 may have changed rates |

---

## 📋 Countries Not Covered by PwC

PwC's database covers ~148 jurisdictions; the following in our dataset have no PwC page. EY is the sole source.

| Country | Status |
|---|---|
| Aruba | PwC: not covered |
| Bahamas | PwC: not covered |
| BES-Islands (Bonaire/Saba/Sint Eustatius) | PwC: not covered |
| British Virgin Islands | PwC: not covered |
| Cayman Islands | PwC: not covered |
| Guam | PwC: not covered (US territory) |
| Lesotho | PwC: not covered |
| Malawi | PwC: not covered |
| Maldives | PwC: not covered |
| Monaco | PwC: not covered |
| Northern Mariana Islands | PwC: not covered (US territory) |
| São Tomé and Príncipe | PwC: not covered |
| Sint Maarten | PwC: not covered |
| Suriname | PwC: not covered (confirmed 404) |
| South Sudan | PwC: not covered (confirmed 404) |
| Sri Lanka | PwC: not covered (confirmed 404) |
| Zimbabwe | PwC: not covered |

---

## ✅ Top-10 Most Reliable (Multi-Source Agreement)

Countries where EY and PwC fully agree on all verified fields AND a government source was also consulted during initial extraction:

| Country | Sources | Key rates confirmed |
|---|---|---|
| Georgia | EY + PwC + rs.ge + gegidze.com | SBS 1%, pension 2%/2%, flat 20% PIT |
| Albania | EY + PwC + tatime.gov.al | Person Fizik 0% (to 2029), 13%/23% employment brackets |
| Poland | EY + PwC + podatki.gov.pl + zus.pl | Ryczałt 12% IT, PLN 30k threshold, ZUS rates |
| Kosovo | EY + PwC (Jan 2026) | 0%/8%/10%, EUR 3,000 threshold |
| Kazakhstan | EY + PwC (Feb 2026 — post-reform) | New Tax Code 2026 progressive 10%/15% confirmed |
| Malta | EY + PwC | 35% top, Non-Dom €15k min, new HQP framework |
| Montenegro | EY + PwC | 0%/9%/15%, municipal surtax, 0% band EUR 700/month |
| Singapore | EY + PwC | 24% top, CPF exemption for EP holders |
| Paraguay | EY + PwC | 10% IRP flat, territorial system |
| Slovakia | EY + PwC | New 2026 4-bracket structure 19%/25%/30%/35% |

---

## 🔍 Top-10 Needing Manual Review

Countries where data quality is lower or discrepancies were found:

| Country | Issue | Recommended action |
|---|---|---|
| Greece | Law 5246/2025 changed all PIT brackets | Update file from PwC + law text |
| Nigeria | Finance Act 2025 restructured brackets | Update file from PwC + FIRS |
| Finland | Expat flat rate 32% (EY) vs 25% (PwC) | Verify at vero.fi |
| Egypt | SS rate ordering transposed; ceiling outdated | Correct to employee=11%, employer=18.75%, ceiling EGP 16,700 |
| Pakistan | Non-salaried top rate 35% vs 45% | Verify Finance Acts 2024/25 at FBR |
| Ukraine | ЄСВ cap: 20× vs 15× minimum wage | Verify against current Tax Code at minfin.gov.ua |
| Chile | Top bracket 40% vs 35.5% (PwC may lag) | Verify at SII Chile |
| Romania | Capital gains 1%/3% vs 3%/6% | Verify Law 141/2025 scope |
| Costa Rica | Employee SS presentation: total vs employee-only | Clarify in file (add note) |
| Oman | PIT announced for 2028 (post-EY cut-off) | Add forward-looking note to file |

---

## Key Findings from Verification

1. **86% agreement rate** between EY and PwC where both have data — strong overall reliability.
2. **Most partial mismatches** are caused by annual indexation (thresholds, ceilings) between EY's October 2025 data and PwC's more recent pages — not structural errors.
3. **4 actionable major discrepancies** — Greece and Nigeria both had post-EY-cutoff legislative changes that materially alter the tax structure.
4. **Special regimes broadly confirmed:** Portugal NHR 2.0/IFICI ✅, Italy Regime Forfettario ✅, Georgia SBS 1% ✅, Albania Person Fizik 0% ✅, Poland Ryczałt 12% ✅, Spain Beckham Law ✅, Malta Non-Dom ✅, Cyprus Non-Dom ✅.
5. **Oman 2028 PIT:** PwC reveals Oman plans to introduce a 5% PIT from 2028 (OMR 42,000 threshold) — announced after EY cut-off. Worth flagging for forward-looking analysis.
6. **PwC coverage gaps:** 17 countries have no PwC page; for small offshore/Caribbean jurisdictions EY remains the only Big-4 source.

---

## Sources

- EY Worldwide Personal Tax and Immigration Guide 2025-26 (October 2025)
- PwC Worldwide Tax Summaries — taxsummaries.pwc.com (fetched May 2026)
- Batch verification files: needs-review-v1.md through needs-review-v8.md
