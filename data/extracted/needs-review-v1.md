# Needs Review — Batch V1

Cross-verification of 15 countries against PwC Worldwide Tax Summaries (2026).
Generated: 2026-05-31

## Summary of Findings

| Country | Verdict | Notes |
|---|---|---|
| Albania | ✅ confirmed | All rates match; PwC confirms Person Fizik 0% regime |
| Algeria | ⚠️ partial-mismatch | Tax-free threshold differs; IFU regime not confirmed |
| Angola | ⚠️ partial-mismatch | Tax-free threshold boundary differs by AOA 30,000 |
| Argentina | ✅ confirmed | Top rate 35% and SS 17% match; Monotributo not covered by PwC |
| Armenia | ⚠️ partial-mismatch | Pension rate: EY shows 2.5%/5% (employee only), PwC shows 5%/10% (may be combined) |
| Aruba | PwC: not covered | HTTP 404 |
| Australia | ✅ confirmed | All rates match exactly |
| Austria | ✅ confirmed | All rates match exactly |
| Azerbaijan | ✅ confirmed | Both sources confirm non-oil 0%/14% structure still in force |
| Bahamas | PwC: not covered | HTTP 404 |
| Bahrain | ✅ confirmed | No PIT confirmed; SS rates match |
| Barbados | ⚠️ partial-mismatch | NIS: EY 11.1%/17.1% vs PwC 11%/17%; new 0.25% fund in PwC not in EY |
| Belgium | ✅ confirmed | Rates match; minor EUR 20 rounding in top bracket threshold |
| Bermuda | ✅ confirmed | No PIT confirmed; SS flat rate confirmed |
| Bolivia | ✅ confirmed | RC-IVA 13% and SS 12.71% confirmed |

## Items Requiring Review

| Country | Field | EY value | PwC value | Difference | Notes |
|---|---|---|---|---|---|
| Algeria | Tax-free threshold | DZD 30,000/month (2020 Comp. Finance Act) | DZD 20,000/month (standard IRG bracket) | DZD 10,000/month | Different legal sources; EY references specific exemption law, PwC shows standard bracket |
| Algeria | Self-empl. IFU regime | 5%/12% combined tax, ≤ DZD 8M | Not confirmed | Not confirmed | IFU replaces IRG+VAT+CIT; PwC doesn't detail it |
| Angola | Tax-free threshold | AOA 70,000/month (0% bracket) | AOA 100,000 (stated as exempt) | AOA 30,000/month | EY bracket starts at AOA 70,001; PwC states exempt up to AOA 100,000 |
| Armenia | Employee pension rate | 2.5% on salary ≤ AMD 500,000; 5% above (employee-only) | 5% on salary < AMD 500,000; 10% above | +2.5pp at each tier | Likely: PwC shows employee+state combined; EY shows employee-only. State co-contributes matching amount. Verify at pensia.am |
| Barbados | Employee NIS rate | 11.1% | 11% (April 2025 rate) | 0.1pp | PwC shows April 2025 rates; EY based on October 2025 data — minor rounding/timing |
| Barbados | Self-employed NIS rate | 17.1% | 17% | 0.1pp | Same timing issue as above |
| Barbados | Resilience Fund | Not mentioned | 0.25% (employee + employer) from April 2025 | +0.25pp | New contribution not in EY; verify at nis.gov.bb |
