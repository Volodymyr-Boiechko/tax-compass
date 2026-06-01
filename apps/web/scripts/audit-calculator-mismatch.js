#!/usr/bin/env node
/**
 * Audit: compare legacy CalculationService dynamic result vs stored effectiveRates.
 * Flags countries where they differ by more than 5pp.
 * Outputs both console summary and data/extracted/calculator-mismatch.md.
 */

const fs = require('fs');
const path = require('path');
const DATA = path.resolve(__dirname, '../../../data/countries.json');
const REPORT = path.resolve(__dirname, '../../../data/extracted/calculator-mismatch.md');

const COMPUTABLE = new Set(['al','bg','cy','fr','ge','de','it','nl','pl','pt','es','ua','ae','gb','us']);
const GROSS = 60_000;

const { countries } = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function bracketsValid(brackets, currency) {
  if (!brackets || brackets.length === 0) return false;
  if (currency != null && currency !== 'EUR') return false;
  for (let i = 1; i < brackets.length; i++) {
    if (brackets[i].from <= brackets[i-1].from) return false;
  }
  return true;
}

function applyBrackets(brackets, taxable) {
  let tax = 0;
  for (const b of brackets) {
    if (taxable <= b.from) break;
    const upper = b.to !== null ? b.to : Infinity;
    const inBand = Math.min(taxable, upper) - b.from;
    if (inBand > 0) tax += inBand * b.rate;
  }
  return tax;
}

function interpolateStoredRate(rates, gross) {
  if (!rates) return null;
  if (gross <= 30000) return rates['30k'] ?? rates['60k'] ?? rates['100k'] ?? null;
  if (gross <= 60000) return rates['60k'] ?? rates['30k'] ?? rates['100k'] ?? null;
  return rates['100k'] ?? rates['60k'] ?? rates['30k'] ?? null;
}

function simCurrent(c, gross) {
  // Simulates CURRENT CalculationService (before fix)
  const pit = c.personalIncomeTax || {};
  const ss = c.socialSecurity || {};
  let ssAmt = 0;
  if (ss.employeeRate != null) {
    const base = ss.annualCap != null ? Math.min(gross, ss.annualCap) : gross;
    ssAmt = base * ss.employeeRate;
  }
  const taxable = Math.max(0, gross - ssAmt);
  let pitAmt = 0;
  if (bracketsValid(pit.brackets, pit.currency)) {
    pitAmt = applyBrackets(pit.brackets, taxable);
  } else if (pit.topRate != null) {
    pitAmt = taxable * pit.topRate;
  }
  const net = gross - ssAmt - pitAmt;
  return 1 - net / gross;
}

function simFixed(c, gross) {
  // Simulates NEW CalculationService (after fix): brackets → stored → topRate → null
  const pit = c.personalIncomeTax || {};
  const ss = c.socialSecurity || {};
  let ssAmt = 0;
  if (ss.employeeRate != null) {
    const base = ss.annualCap != null ? Math.min(gross, ss.annualCap) : gross;
    ssAmt = base * ss.employeeRate;
  }
  const taxable = Math.max(0, gross - ssAmt);

  if (bracketsValid(pit.brackets, pit.currency)) {
    const pitAmt = applyBrackets(pit.brackets, taxable);
    const net = gross - ssAmt - pitAmt;
    return 1 - net / gross;
  }

  const stored = interpolateStoredRate(c.effectiveRates?.employment, gross);
  if (stored != null) return stored;

  if (pit.topRate != null) {
    const pitAmt = taxable * pit.topRate;
    const net = gross - ssAmt - pitAmt;
    return 1 - net / gross;
  }

  return null;
}

const rows = [];
let mismatchesBefore = 0, mismatchesAfter = 0;

for (const c of countries) {
  if (COMPUTABLE.has(c.code)) continue;
  const stored = c.effectiveRates?.employment?.['60k'];
  if (stored == null) continue;

  const dynBefore = simCurrent(c, GROSS);
  const dynAfter = simFixed(c, GROSS);
  const diffBefore = Math.abs(dynBefore - stored);
  const diffAfter = dynAfter != null ? Math.abs(dynAfter - stored) : 1;

  if (diffBefore > 0.05) mismatchesBefore++;
  if (diffAfter > 0.05) mismatchesAfter++;

  if (diffBefore > 0.05 || diffAfter > 0.05) {
    const action = diffAfter < 0.001 ? '✅ fixed' : diffAfter < 0.05 ? '⚠️ improved' : '❌ still off';
    rows.push({ code: c.code.toUpperCase(), name: c.name, stored, dynBefore, dynAfter, diffBefore, diffAfter, action });
  }
}

rows.sort((a, b) => b.diffBefore - a.diffBefore);

// Console output
console.log(`=== Calculator Mismatch Audit (${GROSS / 1000}k EUR) ===`);
console.log(`Mismatches >5pp BEFORE fix: ${mismatchesBefore}`);
console.log(`Mismatches >5pp AFTER fix:  ${mismatchesAfter}`);
console.log(`Countries resolved:         ${mismatchesBefore - mismatchesAfter}\n`);
console.log('Code  Country                        Stored  Before   After  Action');
console.log('-'.repeat(75));
for (const r of rows) {
  const aft = r.dynAfter != null ? `${(r.dynAfter*100).toFixed(1)}%` : 'null';
  console.log(`${r.code.padEnd(5)} ${r.name.padEnd(30)} ${(r.stored*100).toFixed(1).padStart(6)}% ${(r.dynBefore*100).toFixed(1).padStart(6)}% ${aft.padStart(6)} ${r.action}`);
}

// Markdown report
const pct = r => r != null ? `${(r*100).toFixed(1)}%` : '—';
const md = [
  '# Calculator Mismatch Audit',
  '',
  `**Income tested:** €${GROSS.toLocaleString()}  `,
  `**Countries with computableRegimes (excluded):** ${COMPUTABLE.size}  `,
  `**Countries audited:** ${rows.length + (countries.length - COMPUTABLE.size - rows.length)}`,
  '',
  '## Summary',
  '',
  `| Metric | Count |`,
  `|--------|-------|`,
  `| Mismatches >5pp before fix | ${mismatchesBefore} |`,
  `| Mismatches >5pp after fix | ${mismatchesAfter} |`,
  `| Countries resolved | ${mismatchesBefore - mismatchesAfter} |`,
  '',
  '## Countries with >5pp mismatch (before or after fix)',
  '',
  '| Country | Stored 60k | Before Fix | After Fix | Action |',
  '|---------|------------|------------|-----------|--------|',
  ...rows.map(r => `| ${r.code} ${r.name} | ${pct(r.stored)} | ${pct(r.dynBefore)} | ${pct(r.dynAfter)} | ${r.action} |`),
  '',
  '## Fix method',
  'New fallback hierarchy in CalculationService:',
  '1. Valid EUR brackets → progressive calculation',
  '2. Stored effectiveRates → use as source of truth (`isDerived: true`)',
  '3. topRate flat → last resort approximation',
  '4. null → show "—" in UI',
];
fs.writeFileSync(REPORT, md.join('\n'));
console.log(`\nReport written to: ${REPORT}`);
