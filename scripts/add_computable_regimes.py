#!/usr/bin/env python3
"""Phase 1: Inject computableRegimes into data/countries.json for 15 top countries."""

import json, sys

DATA_PATH = "/Users/boiechko/IdeaProjects/tax-compass/data/countries.json"

# ─────────────────────────────────────────────────────────────────────────────
# Registry of computableRegimes per country code
# ─────────────────────────────────────────────────────────────────────────────

REGIMES = {}

# ── Spain ────────────────────────────────────────────────────────────────────
REGIMES["es"] = [
    {
        "id": "es-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Combined Madrid state+autonomous IRPF brackets. Employee SS 6.48% capped at EUR 58,914/year.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.0648,
            "cap": 58914,
        },
    },
    {
        "id": "es-beckham",
        "name": "Beckham Law (Régimen Especial de Impatriados)",
        "shortName": "Beckham Law",
        "type": "employment",
        "eligibility": "Not Spanish tax resident in 5 preceding years; employment/director/entrepreneur reason for transfer",
        "duration": "Year of arrival + 5 subsequent tax years (up to 6 years total)",
        "notes": "Flat 24% up to EUR 600k; 47% above EUR 600k. No personal allowances apply. SS as normal employment.",
        "pit": {
            "kind": "flat",
            "rate": 0.24,
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.0648,
            "cap": 58914,
        },
    },
    {
        "id": "es-autonomo",
        "name": "Autónomo (RETA — Régimen Especial de Trabajadores Autónomos)",
        "shortName": "Autónomo",
        "type": "self-employment",
        "notes": "Progressive IRPF on net profit. RETA contributions based on monthly net income in 15 bands (monthly quota ≈ 31.3% × minimum base). Bands show monthly net income upper limit (EUR) → monthly contribution (EUR).",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "banded",
            # bands: upTo = annual net income EUR, monthly = RETA minimum quota EUR
            "bands": [
                {"upTo": 10800,  "monthly": 298},
                {"upTo": 14000,  "monthly": 298},
                {"upTo": 15600,  "monthly": 313},
                {"upTo": 18000,  "monthly": 344},
                {"upTo": 20400,  "monthly": 376},
                {"upTo": 22200,  "monthly": 407},
                {"upTo": 24360,  "monthly": 438},
                {"upTo": 27960,  "monthly": 470},
                {"upTo": 33120,  "monthly": 501},
                {"upTo": 38280,  "monthly": 532},
                {"upTo": 43440,  "monthly": 563},
                {"upTo": 48600,  "monthly": 595},
                {"upTo": 72000,  "monthly": 626},
                {"upTo": None,   "monthly": 626},
            ],
        },
    },
]

# ── Poland ────────────────────────────────────────────────────────────────────
REGIMES["pl"] = [
    {
        "id": "pl-employment",
        "name": "Umowa o pracę (Employment Contract)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive PIT 12%/32% with PLN 30,000 tax-free threshold. Employee ZUS ~13.71% + health 9% (not deductible from PIT since 2022). SS cap PLN 260,190/year for pension/disability.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.1371,
            "cap": 260190,
        },
        "personalAllowance": {"amount": 30000, "currency": "PLN"},
    },
    {
        "id": "pl-ryczalt-12",
        "name": "JDG + Ryczałt 12% (IT/Software Services)",
        "shortName": "Ryczałt 12%",
        "type": "self-employment",
        "eligibility": "JDG (sole proprietorship), prior-year revenue ≤ EUR 2,000,000; PKWiU 62.x IT activities",
        "notes": "12% lump-sum tax on revenue (after deducting social ZUS). Healthcare fixed-tier: PLN 468/month (≤ PLN 60k revenue), PLN 781/month (60k–300k), PLN 1,405/month (>300k). Social ZUS minimum PLN 1,773/month.",
        "pit": {
            "kind": "lump-sum",
            "rate": 0.12,
            "appliesTo": "revenue",
        },
        "socialSecurity": {
            "kind": "fixed-monthly",
            "monthly": 1773,
        },
    },
    {
        "id": "pl-ip-box",
        "name": "JDG + IP Box (Ulga IP Box 5%)",
        "shortName": "IP Box 5%",
        "type": "self-employment",
        "eligibility": "JDG using Liniowy 19% with qualifying IP income (software copyrights, patents). Strict documentation required.",
        "notes": "5% rate on IP-sourced income only. SS same as Liniowy: ZUS minimum PLN 1,773/month + health 4.9% of net profit.",
        "pit": {
            "kind": "flat",
            "rate": 0.05,
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "fixed-monthly",
            "monthly": 1773,
        },
    },
]

# ── Ukraine ───────────────────────────────────────────────────────────────────
REGIMES["ua"] = [
    {
        "id": "ua-employment",
        "name": "Employment (Трудовий договір)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Flat 18% PIT + 5% military levy = 23% total. No employee ESV (employer pays 22%). Military levy 5% in effect from Dec 2024 until end of martial law.",
        "pit": {
            "kind": "flat",
            "rate": 0.18,
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "none",
        },
        "additionalLevies": [
            {"name": "Військовий збір (Military Levy)", "rate": 0.05, "appliesTo": "gross"},
        ],
    },
    {
        "id": "ua-fop-group3",
        "name": "ФОП Group 3 (Єдиний Податок 5% + ВЗ 1%)",
        "shortName": "ФОП Group 3",
        "type": "self-employment",
        "eligibility": "Annual revenue < UAH 10,091,049 (~€229k). No employee count limit. Most activities permitted.",
        "notes": "5% single tax on gross revenue (non-VAT) + 1% military levy (special carve-out for Group 3). Fixed ESV UAH 1,902/month. No PIT on simplified-system income.",
        "pit": {
            "kind": "lump-sum",
            "rate": 0.05,
            "appliesTo": "revenue",
            "cap": {"amount": 10091049, "currency": "UAH"},
        },
        "socialSecurity": {
            "kind": "fixed-monthly",
            "monthly": 1902,
        },
        "additionalLevies": [
            {"name": "Військовий збір (Military Levy — Group 3 carve-out)", "rate": 0.01, "appliesTo": "revenue"},
        ],
    },
    {
        "id": "ua-diia-city",
        "name": "Diia City Гіг-Спеціаліст (5% PIT + 5% ВЗ)",
        "shortName": "Diia City",
        "type": "employment",
        "eligibility": "IT professionals on gig contracts with Diia City resident companies",
        "notes": "5% PIT + 5% military levy = 10% total. Employer pays 22% ESV on gig fee.",
        "pit": {
            "kind": "flat",
            "rate": 0.05,
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "none",
        },
        "additionalLevies": [
            {"name": "Військовий збір (Military Levy)", "rate": 0.05, "appliesTo": "gross"},
        ],
    },
]

# ── Georgia ───────────────────────────────────────────────────────────────────
REGIMES["ge"] = [
    {
        "id": "ge-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Flat 20% PIT. Mandatory funded pension: 2% employee + 2% employer contribution.",
        "pit": {
            "kind": "flat",
            "rate": 0.20,
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.02,
        },
    },
    {
        "id": "ge-sbs",
        "name": "Individual Entrepreneur — Small Business Status (SBS 1%)",
        "shortName": "SBS 1%",
        "type": "self-employment",
        "eligibility": "Registered individual entrepreneur with SBS status. IT/software permitted. Foreign nationals eligible.",
        "notes": "1% on gross revenue up to GEL 500,000/year; 3% above threshold until year-end. Voluntary pension 4% (not included). VAT registration required above GEL 100,000 turnover.",
        "pit": {
            "kind": "lump-sum",
            "rate": 0.01,
            "appliesTo": "revenue",
            "cap": {"amount": 500000, "currency": "GEL"},
        },
        "socialSecurity": {
            "kind": "none",
        },
    },
]

# ── Albania ───────────────────────────────────────────────────────────────────
REGIMES["al"] = [
    {
        "id": "al-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive PIT: 0% up to ALL 2,040,000 taxable, 13% to ALL 2,040,000, 23% above. Deduction ALL 360,000 (salary > ALL 720,000). Employee SS 11.2% (pension 9.5% + health 1.7%) capped at ALL 176,416/month.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.112,
            "cap": 2116992,
        },
        "personalAllowance": {"amount": 360000, "currency": "ALL"},
    },
    {
        "id": "al-person-fizik",
        "name": "Person Fizik — 0% Income Tax (until 31.12.2029)",
        "shortName": "Person Fizik 0%",
        "type": "self-employment",
        "eligibility": "Gross turnover ≤ ALL 14,000,000 (~€134,600). All professional activities including IT.",
        "duration": "Until 31 December 2029; reverts to 15%/23% after expiry",
        "notes": "0% income tax on all business income through 31 Dec 2029. Fixed SS: pension ALL 110,400 + health ALL 32,640 = ALL 143,040/year regardless of income.",
        "pit": {
            "kind": "zero",
            "appliesTo": "revenue",
            "cap": {"amount": 14000000, "currency": "ALL"},
        },
        "socialSecurity": {
            "kind": "fixed-monthly",
            "monthly": 11920,
        },
    },
]

# ── Portugal ──────────────────────────────────────────────────────────────────
REGIMES["pt"] = [
    {
        "id": "pt-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive IRS 12.5%–48% (2026 brackets). Employee SS 11% (no cap). Personal deduction EUR 4,462 from taxable income.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.11,
        },
        "personalAllowance": {"amount": 4462, "currency": "EUR"},
    },
    {
        "id": "pt-ifici",
        "name": "IFICI / NHR 2.0 — Qualifying Professional (20% flat)",
        "shortName": "IFICI/NHR 2.0",
        "type": "employment",
        "eligibility": "Becoming tax resident in 2024+; not resident in prior 5 years; qualifying activity (R&D, innovation, highly qualified professions, startups, Azores/Madeira)",
        "duration": "10 consecutive years",
        "notes": "20% flat rate on qualifying income. SS same as standard employment (11%).",
        "pit": {
            "kind": "flat",
            "rate": 0.20,
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.11,
        },
    },
    {
        "id": "pt-simplified-b2b",
        "name": "Regime Simplificado B2B (Coefficient 0.75)",
        "shortName": "Simplified B2B",
        "type": "self-employment",
        "eligibility": "Prior-year gross ≤ EUR 200,000; professional services (IT, consulting, liberal professions under Art. 151 IRS Code)",
        "notes": "75% of revenue is taxable (25% deemed expense deduction). Progressive IRS rates on taxable income. SS: 21.4% on 70% of gross revenue (effective 14.98% of gross); capped at EUR 75,240/year base.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "revenue",
            "deductionPercent": 25,
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.1498,
        },
    },
]

# ── Italy ─────────────────────────────────────────────────────────────────────
REGIMES["it"] = [
    {
        "id": "it-employment",
        "name": "Standard Employment (IRPEF)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive IRPEF 23%/35%/43% + regional ~1.73% (Lombardia) + municipal ~0.8%. Employee SS ~9.49% (varies by sector). Additional 1% employee SS on income > EUR 55,448.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.0949,
            "cap": 120607,
        },
    },
    {
        "id": "it-forfettario-15",
        "name": "Regime Forfettario 15% (IT/Consulting — 78% coefficient)",
        "shortName": "Forfettario 15%",
        "type": "self-employment",
        "eligibility": "Gross revenue ≤ EUR 85,000 in prior year; no employees with cost > EUR 20,000; no employment income > EUR 30,000 in same year",
        "notes": "15% substitute tax (replaces IRPEF, regional, municipal). Coefficient 78% for IT/professional services = 22% deemed deduction. INPS Gestione Separata 26.07% on taxable income. Exit immediately if revenue > EUR 100,000 in-year.",
        "pit": {
            "kind": "flat",
            "rate": 0.15,
            "appliesTo": "taxable",
            "deductionPercent": 22,
            "cap": {"amount": 85000, "currency": "EUR"},
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.2607,
            "cap": 120607,
        },
    },
    {
        "id": "it-forfettario-5",
        "name": "Regime Forfettario 5% — First 5 Years (New Activity)",
        "shortName": "Forfettario 5%",
        "type": "self-employment",
        "eligibility": "New activity start; no prior business/professional activity in preceding 3 calendar years; activity not a continuation of prior employment with same client",
        "duration": "First 5 years of new activity",
        "notes": "Same as Forfettario 15% but 5% substitute tax rate. INPS Gestione Separata 26.07% still applies.",
        "pit": {
            "kind": "flat",
            "rate": 0.05,
            "appliesTo": "taxable",
            "deductionPercent": 22,
            "cap": {"amount": 85000, "currency": "EUR"},
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.2607,
            "cap": 120607,
        },
    },
]

# ── Germany ───────────────────────────────────────────────────────────────────
REGIMES["de"] = [
    {
        "id": "de-employment",
        "name": "Standard Employment (Angestellter)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive Einkommensteuer 0%–45%; Grundfreibetrag EUR 12,096; Soli applies for income tax liability > EUR 18,130. Employee SS ~21% (pension 9.3% + unemployment 1.3% + health 8.05% + nursing 2.4% for childless). SS capped: pension/unemployment EUR 101,400; health/nursing EUR 69,750.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.21,
            "cap": 101400,
        },
        "personalAllowance": {"amount": 12096, "currency": "EUR"},
    },
    {
        "id": "de-freiberufler",
        "name": "Freiberufler (Liberal/Academic Self-Employment — §18 EStG)",
        "shortName": "Freiberufler",
        "type": "self-employment",
        "eligibility": "Qualifying liberal professions: IT consultants, software developers (creative/scientific work), engineers, architects, doctors, lawyers, journalists. Must not be classified as Gewerbebetrieb.",
        "notes": "Same progressive Einkommensteuer as employment (0%–45%) on net profit after expenses. No Gewerbesteuer (trade tax). No mandatory employer-side SS. Health insurance mandatory (GKV or PKV, fully self-paid). Voluntary pension (DRV or Versorgungswerk for some professions).",
        "pit": {
            "kind": "progressive",
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "none",
        },
        "personalAllowance": {"amount": 12096, "currency": "EUR"},
    },
]

# ── France ────────────────────────────────────────────────────────────────────
REGIMES["fr"] = [
    {
        "id": "fr-employment",
        "name": "Standard Employment (Salarié)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive IR 0%–45% (2024 brackets; annual indexation). Employee SS ~21.3% total (incl. CSG/CRDS 9.7% on 98.25% of gross + pension CNAV 6.9% + complementary AGIRC-ARRCO ~3.93% + health 0.75%). 10% standard deduction capped EUR 14,426.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.213,
        },
    },
    {
        "id": "fr-micro-bnc",
        "name": "Micro-Entrepreneur BNC (Liberal Professions — SSI)",
        "shortName": "Micro-BNC",
        "type": "self-employment",
        "eligibility": "Liberal professional (BNC category) with annual revenue ≤ EUR 77,700. Cannot deduct actual expenses.",
        "notes": "Social cotisations 25.6% on gross revenue (SSI — most liberal professions since 2018; CIPAV regulated professions ~21.2%). IR on 66% of revenue (34% abattement) at progressive rates.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "revenue",
            "deductionPercent": 34,
            "cap": {"amount": 77700, "currency": "EUR"},
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.256,
        },
    },
]

# ── United Kingdom ────────────────────────────────────────────────────────────
REGIMES["gb"] = [
    {
        "id": "gb-paye",
        "name": "PAYE Employment",
        "shortName": "PAYE",
        "type": "employment",
        "notes": "Progressive IT 20%/40%/45% (England/Wales/NI). Personal allowance GBP 12,570 (tapered above GBP 100,000). Employee Class 1 NIC: 8% on GBP 12,570–50,270; 2% above GBP 50,270.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "banded",
            "bands": [
                {"upTo": 12570,  "monthly": 0},
                {"upTo": 50270,  "monthly": None},
                {"upTo": None,   "monthly": None},
            ],
        },
        "personalAllowance": {"amount": 12570, "currency": "GBP"},
    },
    {
        "id": "gb-ltd-outside-ir35",
        "name": "Ltd Company Outside IR35 (PSC / Director-Shareholder)",
        "shortName": "Ltd Co",
        "type": "self-employment",
        "eligibility": "Genuinely self-employed contractor with Status Determination Statement confirming outside IR35",
        "notes": "Revenue → Ltd Co → CT 19% (≤GBP 50k profit) / 25% (>GBP 250k) with marginal relief. Min salary at personal allowance GBP 12,570 (no employee NIC; employer NIC 15% on salary > GBP 5,000). Remaining profit as dividends: 8.75%/33.75%/39.35% (to Apr 2026); 10.75%/35.75%/39.35% (from Apr 2026). Dividend allowance GBP 500.",
        "pit": {
            "kind": "flat",
            "rate": 0.19,
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "none",
        },
        "personalAllowance": {"amount": 12570, "currency": "GBP"},
    },
    {
        "id": "gb-sole-trader",
        "name": "Sole Trader (Self-Assessment)",
        "shortName": "Sole Trader",
        "type": "self-employment",
        "notes": "Progressive IT 20%/40%/45% on net profit. Class 4 NIC 8% on profits GBP 12,570–50,270; 2% above. Class 2 NIC abolished April 2024.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "banded",
            "bands": [
                {"upTo": 12570,  "monthly": 0},
                {"upTo": 50270,  "monthly": None},
                {"upTo": None,   "monthly": None},
            ],
        },
        "personalAllowance": {"amount": 12570, "currency": "GBP"},
    },
]

# ── Netherlands ───────────────────────────────────────────────────────────────
REGIMES["nl"] = [
    {
        "id": "nl-employment",
        "name": "Standard Employment (Box 1 — Loonheffing)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Box 1 combined rate includes National Insurance (NI) for type B (age < 67): 37.48% up to EUR 76,817 (includes 27.65% NI); 49.50% above. General credit and employment credit reduce tax. Health standard premium ~EUR 1,880/year (paid directly by employee to insurer). No additional SS for employer beyond employee insurance acts.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "none",
        },
    },
    {
        "id": "nl-zzp",
        "name": "ZZP / Eenmanszaak (Self-Employed — IB Ondernemer)",
        "shortName": "ZZP",
        "type": "self-employment",
        "eligibility": "Meets Belastingdienst 'ondernemerscriteria': multiple clients, financial risk, independence. Minimum 1,225 hours worked in own business for zelfstandigenaftrek.",
        "notes": "Box 1 progressive (same combined rates as employment) on net profit after: zelfstandigenaftrek EUR 2,470 (2025; EUR 1,200 in 2026; phasing to EUR 900 by 2027), MKB-winstvrijstelling 12.7% of remaining profit. Health insurance income-related contribution 5.26% on profit (capped at EUR 75,864) + standard premium EUR 1,880/year.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.0526,
            "cap": 75864,
        },
    },
    {
        "id": "nl-30-ruling",
        "name": "30% Ruling (Expatriate Tax-Free Allowance)",
        "shortName": "30% Ruling",
        "type": "employment",
        "eligibility": "Recruited/assigned from abroad; residence > 150 km from Dutch border for 16 of 24 months prior to employment; scarce/specific expertise; salary threshold EUR 46,660/year (2025)",
        "duration": "60 months (5 years); rate reduces to 27% from January 2027",
        "notes": "Employer pays 30% of gross salary as tax-free allowance; only 70% of gross enters Box 1. Standard NL employment SS still applies on full gross salary (not reduced by 30%).",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
            "deductionPercent": 30,
        },
        "socialSecurity": {
            "kind": "none",
        },
    },
]

# ── Cyprus ────────────────────────────────────────────────────────────────────
REGIMES["cy"] = [
    {
        "id": "cy-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Progressive PIT 0%/20%/25%/30%/35% (2026 brackets). Employee: social insurance 8.8% (cap EUR 66,612) + GHS 2.65% (cap EUR 180,000) = 11.45% total.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.1145,
            "cap": 66612,
        },
        "personalAllowance": {"amount": 22000, "currency": "EUR"},
    },
    {
        "id": "cy-non-dom-art8",
        "name": "Non-Dom + Article 8(23A) — 50% PIT Exemption",
        "shortName": "Non-Dom + Art.8(23A)",
        "type": "employment",
        "eligibility": "Non-resident outside Cyprus for ≥ 15 consecutive years before first employment; first employment in Cyprus from 1 Jan 2022; annual remuneration > EUR 55,000",
        "duration": "Up to 17 years from first employment year",
        "notes": "50% of employment income exempt from PIT (effective rate halved). Non-Dom status: 0% SDC on dividends and interest. GHS 2.65% still applies. SS as standard employment.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
            "deductionPercent": 50,
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.1145,
            "cap": 66612,
        },
        "personalAllowance": {"amount": 22000, "currency": "EUR"},
    },
    {
        "id": "cy-self-employed",
        "name": "Self-Employed (Registered — Standard)",
        "shortName": "Self-Employed",
        "type": "self-employment",
        "notes": "Progressive PIT 0%/20%/25%/30%/35% on net income (after allowable expenses). Social insurance 16.6% + GHS 4.0% = 20.6% total on net income (capped at EUR 66,612 for SI; EUR 180,000 for GHS).",
        "pit": {
            "kind": "progressive",
            "appliesTo": "profit",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.206,
            "cap": 66612,
        },
        "personalAllowance": {"amount": 22000, "currency": "EUR"},
    },
]

# ── Bulgaria ──────────────────────────────────────────────────────────────────
REGIMES["bg"] = [
    {
        "id": "bg-employment",
        "name": "Standard Employment",
        "shortName": "Employment",
        "type": "employment",
        "notes": "Flat 10% PIT on taxable income (gross minus employee SS). Bulgaria adopted EUR on 1 Jan 2026 at BGN 1.95583 = EUR 1. Employee SS 13.78% (pension 6.58% + disability 1.40% + additional pension 2.20% + unemployment 0.40% + health 3.20%) capped at EUR 2,112/month (EUR 25,344/year).",
        "pit": {
            "kind": "flat",
            "rate": 0.10,
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.1378,
            "cap": 25344,
        },
    },
    {
        "id": "bg-free-professional",
        "name": "Свободна Професия — Free Professional (25% Deduction)",
        "shortName": "Free Professional",
        "type": "self-employment",
        "eligibility": "Liberal/free professions: IT consultants, engineers, architects, lawyers, accountants, translators, consultants. Registered as self-employed (not sole entrepreneur).",
        "notes": "25% flat expense deduction (no receipts needed); 10% PIT on 75% of gross = 7.5% effective on gross. SS 27.8% (basic: pension 14.8% + additional pension 5% + health 8%) on self-chosen base. Minimum base EUR 550.66/month; max EUR 2,111.64/month. SS deductible from PIT base. Copyright royalties: 40% deduction (even more favorable).",
        "pit": {
            "kind": "flat",
            "rate": 0.10,
            "appliesTo": "taxable",
            "deductionPercent": 25,
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.278,
            "cap": 25339,
        },
    },
]

# ── UAE ───────────────────────────────────────────────────────────────────────
REGIMES["ae"] = [
    {
        "id": "ae-employment",
        "name": "Employment (Foreign National)",
        "shortName": "Employment",
        "type": "employment",
        "notes": "0% PIT for all individuals. No UAE social security for non-GCC foreign nationals. End-of-service gratuity accrues (not a tax). Employer may pay into DEWS/savings scheme.",
        "pit": {
            "kind": "zero",
            "appliesTo": "gross",
        },
        "socialSecurity": {
            "kind": "none",
        },
    },
    {
        "id": "ae-sole-establishment",
        "name": "Sole Establishment / Freelancer + Small Business Relief",
        "shortName": "SBR (through 2026)",
        "type": "self-employment",
        "eligibility": "Revenue ≤ AED 3,000,000 in all CT periods since 1 June 2023",
        "duration": "SBR available for tax periods ending on or before 31 December 2026 only",
        "notes": "0% CT with SBR election through 2026. From 2027: standard CT 0% on first AED 375,000 profit; 9% above AED 375,000. 0% PIT always. 5% VAT registration required above AED 375,000 turnover.",
        "pit": {
            "kind": "zero",
            "appliesTo": "revenue",
        },
        "socialSecurity": {
            "kind": "none",
        },
    },
]

# ── United States (California) ────────────────────────────────────────────────
REGIMES["us"] = [
    {
        "id": "us-ca-w2",
        "name": "W-2 Employment — California",
        "shortName": "W-2 (CA)",
        "type": "employment",
        "notes": "Federal progressive 10%–37% + California state 1%–13.3%. Standard deductions: federal $16,100; CA $5,540 (single, 2026). FICA: 6.2% OASDI (capped ~$180,000) + 1.45% Medicare (no cap) = 7.65%. CA SDI 1.1% (no cap since 2024). Additional 0.9% Medicare above $200,000 MAGI.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.0765,
            "cap": 180000,
        },
        "additionalLevies": [
            {"name": "CA State Disability Insurance (SDI)", "rate": 0.011, "appliesTo": "gross"},
        ],
        "personalAllowance": {"amount": 16100, "currency": "USD"},
    },
    {
        "id": "us-ca-1099",
        "name": "1099 Self-Employed — California",
        "shortName": "1099 (CA)",
        "type": "self-employment",
        "notes": "Same federal progressive + CA state rates as W-2. SECA 15.3% on 92.35% of net earnings (12.4% OASDI capped ~$180,000 + 2.9% Medicare uncapped). 50% of SE tax deductible from gross income. QBI 20% deduction applies to qualified business income (below phase-out ~$201,000 taxable). No CA SDI for self-employed.",
        "pit": {
            "kind": "progressive",
            "appliesTo": "taxable",
        },
        "socialSecurity": {
            "kind": "percentage",
            "rate": 0.153,
            "cap": 180000,
        },
        "personalAllowance": {"amount": 16100, "currency": "USD"},
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Inject into countries.json
# ─────────────────────────────────────────────────────────────────────────────

with open(DATA_PATH) as f:
    data = json.load(f)

injected = []
for country in data["countries"]:
    code = country["code"]
    if code in REGIMES:
        country["computableRegimes"] = REGIMES[code]
        injected.append(code)

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Injected computableRegimes into {len(injected)} countries: {sorted(injected)}")

# Quick validation
missing = [c for c in ["es","pl","ua","ge","al","pt","it","de","fr","gb","nl","cy","bg","ae","us"] if c not in injected]
if missing:
    print(f"WARNING: These countries were NOT found/injected: {missing}", file=sys.stderr)
else:
    print("All 15 target countries successfully updated.")
