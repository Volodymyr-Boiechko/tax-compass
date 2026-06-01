#!/usr/bin/env node
/**
 * audit-countries.js
 * Reads data/countries.json and reports data quality issues.
 *
 * Output format: SEVERE|WARN|INFO: [COUNTRY_CODE] message
 */

const fs = require('fs');
const path = require('path');

// Resolve data file relative to repo root (two levels up from apps/web/scripts)
const repoRoot = path.resolve(__dirname, '../../..');
const dataFile = path.join(repoRoot, 'data', 'countries.json');

const raw = fs.readFileSync(dataFile, 'utf8');
const { countries } = JSON.parse(raw);

// ── peer groups ──────────────────────────────────────────────────────────────
const ZERO_PIT_EXPECTED = new Set([
  'ae','bh','qa','sa','kw','om','bn','bs','ky','vg','bm','mc'
  // kh (Cambodia) and py (Paraguay) removed — both have genuine progressive PIT per EY/PwC
]);

const HIGH_TAX_EXPECTED = new Set([
  'dk','se','be','fi','fr','no','nl','at','de','it','si'
]);

const SE_HAVEN = new Set([
  'ge','al','bg','cy','pt','it','ua','pl','es','gb','nl','de','fr'
]);

const KNOWN_CURRENCIES = new Set([
  'EUR','USD','GBP','CHF','JPY','CNY','INR','BRL','AUD','CAD',
  'SEK','NOK','DKK','PLN','HUF','CZK','RON','BGN','HRK','RSD',
  'UAH','GEL','AMD','AZN','TRY','SAR','AED','QAR','KWD','BHD',
  'OMR','JOD','ILS','EGP','MAD','TND','DZD','ZAR','KES','NGN',
  'GHS','ETB','TZS','UGX','MWK','MZN','BWP','ZMW','MXN','COP',
  'CLP','PEN','ARS','UYU','PYG','BOB','CRC','GTQ','NIO','HNL',
  'PAB','DOP','HTG','JMD','TTD','BBD','MUR','MGA','XOF','XAF',
  'NAD','SZL','LSL','AWG','ANG','SRD','GYD','BZD','FJD','PGK',
  'NZD','WST','TOP','VUV','SBD','KHR','LAK','MMK','VND','THB',
  'MYR','IDR','PHP','SGD','BND','TWD','HKD','MOP','KZT','UZS',
  'TJS','KGS','TMT','AFN','PKR','LKR','NPR','BTN','MVR','BDT',
  'MNT','KRW','RWF','BIF','DJF',
  // Additional valid ISO 4217 codes not in original list
  'KYD','IQD','SSP','BMD','VGD','MDL'
]);

// ── helpers ──────────────────────────────────────────────────────────────────
const issues = [];

function flag(severity, code, msg) {
  issues.push({ severity, code, msg });
}

function safeRate(v) {
  return typeof v === 'number' ? v : null;
}

// ── main loop ────────────────────────────────────────────────────────────────
for (const c of countries) {
  const code = c.code;
  const pit = c.personalIncomeTax || {};
  const ss = c.socialSecurity || {};
  const er = c.effectiveRates || {};
  const emp = er.employment || {};
  const se = er.bestSelfEmployment || {};
  const sr = c.specialRegimes || [];

  // ── A. Effective rate monotonicity ──────────────────────────────────────
  const TOL = 0.01;
  const empRates = [safeRate(emp['30k']), safeRate(emp['60k']), safeRate(emp['100k'])];
  const seRates  = [safeRate(se['30k']),  safeRate(se['60k']),  safeRate(se['100k'])];

  if (empRates[0] !== null && empRates[1] !== null && empRates[0] > empRates[1] + TOL) {
    flag('WARN', code, `Employment monotonicity violated: 30k(${empRates[0]}) > 60k(${empRates[1]})`);
  }
  if (empRates[1] !== null && empRates[2] !== null && empRates[1] > empRates[2] + TOL) {
    flag('WARN', code, `Employment monotonicity violated: 60k(${empRates[1]}) > 100k(${empRates[2]})`);
  }
  if (seRates[0] !== null && seRates[1] !== null && seRates[0] > seRates[1] + TOL) {
    flag('WARN', code, `SE monotonicity violated: 30k(${seRates[0]}) > 60k(${seRates[1]})`);
  }
  if (seRates[1] !== null && seRates[2] !== null && seRates[1] > seRates[2] + TOL) {
    flag('WARN', code, `SE monotonicity violated: 60k(${seRates[1]}) > 100k(${seRates[2]})`);
  }

  // ── B. Self-employment sanity ────────────────────────────────────────────
  if (empRates[1] !== null && seRates[1] !== null) {
    if (seRates[1] > empRates[1] + 0.05) {
      flag('WARN', code,
        `SE > Employment at 60k by more than 5pp: SE=${seRates[1]}, Emp=${empRates[1]}`);
    }
  }

  // ── C. PIT bracket integrity ─────────────────────────────────────────────
  const brackets = pit.brackets;
  if (brackets && brackets.length > 0) {
    // Strictly increasing from values
    for (let i = 1; i < brackets.length; i++) {
      if (brackets[i].from <= brackets[i-1].from) {
        flag('WARN', code,
          `Bracket from[${i}]=${brackets[i].from} not > from[${i-1}]=${brackets[i-1].from}`);
      }
    }
    // Last bracket to should be null
    if (brackets[brackets.length - 1].to !== null) {
      flag('WARN', code,
        `Last bracket 'to' is not null: ${brackets[brackets.length - 1].to}`);
    }
    // Rates in range
    for (const b of brackets) {
      if (typeof b.rate === 'number' && (b.rate < 0 || b.rate > 0.65)) {
        flag('WARN', code, `Bracket rate out of range [0,0.65]: ${b.rate}`);
      }
    }
  }

  // ── D. PIT topRate sanity ────────────────────────────────────────────────
  if (typeof pit.topRate === 'number') {
    if (pit.topRate < 0 || pit.topRate > 0.65) {
      flag('WARN', code, `topRate out of range [0,0.65]: ${pit.topRate}`);
    }
  }

  // ── E. Zero-PIT peer group check ─────────────────────────────────────────
  if (ZERO_PIT_EXPECTED.has(code)) {
    if (typeof pit.topRate === 'number' && pit.topRate > 0) {
      flag('SEVERE', code,
        `ZERO_PIT_EXPECTED but topRate=${pit.topRate}`);
    }
  }

  // ── F. High-tax peer group check ─────────────────────────────────────────
  if (HIGH_TAX_EXPECTED.has(code)) {
    const emp60 = safeRate(emp['60k']);
    if (emp60 !== null && emp60 < 0.28) {
      flag('WARN', code,
        `HIGH_TAX_EXPECTED but employment 60k=${emp60} < 0.28`);
    }
  }

  // ── G. SE vs Employment for SE-haven countries ───────────────────────────
  if (SE_HAVEN.has(code)) {
    if (seRates[1] !== null && empRates[1] !== null && seRates[1] > empRates[1]) {
      flag('WARN', code,
        `SE_HAVEN but SE 60k(${seRates[1]}) > Employment 60k(${empRates[1]})`);
    }
  }

  // ── H. Parse artifact detection in regime names ──────────────────────────
  // Pattern: starts with €d, B2B digits, 4+ digits, or two+ uppercase letters followed by digits+%
  const ARTIFACT_RE = /^€\d|^B2B\s*(stan|^\d{4,}|^[A-Z]{2,}\s+\d+%$)/;
  for (const regime of sr) {
    if (regime.name && ARTIFACT_RE.test(regime.name)) {
      flag('WARN', code, `Possible parse artifact in specialRegime name: "${regime.name}"`);
    }
  }

  // ── I. effectiveRates range check ────────────────────────────────────────
  for (const [level, val] of Object.entries(emp)) {
    if (level === 'regime') continue;
    const r = safeRate(val);
    if (r !== null) {
      if (r < 0) {
        flag('SEVERE', code, `employment[${level}] is negative: ${r}`);
      } else if (r > 0.70) {
        flag('SEVERE', code, `employment[${level}] > 0.70: ${r}`);
      }
    }
  }
  for (const [level, val] of Object.entries(se)) {
    if (level === 'regime') continue;
    const r = safeRate(val);
    if (r !== null) {
      if (r < 0) {
        flag('SEVERE', code, `bestSelfEmployment[${level}] is negative: ${r}`);
      } else if (r > 0.70) {
        flag('SEVERE', code, `bestSelfEmployment[${level}] > 0.70: ${r}`);
      }
    }
  }

  // ── J. Currency check ────────────────────────────────────────────────────
  const currency = pit.currency;
  if (currency !== null && currency !== undefined) {
    if (!KNOWN_CURRENCIES.has(currency)) {
      flag('WARN', code, `Unknown currency: "${currency}"`);
    }
  }
}

// ── summary ──────────────────────────────────────────────────────────────────
const severeCount = issues.filter(i => i.severity === 'SEVERE').length;
const warnCount   = issues.filter(i => i.severity === 'WARN').length;
const infoCount   = issues.filter(i => i.severity === 'INFO').length;

for (const { severity, code, msg } of issues) {
  console.log(`${severity}: [${code}] ${msg}`);
}

console.log('');
console.log(`=== SUMMARY ===`);
console.log(`Total issues: ${issues.length}  SEVERE: ${severeCount}  WARN: ${warnCount}  INFO: ${infoCount}`);
