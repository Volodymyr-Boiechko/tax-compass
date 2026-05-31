#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Country metadata: filename-slug → { code, name, flag, region }
// ---------------------------------------------------------------------------
const META = {
  'albania':              { code: 'al', name: 'Albania',                    flag: '🇦🇱', region: 'southern-europe' },
  'algeria':              { code: 'dz', name: 'Algeria',                    flag: '🇩🇿', region: 'africa' },
  'angola':               { code: 'ao', name: 'Angola',                     flag: '🇦🇴', region: 'africa' },
  'argentina':            { code: 'ar', name: 'Argentina',                  flag: '🇦🇷', region: 'south-america' },
  'armenia':              { code: 'am', name: 'Armenia',                    flag: '🇦🇲', region: 'eastern-europe' },
  'aruba':                { code: 'aw', name: 'Aruba',                      flag: '🇦🇼', region: 'caribbean' },
  'australia':            { code: 'au', name: 'Australia',                  flag: '🇦🇺', region: 'pacific' },
  'austria':              { code: 'at', name: 'Austria',                    flag: '🇦🇹', region: 'western-europe' },
  'azerbaijan':           { code: 'az', name: 'Azerbaijan',                 flag: '🇦🇿', region: 'eastern-europe' },
  'bahamas':              { code: 'bs', name: 'Bahamas',                    flag: '🇧🇸', region: 'caribbean' },
  'bahrain':              { code: 'bh', name: 'Bahrain',                    flag: '🇧🇭', region: 'middle-east' },
  'barbados':             { code: 'bb', name: 'Barbados',                   flag: '🇧🇧', region: 'caribbean' },
  'belgium':              { code: 'be', name: 'Belgium',                    flag: '🇧🇪', region: 'western-europe' },
  'bermuda':              { code: 'bm', name: 'Bermuda',                    flag: '🇧🇲', region: 'caribbean' },
  'bes-islands':          { code: 'bq', name: 'BES Islands',                flag: '🇧🇶', region: 'caribbean' },
  'bolivia':              { code: 'bo', name: 'Bolivia',                    flag: '🇧🇴', region: 'south-america' },
  'bosnia-herzegovina':   { code: 'ba', name: 'Bosnia and Herzegovina',     flag: '🇧🇦', region: 'southern-europe' },
  'botswana':             { code: 'bw', name: 'Botswana',                   flag: '🇧🇼', region: 'africa' },
  'brazil':               { code: 'br', name: 'Brazil',                     flag: '🇧🇷', region: 'south-america' },
  'british-virgin-islands': { code: 'vg', name: 'British Virgin Islands',  flag: '🇻🇬', region: 'caribbean' },
  'brunei-darussalam':    { code: 'bn', name: 'Brunei Darussalam',          flag: '🇧🇳', region: 'southeast-asia' },
  'bulgaria':             { code: 'bg', name: 'Bulgaria',                   flag: '🇧🇬', region: 'eastern-europe' },
  'cambodia':             { code: 'kh', name: 'Cambodia',                   flag: '🇰🇭', region: 'southeast-asia' },
  'canada':               { code: 'ca', name: 'Canada',                     flag: '🇨🇦', region: 'north-america' },
  'cape-verde':           { code: 'cv', name: 'Cape Verde',                 flag: '🇨🇻', region: 'africa' },
  'cayman-islands':       { code: 'ky', name: 'Cayman Islands',             flag: '🇰🇾', region: 'caribbean' },
  'chile':                { code: 'cl', name: 'Chile',                      flag: '🇨🇱', region: 'south-america' },
  'china-mainland':       { code: 'cn', name: 'China (Mainland)',           flag: '🇨🇳', region: 'east-asia' },
  'colombia':             { code: 'co', name: 'Colombia',                   flag: '🇨🇴', region: 'south-america' },
  'costa-rica':           { code: 'cr', name: 'Costa Rica',                 flag: '🇨🇷', region: 'central-america' },
  'croatia':              { code: 'hr', name: 'Croatia',                    flag: '🇭🇷', region: 'southern-europe' },
  'curacao':              { code: 'cw', name: 'Curaçao',                    flag: '🇨🇼', region: 'caribbean' },
  'cyprus':               { code: 'cy', name: 'Cyprus',                     flag: '🇨🇾', region: 'southern-europe' },
  'czech-republic':       { code: 'cz', name: 'Czech Republic',             flag: '🇨🇿', region: 'eastern-europe' },
  'denmark':              { code: 'dk', name: 'Denmark',                    flag: '🇩🇰', region: 'northern-europe' },
  'ecuador':              { code: 'ec', name: 'Ecuador',                    flag: '🇪🇨', region: 'south-america' },
  'egypt':                { code: 'eg', name: 'Egypt',                      flag: '🇪🇬', region: 'africa' },
  'el-salvador':          { code: 'sv', name: 'El Salvador',                flag: '🇸🇻', region: 'central-america' },
  'estonia':              { code: 'ee', name: 'Estonia',                    flag: '🇪🇪', region: 'northern-europe' },
  'ethiopia':             { code: 'et', name: 'Ethiopia',                   flag: '🇪🇹', region: 'africa' },
  'finland':              { code: 'fi', name: 'Finland',                    flag: '🇫🇮', region: 'northern-europe' },
  'france':               { code: 'fr', name: 'France',                     flag: '🇫🇷', region: 'western-europe' },
  'georgia':              { code: 'ge', name: 'Georgia',                    flag: '🇬🇪', region: 'eastern-europe' },
  'germany':              { code: 'de', name: 'Germany',                    flag: '🇩🇪', region: 'western-europe' },
  'ghana':                { code: 'gh', name: 'Ghana',                      flag: '🇬🇭', region: 'africa' },
  'greece':               { code: 'gr', name: 'Greece',                     flag: '🇬🇷', region: 'southern-europe' },
  'guam':                 { code: 'gu', name: 'Guam',                       flag: '🇬🇺', region: 'pacific' },
  'guatemala':            { code: 'gt', name: 'Guatemala',                  flag: '🇬🇹', region: 'central-america' },
  'hong-kong':            { code: 'hk', name: 'Hong Kong SAR',              flag: '🇭🇰', region: 'east-asia' },
  'hungary':              { code: 'hu', name: 'Hungary',                    flag: '🇭🇺', region: 'eastern-europe' },
  'iceland':              { code: 'is', name: 'Iceland',                    flag: '🇮🇸', region: 'northern-europe' },
  'india':                { code: 'in', name: 'India',                      flag: '🇮🇳', region: 'south-asia' },
  'indonesia':            { code: 'id', name: 'Indonesia',                  flag: '🇮🇩', region: 'southeast-asia' },
  'ireland':              { code: 'ie', name: 'Ireland',                    flag: '🇮🇪', region: 'northern-europe' },
  'isle-of-man':          { code: 'im', name: 'Isle of Man',                flag: '🇮🇲', region: 'northern-europe' },
  'israel':               { code: 'il', name: 'Israel',                     flag: '🇮🇱', region: 'middle-east' },
  'italy':                { code: 'it', name: 'Italy',                      flag: '🇮🇹', region: 'southern-europe' },
  'ivory-coast':          { code: 'ci', name: "Côte d'Ivoire",              flag: '🇨🇮', region: 'africa' },
  'jamaica':              { code: 'jm', name: 'Jamaica',                    flag: '🇯🇲', region: 'caribbean' },
  'japan':                { code: 'jp', name: 'Japan',                      flag: '🇯🇵', region: 'east-asia' },
  'jordan':               { code: 'jo', name: 'Jordan',                     flag: '🇯🇴', region: 'middle-east' },
  'kazakhstan':           { code: 'kz', name: 'Kazakhstan',                 flag: '🇰🇿', region: 'central-asia' },
  'kenya':                { code: 'ke', name: 'Kenya',                      flag: '🇰🇪', region: 'africa' },
  'korea-south':          { code: 'kr', name: 'Korea (South)',              flag: '🇰🇷', region: 'east-asia' },
  'kosovo':               { code: 'xk', name: 'Kosovo',                     flag: '🇽🇰', region: 'southern-europe' },
  'kuwait':               { code: 'kw', name: 'Kuwait',                     flag: '🇰🇼', region: 'middle-east' },
  'latvia':               { code: 'lv', name: 'Latvia',                     flag: '🇱🇻', region: 'northern-europe' },
  'lesotho':              { code: 'ls', name: 'Lesotho',                    flag: '🇱🇸', region: 'africa' },
  'libya':                { code: 'ly', name: 'Libya',                      flag: '🇱🇾', region: 'africa' },
  'liechtenstein':        { code: 'li', name: 'Liechtenstein',              flag: '🇱🇮', region: 'western-europe' },
  'lithuania':            { code: 'lt', name: 'Lithuania',                  flag: '🇱🇹', region: 'northern-europe' },
  'luxembourg':           { code: 'lu', name: 'Luxembourg',                 flag: '🇱🇺', region: 'western-europe' },
  'malawi':               { code: 'mw', name: 'Malawi',                     flag: '🇲🇼', region: 'africa' },
  'malaysia':             { code: 'my', name: 'Malaysia',                   flag: '🇲🇾', region: 'southeast-asia' },
  'maldives':             { code: 'mv', name: 'Maldives',                   flag: '🇲🇻', region: 'south-asia' },
  'malta':                { code: 'mt', name: 'Malta',                      flag: '🇲🇹', region: 'southern-europe' },
  'mauritius':            { code: 'mu', name: 'Mauritius',                  flag: '🇲🇺', region: 'africa' },
  'mexico':               { code: 'mx', name: 'Mexico',                     flag: '🇲🇽', region: 'north-america' },
  'moldova':              { code: 'md', name: 'Moldova',                    flag: '🇲🇩', region: 'eastern-europe' },
  'monaco':               { code: 'mc', name: 'Monaco',                     flag: '🇲🇨', region: 'western-europe' },
  'mongolia':             { code: 'mn', name: 'Mongolia',                   flag: '🇲🇳', region: 'east-asia' },
  'montenegro':           { code: 'me', name: 'Montenegro',                 flag: '🇲🇪', region: 'southern-europe' },
  'morocco':              { code: 'ma', name: 'Morocco',                    flag: '🇲🇦', region: 'africa' },
  'mozambique':           { code: 'mz', name: 'Mozambique',                 flag: '🇲🇿', region: 'africa' },
  'myanmar':              { code: 'mm', name: 'Myanmar',                    flag: '🇲🇲', region: 'southeast-asia' },
  'namibia':              { code: 'na', name: 'Namibia',                    flag: '🇳🇦', region: 'africa' },
  'netherlands':          { code: 'nl', name: 'Netherlands',                flag: '🇳🇱', region: 'western-europe' },
  'new-zealand':          { code: 'nz', name: 'New Zealand',                flag: '🇳🇿', region: 'pacific' },
  'nigeria':              { code: 'ng', name: 'Nigeria',                    flag: '🇳🇬', region: 'africa' },
  'north-macedonia':      { code: 'mk', name: 'North Macedonia',            flag: '🇲🇰', region: 'southern-europe' },
  'northern-mariana-islands': { code: 'mp', name: 'Northern Mariana Islands', flag: '🇲🇵', region: 'pacific' },
  'norway':               { code: 'no', name: 'Norway',                     flag: '🇳🇴', region: 'northern-europe' },
  'oman':                 { code: 'om', name: 'Oman',                       flag: '🇴🇲', region: 'middle-east' },
  'pakistan':             { code: 'pk', name: 'Pakistan',                   flag: '🇵🇰', region: 'south-asia' },
  'panama':               { code: 'pa', name: 'Panama',                     flag: '🇵🇦', region: 'central-america' },
  'paraguay':             { code: 'py', name: 'Paraguay',                   flag: '🇵🇾', region: 'south-america' },
  'peru':                 { code: 'pe', name: 'Peru',                       flag: '🇵🇪', region: 'south-america' },
  'philippines':          { code: 'ph', name: 'Philippines',                flag: '🇵🇭', region: 'southeast-asia' },
  'poland':               { code: 'pl', name: 'Poland',                     flag: '🇵🇱', region: 'eastern-europe' },
  'portugal':             { code: 'pt', name: 'Portugal',                   flag: '🇵🇹', region: 'southern-europe' },
  'qatar':                { code: 'qa', name: 'Qatar',                      flag: '🇶🇦', region: 'middle-east' },
  'romania':              { code: 'ro', name: 'Romania',                    flag: '🇷🇴', region: 'eastern-europe' },
  'russia':               { code: 'ru', name: 'Russia',                     flag: '🇷🇺', region: 'eastern-europe' },
  'rwanda':               { code: 'rw', name: 'Rwanda',                     flag: '🇷🇼', region: 'africa' },
  'saudi-arabia':         { code: 'sa', name: 'Saudi Arabia',               flag: '🇸🇦', region: 'middle-east' },
  'senegal':              { code: 'sn', name: 'Senegal',                    flag: '🇸🇳', region: 'africa' },
  'serbia':               { code: 'rs', name: 'Serbia',                     flag: '🇷🇸', region: 'southern-europe' },
  'singapore':            { code: 'sg', name: 'Singapore',                  flag: '🇸🇬', region: 'southeast-asia' },
  'sint-maarten':         { code: 'sx', name: 'Sint Maarten',               flag: '🇸🇽', region: 'caribbean' },
  'slovakia':             { code: 'sk', name: 'Slovakia',                   flag: '🇸🇰', region: 'eastern-europe' },
  'slovenia':             { code: 'si', name: 'Slovenia',                   flag: '🇸🇮', region: 'southern-europe' },
  'south-africa':         { code: 'za', name: 'South Africa',               flag: '🇿🇦', region: 'africa' },
  'south-sudan':          { code: 'ss', name: 'South Sudan',                flag: '🇸🇸', region: 'africa' },
  'spain':                { code: 'es', name: 'Spain',                      flag: '🇪🇸', region: 'southern-europe' },
  'sri-lanka':            { code: 'lk', name: 'Sri Lanka',                  flag: '🇱🇰', region: 'south-asia' },
  'suriname':             { code: 'sr', name: 'Suriname',                   flag: '🇸🇷', region: 'south-america' },
  'sweden':               { code: 'se', name: 'Sweden',                     flag: '🇸🇪', region: 'northern-europe' },
  'switzerland':          { code: 'ch', name: 'Switzerland',                flag: '🇨🇭', region: 'western-europe' },
  'taiwan':               { code: 'tw', name: 'Taiwan',                     flag: '🇹🇼', region: 'east-asia' },
  'tanzania':             { code: 'tz', name: 'Tanzania',                   flag: '🇹🇿', region: 'africa' },
  'thailand':             { code: 'th', name: 'Thailand',                   flag: '🇹🇭', region: 'southeast-asia' },
  'trinidad-tobago':      { code: 'tt', name: 'Trinidad and Tobago',        flag: '🇹🇹', region: 'caribbean' },
  'tunisia':              { code: 'tn', name: 'Tunisia',                    flag: '🇹🇳', region: 'africa' },
  'turkiye':              { code: 'tr', name: 'Türkiye',                    flag: '🇹🇷', region: 'eastern-europe' },
  'uganda':               { code: 'ug', name: 'Uganda',                     flag: '🇺🇬', region: 'africa' },
  'ukraine':              { code: 'ua', name: 'Ukraine',                    flag: '🇺🇦', region: 'eastern-europe' },
  'united-arab-emirates': { code: 'ae', name: 'United Arab Emirates',       flag: '🇦🇪', region: 'middle-east' },
  'united-kingdom':       { code: 'gb', name: 'United Kingdom',             flag: '🇬🇧', region: 'northern-europe' },
  'united-states':        { code: 'us', name: 'United States',              flag: '🇺🇸', region: 'north-america' },
  'uruguay':              { code: 'uy', name: 'Uruguay',                    flag: '🇺🇾', region: 'south-america' },
  'us-virgin-islands':    { code: 'vi', name: 'US Virgin Islands',          flag: '🇻🇮', region: 'caribbean' },
  'uzbekistan':           { code: 'uz', name: 'Uzbekistan',                 flag: '🇺🇿', region: 'central-asia' },
  'venezuela':            { code: 've', name: 'Venezuela',                  flag: '🇻🇪', region: 'south-america' },
  'vietnam':              { code: 'vn', name: 'Vietnam',                    flag: '🇻🇳', region: 'southeast-asia' },
  'zambia':               { code: 'zm', name: 'Zambia',                     flag: '🇿🇲', region: 'africa' },
  'zimbabwe':             { code: 'zw', name: 'Zimbabwe',                   flag: '🇿🇼', region: 'africa' },
  'sao-tome-and-principe': { code: 'st', name: 'São Tomé and Príncipe',    flag: '🇸🇹', region: 'africa' },
  'dominican-republic':   { code: 'do', name: 'Dominican Republic',         flag: '🇩🇴', region: 'caribbean' },
  'fiji':                 { code: 'fj', name: 'Fiji',                       flag: '🇫🇯', region: 'pacific' },
  'gibraltar':            { code: 'gi', name: 'Gibraltar',                  flag: '🇬🇮', region: 'southern-europe' },
  'guernsey':             { code: 'gg', name: 'Guernsey',                   flag: '🇬🇬', region: 'northern-europe' },
  'guyana':               { code: 'gy', name: 'Guyana',                     flag: '🇬🇾', region: 'south-america' },
  'honduras':             { code: 'hn', name: 'Honduras',                   flag: '🇭🇳', region: 'central-america' },
  'iraq':                 { code: 'iq', name: 'Iraq',                       flag: '🇮🇶', region: 'middle-east' },
  'jersey':               { code: 'je', name: 'Jersey',                     flag: '🇯🇪', region: 'northern-europe' },
  'laos':                 { code: 'la', name: 'Laos',                       flag: '🇱🇦', region: 'southeast-asia' },
  'lebanon':              { code: 'lb', name: 'Lebanon',                    flag: '🇱🇧', region: 'middle-east' },
  'macau':                { code: 'mo', name: 'Macau SAR',                  flag: '🇲🇴', region: 'east-asia' },
  'nicaragua':            { code: 'ni', name: 'Nicaragua',                  flag: '🇳🇮', region: 'central-america' },
  'palestinian-authority': { code: 'ps', name: 'Palestinian Authority',    flag: '🇵🇸', region: 'middle-east' },
  'papua-new-guinea':     { code: 'pg', name: 'Papua New Guinea',           flag: '🇵🇬', region: 'pacific' },
  'puerto-rico':          { code: 'pr', name: 'Puerto Rico',                flag: '🇵🇷', region: 'caribbean' },
  'sao-tome-principe':    { code: 'st', name: 'São Tomé and Príncipe',      flag: '🇸🇹', region: 'africa' },
  'st-lucia':             { code: 'lc', name: 'Saint Lucia',                flag: '🇱🇨', region: 'caribbean' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tableValue(content, label) {
  // Matches "| Label | value |" markdown table row (case-insensitive on label)
  const re = new RegExp(`\\|\\s*${escapeRe(label)}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`, 'i');
  const m = content.match(re);
  return m ? m[1].trim() : null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseConfidence(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith('high')) return 'high';
  if (lower.startsWith('medium-high')) return 'medium-high';
  if (lower.startsWith('medium')) return 'medium';
  if (lower.startsWith('low')) return 'low';
  return raw.split('—')[0].split('(')[0].trim().toLowerCase() || null;
}

function parseLastReviewed(raw) {
  if (!raw) return null;
  // Extract a date like 2025-10-01 or 2025-12-01
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : raw.split('(')[0].trim();
}

function extractEffectiveRates(content) {
  // Look for summary table rows with €30,000 / €60,000 / €100,000 and Employment
  const result = { employment: {}, bestSelfEmployment: {} };

  // Match rows like: | €30,000 | Employment (standard) | ... | **X%** |
  // or: | CLP 29,700,000 | €30,000 | Employment | ... | **X%** |
  const patterns = [
    // EUR-based with 2 leading columns (gross + scenario)
    /\|\s*[€£$]?\s*[\d,.]+[\d]*\s*\|\s*(Employment[^|]*)\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*[~]?([\d.]+)%\*\*/gi,
    // EUR-based with EUR-equiv column
    /\|\s*[\w\d,.]+\s*\|\s*[€£$]?\s*[\d,]+[k]?\s*\|\s*(Employment[^|]*)\|[^|]*\|[^|]*\|\s*\*\*[~]?([\d.]+)%\*\*/gi,
  ];

  // Simpler approach: find all ** rate% ** values near Employment rows
  // Parse the "Effective Rate Examples" section
  const effectiveSection = content.match(/## Effective Rate Examples[\s\S]*?(?=\n## |\n---\n## |$)/i)?.[0] || '';

  // Find employment effective rates for 30k, 60k, 100k
  const eurAmounts = { '30': null, '60': null, '100': null };
  const seAmounts = { '30': null, '60': null, '100': null };
  let bestSERegime = null;

  // Match summary table rows
  const tableRows = effectiveSection.match(/\|[^\n]+\*\*[\d.]+%\*\*[^\n]*/g) || [];

  for (const row of tableRows) {
    const rateM = row.match(/\*\*[~]?([\d.]+)%\*\*/);
    if (!rateM) continue;
    const rate = parseFloat(rateM[1]) / 100;

    const isEmployment = /employment(\s+\(standard\))?/i.test(row) && !/art\.|5c|exempt|beckham|special|flat/i.test(row);
    const isSE = /b2b|self-employed|freelan|autónom|fop|pfa|boleta|non-commercial|simplified|4th cat|sole trader|standard\)/i.test(row);

    // Detect EUR amount (€30k, €60k, €100k)
    const eurM = row.match(/€\s*([\d,]+)/);
    let eurKey = null;
    if (eurM) {
      const val = parseInt(eurM[1].replace(',', ''));
      if (val >= 28000 && val <= 35000) eurKey = '30';
      else if (val >= 55000 && val <= 65000) eurKey = '60';
      else if (val >= 90000 && val <= 115000) eurKey = '100';
    }

    if (eurKey) {
      if (isEmployment && eurAmounts[eurKey] === null) eurAmounts[eurKey] = rate;
      if (isSE && seAmounts[eurKey] === null) {
        seAmounts[eurKey] = rate;
        if (!bestSERegime) {
          const regimeM = row.match(/\|\s*[^|]+\|\s*([^|]+?)\s*\|/);
          if (regimeM) bestSERegime = regimeM[1].trim().replace(/\*\*/g, '').trim();
        }
      }
    }
  }

  result.employment = {
    '30k': eurAmounts['30'],
    '60k': eurAmounts['60'],
    '100k': eurAmounts['100'],
  };
  result.bestSelfEmployment = {
    '30k': seAmounts['30'],
    '60k': seAmounts['60'],
    '100k': seAmounts['100'],
    regime: bestSERegime,
  };

  return result;
}

function extractTopPITRate(content) {
  // Look for "top marginal rate", "above X" patterns, or the last bracket in a table
  // Simple heuristic: find the highest rate in a PIT bracket table
  const pitSection = content.match(/## Personal Income Tax[\s\S]*?(?=\n## )/i)?.[0] || content;
  const rates = [];
  // Match rates like "35%" or "**35%**" or "| 35% |" in bracket tables
  const rateMatches = pitSection.matchAll(/\|\s*\*?\*?([\d.]+)%\*?\*?\s*\|/g);
  for (const m of rateMatches) {
    const r = parseFloat(m[1]);
    if (r > 0 && r <= 100) rates.push(r);
  }
  return rates.length > 0 ? Math.max(...rates) / 100 : null;
}

function extractSSRates(content) {
  const ssSection = content.match(/## Social Security[\s\S]*?(?=\n## )/i)?.[0] || '';

  // Employee rate
  const empM = ssSection.match(/\|\s*(?:Social (?:insurance|security)[^|]*|Employee[^|]*)\|\s*\*?\*?([\d.]+)%\*?\*?\s*\|/i);
  const empRate = empM ? parseFloat(empM[1]) / 100 : null;

  // Look for annual cap in numbers
  const capM = ssSection.match(/(?:ceiling|cap|maximum)[^\n]*?([\d,]+(?:\.\d+)?)\s*(?:\/year|per year|annual)/i);
  const annualCap = capM ? parseFloat(capM[1].replace(/,/g, '')) : null;

  return { employeeRate: empRate, annualCap };
}

function extractSpecialRegimes(content) {
  const regimes = [];
  const specialSection = content.match(/## Special Regimes[\s\S]*?(?=\n## )/i)?.[0] || '';

  // Find ### headings
  const headings = specialSection.match(/^### (.+)$/gm) || [];
  for (const h of headings) {
    const name = h.replace(/^### /, '').trim();
    if (name && !name.match(/^(No |Option |Digital Nomad)/i)) {
      // Extract rate
      const rateM = specialSection.match(new RegExp(`${escapeRe(name)}[\\s\\S]{0,400}?(?:flat|rate)[^\\n]*?(\\d+(?:\\.\\d+)?)%`, 'i'));
      const rate = rateM ? parseFloat(rateM[1]) / 100 : null;
      regimes.push({ name, rate: rate || null });
    }
  }
  return regimes.slice(0, 5); // cap at 5
}

function extractKnownGaps(content) {
  const gaps = [];
  const gapSection = content.match(/## Known Gaps[\s\S]*?(?=\n## |$)/i)?.[0] || '';
  const items = gapSection.match(/^- \[ \] \*?\*?([^\n]+)/gm) || [];
  for (const item of items) {
    const text = item.replace(/^- \[ \] \*?\*?/, '').replace(/\*?\*?$/, '').trim();
    if (text) gaps.push(text.split(':')[0].trim());
  }
  return gaps.slice(0, 8);
}

function extractPwCUrl(content) {
  const m = content.match(/https:\/\/taxsummaries\.pwc\.com\/[^\s)>\]]+individual\/taxes-on-personal-income/);
  return m ? m[0] : null;
}

function extractEYPages(content) {
  const raw = tableValue(content, 'EY pages');
  return raw || null;
}

function extract2026Changes(content) {
  const section = content.match(/## 2026 Changes[\s\S]*?(?=\n## |$)/i)?.[0] || '';
  const items = section.match(/^- \*\*[^*]+\*\*[^\n]+/gm) || [];
  return items.slice(0, 6).map(i => i.replace(/^- /, '').trim());
}

function extractCurrency(content) {
  // Most countries use their own currency; look for USD, EUR, GBP hints
  const pitSection = content.match(/## Personal Income Tax[\s\S]*?(?=\n## )/i)?.[0] || '';
  if (/\bEUR\b/.test(pitSection) || /€/.test(pitSection)) return 'EUR';
  if (/\bGBP\b/.test(pitSection) || /£/.test(pitSection)) return 'GBP';
  if (/\bUSD\b/.test(pitSection) || /\$/.test(pitSection)) return 'USD';
  // Try to detect from the metadata or bracket table headers
  const currencyM = content.match(/\b([A-Z]{3})\b(?:\s*\/|\s+currency|\s+equivalent)/);
  if (currencyM) return currencyM[1];
  return null;
}

function extractPITBrackets(content) {
  const pitSection = content.match(/## Personal Income Tax[\s\S]*?(?=\n## )/i)?.[0] || content;
  const brackets = [];

  // Find standard bracket tables (not inheritance/rental/etc.)
  // Look for tables with columns: amount | rate or amount | tax | rate
  const tableBlocks = pitSection.match(/\|[^\n]+\|\n\|[-| ]+\|\n(?:\|[^\n]+\|\n)+/g) || [];

  for (const block of tableBlocks) {
    // Only process tables that look like PIT brackets (have % rates)
    if (!/%/.test(block)) continue;
    if (/capital|rental|dividend|inheritance|gift|royalt/i.test(block)) continue;

    const rows = block.split('\n').filter(r => r.includes('|') && !r.match(/^[-| ]+$/));
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length < 2) continue;

      // Try to extract a rate
      const lastCell = cells[cells.length - 1];
      const rateM = lastCell.match(/\*?\*?([\d.]+)%\*?\*?/);
      if (!rateM) continue;
      const rate = parseFloat(rateM[1]) / 100;

      // Try to extract "from" amount from first cell
      const fromCell = cells[0];
      const numbers = fromCell.match(/([\d,]+)/g);
      if (!numbers) {
        brackets.push({ from: 0, to: null, rate });
        continue;
      }

      const first = parseInt(numbers[0].replace(/,/g, ''));
      const second = numbers[1] ? parseInt(numbers[1].replace(/,/g, '')) : null;

      if (fromCell.toLowerCase().includes('first') || fromCell.toLowerCase().includes('0')) {
        brackets.push({ from: 0, to: second || first, rate });
      } else if (fromCell.toLowerCase().includes('above') || fromCell.toLowerCase().includes('over')) {
        brackets.push({ from: first, to: null, rate });
      } else if (second) {
        brackets.push({ from: first, to: second, rate });
      } else {
        brackets.push({ from: 0, to: first, rate });
      }
    }
    if (brackets.length > 0) break; // Use first valid bracket table found
  }

  return brackets.slice(0, 12); // cap at 12 brackets
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

function parseCountry(content, filename) {
  const slug = filename.replace('-2026.md', '');
  const meta = META[slug] || {};

  const confidenceRaw = tableValue(content, 'Confidence');
  const lastReviewedRaw = tableValue(content, 'Last reviewed');

  const effectiveRates = extractEffectiveRates(content);
  const topRate = extractTopPITRate(content);
  const ssRates = extractSSRates(content);
  const specialRegimes = extractSpecialRegimes(content);
  const knownGaps = extractKnownGaps(content);
  const pwcUrl = extractPwCUrl(content);
  const eyPages = extractEYPages(content);
  const changes2026 = extract2026Changes(content);
  const currency = extractCurrency(content);
  const pitBrackets = extractPITBrackets(content);

  // Extract cross-verification status
  const cvSection = content.match(/## Cross-Verification[\s\S]*?(?=\n## |$)/i)?.[0] || '';
  const cvVerdict = cvSection.match(/\*\*Overall verdict:\*\*\s*([^\n]+)/)?.[1]?.trim() || null;
  const cvStatus = cvVerdict
    ? (cvVerdict.startsWith('✅') ? 'confirmed' : cvVerdict.startsWith('⚠️') ? 'partial' : cvVerdict.startsWith('🚨') ? 'discrepancy' : 'unknown')
    : null;

  return {
    code: meta.code || slug.substring(0, 2),
    name: meta.name || slug.replace(/-/g, ' '),
    flag: meta.flag || null,
    region: meta.region || null,
    confidence: parseConfidence(confidenceRaw),
    lastReviewed: parseLastReviewed(lastReviewedRaw),
    personalIncomeTax: {
      topRate: topRate,
      brackets: pitBrackets.length > 0 ? pitBrackets : null,
      currency: currency,
    },
    socialSecurity: {
      employeeRate: ssRates.employeeRate,
      annualCap: ssRates.annualCap,
    },
    specialRegimes: specialRegimes.length > 0 ? specialRegimes : null,
    effectiveRates: {
      employment: effectiveRates.employment,
      bestSelfEmployment: effectiveRates.bestSelfEmployment,
    },
    changes2026: changes2026,
    knownGaps: knownGaps,
    crossVerification: {
      status: cvStatus,
      verdict: cvVerdict ? cvVerdict.substring(0, 200) : null,
    },
    sources: {
      ey: eyPages,
      pwc: pwcUrl || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const DIR = path.join(__dirname, '..', 'data', 'extracted', 'per-country');
const OUT = path.join(__dirname, '..', 'data', 'countries.json');

const files = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .sort();

console.log(`Parsing ${files.length} country files...`);

const countries = [];
const warnings = [];

for (const filename of files) {
  const slug = filename.replace('-2026.md', '');
  if (!META[slug]) {
    warnings.push(`  ⚠️  No metadata for: ${filename} (slug: ${slug})`);
  }
  const content = fs.readFileSync(path.join(DIR, filename), 'utf8');
  try {
    const entry = parseCountry(content, filename);
    countries.push(entry);
  } catch (err) {
    warnings.push(`  ❌  Error parsing ${filename}: ${err.message}`);
  }
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach(w => console.log(w));
}

const output = {
  generatedAt: '2026-05-31',
  sourceCount: countries.length,
  primarySource: 'EY Worldwide Personal Tax and Immigration Guide 2025-26',
  verificationSource: 'PwC Worldwide Tax Summaries (taxsummaries.pwc.com)',
  countries,
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Generated ${OUT}`);
console.log(`   Countries: ${countries.length}`);
console.log(`   File size: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
