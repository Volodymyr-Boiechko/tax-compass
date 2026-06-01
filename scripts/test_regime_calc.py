#!/usr/bin/env python3
"""
Sanity tests for Phase 2 RegimeCalculationService logic — implemented in Python
to avoid Angular/TypeScript runner setup. Mirrors the TypeScript service exactly.
"""
import json, math

DATA_PATH = "/Users/boiechko/IdeaProjects/tax-compass/data/countries.json"

with open(DATA_PATH) as f:
    data = json.load(f)

countries = {c["code"]: c for c in data["countries"]}

# ── Python mirror of RegimeCalculationService ──────────────────────────────

def pit_base(regime, gross, ss):
    pit = regime["pit"]
    kind = pit["kind"]
    applies_to = pit["appliesTo"]
    deduct = pit.get("deductionPercent", 0) / 100

    if kind == "zero":
        return 0
    if kind == "lump-sum":
        return gross
    if kind == "flat":
        if applies_to == "taxable":
            return gross * (1 - deduct)
        return gross  # gross/revenue/profit
    # progressive
    if applies_to == "taxable":
        if deduct > 0:
            return gross * (1 - deduct)
        return max(0, gross - ss)
    if applies_to in ("revenue", "gross"):
        return gross * (1 - deduct)
    return max(0, gross - ss)  # profit


def apply_brackets(brackets, taxable):
    if taxable <= 0:
        return 0
    total = 0
    for b in brackets:
        if taxable <= b["from"]:
            break
        upper = b["to"] if b["to"] is not None else math.inf
        in_band = min(taxable, upper) - b["from"]
        if in_band > 0:
            total += in_band * b["rate"]
    return total


def compute_pit(regime, country, pit_b, gross):
    pit = regime["pit"]
    kind = pit["kind"]
    warnings = []

    if kind == "zero":
        return 0, warnings
    if kind == "lump-sum":
        rate = pit.get("rate", 0)
        cap = pit.get("cap", {}).get("amount")
        base = min(gross, cap) if cap else gross
        return base * rate, warnings
    if kind == "flat":
        rate = pit.get("rate", 0)
        return pit_b * rate, warnings
    # progressive
    brackets = pit.get("brackets")
    if not brackets:
        cb = (country.get("personalIncomeTax") or {}).get("brackets")
        if cb:
            # validate
            valid = all(cb[i]["from"] < cb[i+1]["from"] for i in range(len(cb)-1))
            if valid:
                brackets = cb
    if not brackets:
        top = (country.get("personalIncomeTax") or {}).get("topRate", 0)
        warnings.append(f"No valid brackets; using topRate {top:.1%}")
        brackets = [{"from": 0, "to": None, "rate": top}]
    return apply_brackets(brackets, pit_b), warnings


def compute_ss(ss_cfg, gross):
    kind = ss_cfg["kind"]
    if kind == "none":
        return 0
    if kind == "percentage":
        rate = ss_cfg.get("rate", 0)
        cap = ss_cfg.get("cap")
        base = min(gross, cap) if cap else gross
        return base * rate
    if kind == "fixed-monthly":
        return (ss_cfg.get("monthly") or 0) * 12
    if kind == "banded":
        bands = ss_cfg.get("bands", [])
        band = next((b for b in bands if b["upTo"] is None or gross <= b["upTo"]), bands[-1])
        return (band.get("monthly") or 0) * 12
    return 0


def compute_levies(regime, gross):
    levies = regime.get("additionalLevies", []) or []
    total = 0
    for lv in levies:
        total += gross * lv["rate"]
    return total


def calculate(country, regime_id, gross):
    regime = next((r for r in country.get("computableRegimes", []) if r["id"] == regime_id), None)
    if not regime:
        return None

    ss = compute_ss(regime["socialSecurity"], gross)
    levies = compute_levies(regime, gross)
    pb = pit_base(regime, gross, ss)

    # Subtract personalAllowance for progressive PIT
    pit_cfg = regime["pit"]
    if pit_cfg["kind"] == "progressive" and regime.get("personalAllowance"):
        pa_amount = regime["personalAllowance"]["amount"]
        pb = max(0, pb - pa_amount)

    pit, warnings = compute_pit(regime, country, pb, gross)
    net = gross - ss - pit - levies
    eff = 1 - net / gross if gross > 0 else 0
    return {"ss": ss, "pit": pit, "levies": levies, "net": net, "eff": eff, "warnings": warnings}


# ── Sanity tests ───────────────────────────────────────────────────────────

GROSS = 60_000  # EUR

tests = [
    # (country_code, regime_id, expected_net_range, expected_eff_range, description)
    ("es", "es-beckham",     (38_000, 44_000), (0.27, 0.37), "ES Beckham Law: 24% flat + SS 6.48%"),
    ("es", "es-autonomo",    (38_000, 43_000), (0.28, 0.38), "ES Autónomo: progressive + RETA banded"),
    ("pl", "pl-ryczalt-12",  (44_000, 52_000), (0.13, 0.27), "PL Ryczałt 12%: lump-sum + fixed ZUS"),
    ("ua", "ua-fop-group3",  (52_000, 58_000), (0.03, 0.12), "UA ФОП Group 3: 5%+1% + ESV"),
    ("ge", "ge-sbs",         (58_800, 60_000), (0.00, 0.02), "GE SBS 1%: 1% on revenue"),
    ("al", "al-person-fizik",(57_000, 59_500), (0.01, 0.04), "AL Person Fizik 0%: fixed SS only"),
    ("it", "it-forfettario-15",(36_000,42_000),(0.30, 0.42), "IT Forfettario 15%: 15% on 78% + INPS"),
    ("ae", "ae-employment",  (59_990, 60_010), (0.00, 0.00), "AE Employment: 0% all-in"),
]

print(f"{'Regime':<40} {'Net':>8} {'Eff%':>6}  Range       Status   Warnings")
print("-" * 95)

all_pass = True
for cc, rid, net_range, eff_range, desc in tests:
    r = calculate(countries[cc], rid, GROSS)
    if r is None:
        print(f"  {desc:<38} REGIME NOT FOUND")
        all_pass = False
        continue
    net, eff = r["net"], r["eff"]
    net_ok = net_range[0] <= net <= net_range[1]
    eff_ok = eff_range[0] <= eff <= eff_range[1]
    status = "✓" if (net_ok and eff_ok) else "✗ FAIL"
    if not (net_ok and eff_ok):
        all_pass = False
    warn = "; ".join(r["warnings"][:1]) if r["warnings"] else ""
    print(f"  {desc:<38} {net:>8,.0f} {eff:>5.1%}  {str(net_range):>14}  {status}  {warn}")

print()

# Detailed breakdown for key regimes
print("── Detailed breakdown at €60,000 ──")
for cc, rid in [("es","es-beckham"),("it","it-forfettario-15"),("ua","ua-fop-group3")]:
    r = calculate(countries[cc], rid, GROSS)
    if not r: continue
    regime = next(rx for rx in countries[cc]["computableRegimes"] if rx["id"] == rid)
    print(f"\n  {regime['name']} [{cc.upper()}]")
    print(f"    SS:       {r['ss']:>8,.0f} EUR")
    print(f"    PIT:      {r['pit']:>8,.0f} EUR")
    print(f"    Levies:   {r['levies']:>8,.0f} EUR")
    print(f"    Net:      {r['net']:>8,.0f} EUR")
    print(f"    Eff rate: {r['eff']:>8.1%}")
    if r["warnings"]:
        print(f"    ⚠ {r['warnings'][0]}")

print()
print("All tests passed ✓" if all_pass else "SOME TESTS FAILED ✗")
