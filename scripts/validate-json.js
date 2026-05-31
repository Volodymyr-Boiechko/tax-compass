#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'countries.json');
let data;

// 1. Parse JSON
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log('✅ JSON syntax valid');
} catch (e) {
  console.error('❌ JSON parse error:', e.message);
  process.exit(1);
}

const countries = data.countries;
const errors = [];
const warnings = [];

// 2. Count
if (countries.length !== 147) {
  errors.push(`Expected 147 countries, got ${countries.length}`);
} else {
  console.log(`✅ Country count: ${countries.length}`);
}

// 3. Required fields
const required = ['code', 'name', 'flag', 'region', 'confidence'];
let reqFail = 0;
for (const c of countries) {
  for (const f of required) {
    if (!c[f]) {
      errors.push(`Missing ${f} in: ${c.name || c.code}`);
      reqFail++;
    }
  }
}
if (reqFail === 0) {
  console.log(`✅ All required fields present (code, name, flag, region, confidence)`);
} else {
  console.log(`❌ ${reqFail} missing required fields`);
}

// 4. effectiveRates structure
let rateMissing = 0;
for (const c of countries) {
  if (!c.effectiveRates) { rateMissing++; continue; }
  if (!c.effectiveRates.employment) rateMissing++;
  if (!c.effectiveRates.bestSelfEmployment) rateMissing++;
}
if (rateMissing === 0) {
  console.log(`✅ effectiveRates.employment and bestSelfEmployment present in all entries`);
} else {
  warnings.push(`${rateMissing} entries missing effectiveRates sub-fields`);
  console.log(`⚠️  ${rateMissing} entries missing effectiveRates sub-fields`);
}

// 5. Effective rates populated
let ratePopulated = 0;
let rateEmpty = 0;
for (const c of countries) {
  const er = c.effectiveRates?.employment;
  if (er && (er['30k'] !== null || er['60k'] !== null || er['100k'] !== null)) {
    ratePopulated++;
  } else {
    rateEmpty++;
    if (rateEmpty <= 5) warnings.push(`No effective rate data: ${c.name}`);
  }
}
console.log(`   ${ratePopulated} countries have at least one employment effective rate`);
console.log(`   ${rateEmpty} countries have no effective rate data (zero-tax or unknown jurisdictions expected)`);

// 6. Duplicate codes
const codes = countries.map(c => c.code);
const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
if (dupes.length > 0) {
  warnings.push(`Duplicate country codes: ${[...new Set(dupes)].join(', ')}`);
}

// 7. Summary
console.log(`\n--- Metadata coverage ---`);
const withPwC = countries.filter(c => c.sources?.pwc).length;
const withCV = countries.filter(c => c.crossVerification?.status).length;
const withBrackets = countries.filter(c => c.personalIncomeTax?.brackets?.length > 0).length;
const withSpecial = countries.filter(c => c.specialRegimes?.length > 0).length;
console.log(`  PwC URL: ${withPwC} / 147`);
console.log(`  Cross-verification status: ${withCV} / 147`);
console.log(`  PIT brackets extracted: ${withBrackets} / 147`);
console.log(`  Special regimes noted: ${withSpecial} / 147`);

console.log(`\n--- Confidence distribution ---`);
const conf = {};
for (const c of countries) {
  const k = c.confidence || 'null';
  conf[k] = (conf[k] || 0) + 1;
}
for (const [k, v] of Object.entries(conf).sort()) {
  console.log(`  ${k}: ${v}`);
}

console.log(`\n--- Region distribution ---`);
const reg = {};
for (const c of countries) {
  const k = c.region || 'null';
  reg[k] = (reg[k] || 0) + 1;
}
for (const [k, v] of Object.entries(reg).sort()) {
  console.log(`  ${k}: ${v}`);
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log('  ', e));
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  Warnings (non-blocking):');
  warnings.forEach(w => console.log('  ', w));
  console.log('\n✅ Validation passed with warnings.');
} else {
  console.log('\n✅ Validation passed — no errors.');
}
