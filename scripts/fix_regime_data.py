#!/usr/bin/env python3
"""
Phase 2 data fixes for computableRegimes:
- Embed EUR-denominated progressive brackets in each regime
- Convert SS caps / fixed-monthly amounts to EUR
- Convert personalAllowance amounts to EUR
- Fix UK NIC from broken banded-with-nulls to percentage
- Remove personalAllowance where a 0%-band is the bracket approach
"""
import json, copy

DATA_PATH = "/Users/boiechko/IdeaProjects/tax-compass/data/countries.json"

# ── Bracket sets (EUR-denominated) ───────────────────────────────────────────

# Spain: combined state + autonomous (Madrid). Source: EY markdown.
# Marginal rate = state rate + Madrid autonomous rate at each merged breakpoint.
ES_BRACKETS = [
    {"from": 0,      "to": 12450,  "rate": 0.18},    # 9.5+8.5
    {"from": 12450,  "to": 13362,  "rate": 0.205},   # 12+8.5
    {"from": 13362,  "to": 19005,  "rate": 0.227},   # 12+10.7
    {"from": 19005,  "to": 20200,  "rate": 0.248},   # 12+12.8
    {"from": 20200,  "to": 35200,  "rate": 0.278},   # 15+12.8
    {"from": 35200,  "to": 35426,  "rate": 0.313},   # 18.5+12.8
    {"from": 35426,  "to": 57320,  "rate": 0.359},   # 18.5+17.4
    {"from": 57320,  "to": 60000,  "rate": 0.39},    # 18.5+20.5
    {"from": 60000,  "to": 300000, "rate": 0.43},    # 22.5+20.5
    {"from": 300000, "to": None,   "rate": 0.45},    # 24.5+20.5
]

# Poland employment: PLN thresholds ÷ 4.25 EUR/PLN. 0% band embeds the 30k PLN threshold.
PL_EMP_BRACKETS = [
    {"from": 0,      "to": 7059,  "rate": 0.0},    # PLN 0-30,000 → 0%
    {"from": 7059,   "to": 28235, "rate": 0.12},   # PLN 30,000-120,000 → 12%
    {"from": 28235,  "to": None,  "rate": 0.32},   # PLN 120,000+ → 32%
]

# Albania employment: ALL thresholds ÷ 104 EUR/ALL.
# Brackets apply to taxable income (after deduction).
AL_EMP_BRACKETS = [
    {"from": 0,      "to": 19615, "rate": 0.13},   # ALL 0-2,040,000 → 13%
    {"from": 19615,  "to": None,  "rate": 0.23},   # above ALL 2,040,000 → 23%
]

# Portugal 2026 IRS brackets (EUR).
PT_BRACKETS = [
    {"from": 0,      "to": 8342,  "rate": 0.125},
    {"from": 8342,   "to": 12587, "rate": 0.157},
    {"from": 12587,  "to": 17838, "rate": 0.212},
    {"from": 17838,  "to": 23089, "rate": 0.241},
    {"from": 23089,  "to": 29397, "rate": 0.311},
    {"from": 29397,  "to": 43090, "rate": 0.349},
    {"from": 43090,  "to": 46566, "rate": 0.431},
    {"from": 46566,  "to": 86634, "rate": 0.446},
    {"from": 86634,  "to": None,  "rate": 0.48},
]

# Italy: IRPEF + Lombardia regional (1.73%) + Milan municipal (0.8%).
IT_EMP_BRACKETS = [
    {"from": 0,      "to": 28000, "rate": 0.2553},  # 23+1.73+0.8
    {"from": 28000,  "to": 50000, "rate": 0.3753},  # 35+1.73+0.8
    {"from": 50000,  "to": None,  "rate": 0.4553},  # 43+1.73+0.8
]

# Germany: approximated progressive (Einkommensteuer formula → linearized).
# Grundfreibetrag EUR 12,096 → 0% band.
DE_BRACKETS = [
    {"from": 0,       "to": 12096,  "rate": 0.0},
    {"from": 12096,   "to": 30000,  "rate": 0.19},
    {"from": 30000,   "to": 68481,  "rate": 0.36},
    {"from": 68481,   "to": 277826, "rate": 0.42},
    {"from": 277826,  "to": None,   "rate": 0.45},
]

# France: IR brackets 2024 (most recent confirmed in EY markdown).
FR_BRACKETS = [
    {"from": 0,       "to": 11497,  "rate": 0.0},
    {"from": 11497,   "to": 29315,  "rate": 0.11},
    {"from": 29315,   "to": 83823,  "rate": 0.30},
    {"from": 83823,   "to": 180294, "rate": 0.41},
    {"from": 180294,  "to": None,   "rate": 0.45},
]

# UK: income tax brackets England/Wales/NI 2025-26 (GBP ÷ 0.84 → EUR).
# 0% band includes personal allowance (GBP 12,570 → EUR 14,964).
GB_BRACKETS = [
    {"from": 0,       "to": 14964,  "rate": 0.0},    # personal allowance
    {"from": 14964,   "to": 59845,  "rate": 0.20},   # basic rate (GBP 50,270 / 0.84)
    {"from": 59845,   "to": 148976, "rate": 0.40},   # higher rate (GBP 125,140 / 0.84)
    {"from": 148976,  "to": None,   "rate": 0.45},   # additional rate
]

# Cyprus 2026: PIT brackets (EUR). 0% band includes personal allowance (EUR 22,000).
CY_BRACKETS = [
    {"from": 0,      "to": 22000, "rate": 0.0},
    {"from": 22000,  "to": 32000, "rate": 0.20},
    {"from": 32000,  "to": 42000, "rate": 0.25},
    {"from": 42000,  "to": 72000, "rate": 0.30},
    {"from": 72000,  "to": None,  "rate": 0.35},
]

# US federal 2026 (USD ÷ 1.08 → EUR). Standard deduction handled via personalAllowance.
# These brackets apply to taxable income (after standard deduction).
US_FEDERAL_BRACKETS = [
    {"from": 0,       "to": 11250,  "rate": 0.10},   # $12,150 / 1.08
    {"from": 11250,   "to": 42870,  "rate": 0.12},   # $46,300 / 1.08
    {"from": 42870,   "to": 91157,  "rate": 0.22},   # $98,450 / 1.08
    {"from": 91157,   "to": 191435, "rate": 0.24},   # $206,750 / 1.08
    {"from": 191435,  "to": 227361, "rate": 0.32},   # $245,550 / 1.08
    {"from": 227361,  "to": 593148, "rate": 0.35},   # $640,600 / 1.08
    {"from": 593148,  "to": None,   "rate": 0.37},
]

# ── Per-regime patch table ────────────────────────────────────────────────────
# Structure: country_code → regime_id → dict of fields to set/update

PATCHES = {

    # ── Spain ──────────────────────────────────────────────────────────────
    "es": {
        "es-employment": {
            "pit.brackets": ES_BRACKETS,
            # mínimo personal is a tax credit in Spain, not a deduction from base.
            # We approximate it as a deduction here; error ~€500-1,400 depending on income.
            "personalAllowance": {"amount": 5550, "currency": "EUR"},
            "notes": (
                "Combined Madrid state+autonomous IRPEF brackets. Employee SS 6.48% capped at "
                "EUR 58,914/year. mínimo personal EUR 5,550 modeled as deduction (actually a "
                "tax credit in Spanish law; Phase 2 approximation, error ~EUR 500-1,400)."
            ),
        },
        "es-beckham": {
            # No brackets needed (flat). Keep SS cap correct.
        },
        "es-autonomo": {
            "pit.brackets": ES_BRACKETS,
            "personalAllowance": {"amount": 5550, "currency": "EUR"},
        },
    },

    # ── Poland ─────────────────────────────────────────────────────────────
    "pl": {
        "pl-employment": {
            "pit.brackets": PL_EMP_BRACKETS,
            # 0% bracket band covers the PLN 30k threshold — remove personalAllowance
            "personalAllowance": None,
            # SS cap: PLN 260,190 ÷ 4.25 = EUR 61,222
            "socialSecurity.cap": 61222,
        },
        "pl-ryczalt-12": {
            # Fix fixed-monthly: PLN 1,773 ÷ 4.25 = EUR 417
            "socialSecurity.monthly": 417,
            "notes": (
                "12% lump-sum tax on revenue (after deducting social ZUS). Healthcare fixed-tier "
                "(PLN 468-1,405/month per revenue bracket) not separately modeled — included in "
                "the fixed monthly SS amount. Social ZUS minimum PLN 1,773/month ≈ EUR 417. "
                "EUR/PLN ≈ 4.25."
            ),
        },
        "pl-ip-box": {
            "socialSecurity.monthly": 417,
            "notes": (
                "5% rate on qualifying IP income (software copyrights, patents). SS same as "
                "JDG Liniowy: social ZUS minimum EUR 417/month. EUR/PLN ≈ 4.25."
            ),
        },
    },

    # ── Ukraine ────────────────────────────────────────────────────────────
    "ua": {
        "ua-fop-group3": {
            # Fix fixed-monthly: UAH 1,902 ÷ 44 = EUR 43
            "socialSecurity.monthly": 43,
            # Fix pit cap: UAH 10,091,049 ÷ 44 = EUR 229,342
            "pit.cap": {"amount": 229342, "currency": "EUR"},
            "notes": (
                "5% single tax on gross revenue (non-VAT) + 1% military levy (Group 3 carve-out). "
                "Fixed ESV UAH 1,902/month ≈ EUR 43/month. Revenue cap UAH 10,091,049 ≈ EUR 229k. "
                "EUR/UAH ≈ 44. No PIT on simplified-system income."
            ),
        },
    },

    # ── Georgia ────────────────────────────────────────────────────────────
    "ge": {
        "ge-sbs": {
            # Fix pit cap: GEL 500,000 ÷ 2.95 = EUR 169,492
            "pit.cap": {"amount": 169492, "currency": "EUR"},
        },
    },

    # ── Albania ────────────────────────────────────────────────────────────
    "al": {
        "al-employment": {
            "pit.brackets": AL_EMP_BRACKETS,
            # personalAllowance: ALL 360,000 ÷ 104 = EUR 3,462 (deduction for gross > ALL 720k)
            "personalAllowance": {"amount": 3462, "currency": "EUR"},
            # SS cap: ALL 2,116,992 ÷ 104 = EUR 20,356
            "socialSecurity.cap": 20356,
        },
        "al-person-fizik": {
            # fixed-monthly: ALL 11,920 ÷ 104 = EUR 115
            "socialSecurity.monthly": 115,
            # pit cap: ALL 14,000,000 ÷ 104 = EUR 134,615
            "pit.cap": {"amount": 134615, "currency": "EUR"},
        },
    },

    # ── Portugal ───────────────────────────────────────────────────────────
    "pt": {
        "pt-employment": {
            "pit.brackets": PT_BRACKETS,
        },
        "pt-ifici": {
            # flat 20%, no brackets needed
        },
        "pt-simplified-b2b": {
            "pit.brackets": PT_BRACKETS,
            # SS effective rate on gross = 21.4% × 70% = 14.98% already set in Phase 1
        },
    },

    # ── Italy ──────────────────────────────────────────────────────────────
    "it": {
        "it-employment": {
            "pit.brackets": IT_EMP_BRACKETS,
        },
        # Forfettario regimes use flat PIT; INPS is percentage — both already correct
    },

    # ── Germany ────────────────────────────────────────────────────────────
    "de": {
        "de-employment": {
            "pit.brackets": DE_BRACKETS,
            # Grundfreibetrag in 0% bracket band — remove personalAllowance
            "personalAllowance": None,
        },
        "de-freiberufler": {
            "pit.brackets": DE_BRACKETS,
            "personalAllowance": None,
            "notes": (
                "Same progressive Einkommensteuer as employment (0%–45%) on net profit after "
                "expenses. No Gewerbesteuer (trade tax). No mandatory employer-side SS. "
                "Health insurance mandatory (GKV or PKV, fully self-paid ~EUR 4,200-8,400/year) "
                "— not modeled in Phase 2. Grundfreibetrag EUR 12,096 embedded in 0% bracket band."
            ),
        },
    },

    # ── France ─────────────────────────────────────────────────────────────
    "fr": {
        "fr-employment": {
            "pit.brackets": FR_BRACKETS,
        },
        "fr-micro-bnc": {
            "pit.brackets": FR_BRACKETS,
        },
    },

    # ── United Kingdom ─────────────────────────────────────────────────────
    "gb": {
        "gb-paye": {
            "pit.brackets": GB_BRACKETS,
            # 0% bracket band covers personalAllowance — remove it
            "personalAllowance": None,
            # Change NIC from broken banded to percentage with cap
            "socialSecurity": {
                "kind": "percentage",
                "rate": 0.08,
                "cap": 59845,   # GBP 50,270 / 0.84 — main rate band top in EUR
            },
            "notes": (
                "Progressive IT 20%/40%/45% (England/Wales/NI). Personal allowance GBP 12,570 "
                "embedded in 0% bracket band (EUR 14,964). Employee Class 1 NIC: 8% on GBP 12,570–"
                "50,270 — modeled as 8% with EUR 59,845 cap (2% above UEL not separately modeled). "
                "GBP/EUR ≈ 0.84."
            ),
        },
        "gb-ltd-outside-ir35": {
            "personalAllowance": None,
            "notes": (
                "Revenue → Ltd Co → CT 19% (≤GBP 50k profit) / 25% (>GBP 250k) with marginal "
                "relief. Minimum salary at personal allowance GBP 12,570. Remaining profit as "
                "dividends: 8.75%/33.75%/39.35% (to Apr 2026); 10.75%/35.75%/39.35% (from Apr "
                "2026). Phase 2 models CT at flat 19% on gross as approximation — dividend tax "
                "not separately computed. IR35 risk not modeled."
            ),
        },
        "gb-sole-trader": {
            "pit.brackets": GB_BRACKETS,
            "personalAllowance": None,
            "socialSecurity": {
                "kind": "percentage",
                "rate": 0.08,
                "cap": 59845,
            },
            "notes": (
                "Progressive IT 20%/40%/45% on net profit. Class 4 NIC 8% on profits "
                "GBP 12,570–50,270 (EUR 14,964–59,845); 2% above GBP 50,270 not separately "
                "modeled. Personal allowance GBP 12,570 embedded in 0% bracket band. "
                "GBP/EUR ≈ 0.84."
            ),
        },
    },

    # ── Netherlands ────────────────────────────────────────────────────────
    # Country-level brackets are correct (from=[0, 38441, 76817]). No bracket embed needed.
    # Tax credits (general + employment credit) not modeled — will show warning in service.
    "nl": {
        "nl-employment": {
            "notes": (
                "Box 1 combined rate includes National Insurance (NI) for type B (age < 67): "
                "37.48% up to EUR 76,817 (includes 27.65% NI); 49.50% above. Health standard "
                "premium ~EUR 1,880/year not modeled in Phase 2. Tax credits (general + employment "
                "credit, up to ~EUR 6,900 at lower incomes) not modeled — effective rate will be "
                "overstated. No additional SS for NL employment beyond what is in Box 1 rate."
            ),
        },
        "nl-zzp": {
            "notes": (
                "Box 1 progressive (same combined rates as employment) on net profit after: "
                "zelfstandigenaftrek EUR 2,470 (2025; EUR 1,200 in 2026), MKB-winstvrijstelling "
                "12.7%. These deductions not modeled in Phase 2 — effective rate will be "
                "overstated. Health insurance income-related 5.26% (capped EUR 75,864) + "
                "standard premium EUR 1,880/year modeled separately."
            ),
        },
    },

    # ── Cyprus ─────────────────────────────────────────────────────────────
    "cy": {
        "cy-employment": {
            "pit.brackets": CY_BRACKETS,
            # 0% bracket band covers the EUR 22,000 personal allowance — remove it
            "personalAllowance": None,
        },
        "cy-non-dom-art8": {
            "pit.brackets": CY_BRACKETS,
            "personalAllowance": None,
            "notes": (
                "50% of employment income exempt from PIT via deductionPercent=50 applied to "
                "gross-SS base before bracket lookup. Non-Dom status: 0% SDC on dividends and "
                "interest (not modeled separately). Art. 8(23A) requires income > EUR 55,000; "
                "Phase 2 applies exemption at all income levels (warn if below EUR 55,000). "
                "EUR 22,000 zero-rate embedded in brackets."
            ),
        },
        "cy-self-employed": {
            "pit.brackets": CY_BRACKETS,
            "personalAllowance": None,
        },
    },

    # ── Bulgaria ───────────────────────────────────────────────────────────
    # Flat PIT — no brackets needed. SS caps already in EUR from Phase 1.
    "bg": {},

    # ── UAE ────────────────────────────────────────────────────────────────
    # Zero PIT — no brackets needed.
    "ae": {},

    # ── United States ──────────────────────────────────────────────────────
    "us": {
        "us-ca-w2": {
            "pit.brackets": US_FEDERAL_BRACKETS,
            # Standard deduction USD 16,100 ÷ 1.08 = EUR 14,907
            "personalAllowance": {"amount": 14907, "currency": "EUR"},
            # SS cap: USD 180,000 ÷ 1.08 = EUR 166,667
            "socialSecurity.cap": 166667,
            "notes": (
                "Federal progressive 10%–37% only (California state tax not separately modeled "
                "in Phase 2 — add ~6-9% for CA). Standard deduction USD 16,100 ≈ EUR 14,907. "
                "FICA 7.65% on gross (capped EUR 166,667 for OASDI). CA SDI 1.1% as additionalLevy. "
                "EUR/USD ≈ 1.08. FICA not deductible from federal income tax (minor approximation error)."
            ),
        },
        "us-ca-1099": {
            "pit.brackets": US_FEDERAL_BRACKETS,
            "personalAllowance": {"amount": 14907, "currency": "EUR"},
            "socialSecurity.cap": 166667,
            "notes": (
                "Federal progressive 10%–37% only (California state not modeled in Phase 2). "
                "Standard deduction USD 16,100 ≈ EUR 14,907. SECA 15.3% on 92.35% of net "
                "earnings — modeled as 15.3% of gross (approximation). 50% SECA deductible "
                "from gross income not modeled. QBI 20% deduction not modeled. EUR/USD ≈ 1.08."
            ),
        },
    },
}

# ── Apply patches ─────────────────────────────────────────────────────────────

def set_nested(obj: dict, dotted_key: str, value) -> None:
    """Set a nested key using dot notation, e.g. 'pit.brackets'."""
    parts = dotted_key.split(".", 1)
    if len(parts) == 1:
        if value is None:
            obj.pop(parts[0], None)
        else:
            obj[parts[0]] = value
    else:
        if parts[0] not in obj:
            obj[parts[0]] = {}
        set_nested(obj[parts[0]], parts[1], value)


with open(DATA_PATH) as f:
    data = json.load(f)

patched_countries = 0
patched_regimes = 0

for country in data["countries"]:
    code = country["code"]
    if code not in PATCHES or not PATCHES[code]:
        continue
    country_patches = PATCHES[code]
    regimes = country.get("computableRegimes", [])
    for regime in regimes:
        rid = regime["id"]
        if rid not in country_patches:
            continue
        regime_patch = country_patches[rid]
        for dotted_key, value in regime_patch.items():
            set_nested(regime, dotted_key, value)
        patched_regimes += 1
    patched_countries += 1

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Patched {patched_regimes} regimes across {patched_countries} countries.")

# Verify bracket injection for key countries
print("\nBracket verification:")
with open(DATA_PATH) as f:
    data = json.load(f)
for c in data["countries"]:
    if c["code"] not in PATCHES:
        continue
    for r in c.get("computableRegimes", []):
        br = r.get("pit", {}).get("brackets")
        if br:
            froms = [b["from"] for b in br]
            # Verify sequential
            sequential = all(froms[i] < froms[i+1] for i in range(len(froms)-1))
            print(f"  {c['code']}/{r['id']}: {len(br)} brackets, sequential={sequential}, froms={froms[:4]}")
