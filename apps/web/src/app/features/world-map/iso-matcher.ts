/**
 * GeoJSON matching for the datasets/geo-countries dataset.
 *
 * That dataset uses:
 *   ISO3166-1-Alpha-2  (uppercase 2-letter, or "-99" for disputed/unrecognized)
 *   ISO3166-1-Alpha-3  (uppercase 3-letter, or "-99")
 *   name               (English name string)
 *
 * Our countries.json uses lowercase ISO 3166-1 alpha-2 codes.
 *
 * Strategy:
 *   1. ISO2: if it matches /^[A-Z]{2}$/ → lowercase it directly (covers ~142/147)
 *   2. ISO3: look up in ISO3_TO_CODE (covers Taiwan: ISO2="CN-TW", ISO3="TWN")
 *   3. Name: look up in NAME_TO_CODE (covers France, Norway, Kosovo: both fields = "-99",
 *      plus common alias spellings for robustness)
 */

// Reverse ISO 3166-1 alpha-3 → our internal lowercase alpha-2 code.
// Key case: TWN (Taiwan) — GeoJSON gives ISO2="CN-TW" which is non-standard,
// so we fall through to ISO3 for that entry.
const ISO3_TO_CODE: Record<string, string> = {
  ABW: 'aw', AGO: 'ao', ALB: 'al', ARE: 'ae', ARG: 'ar',
  ARM: 'am', AUS: 'au', AUT: 'at', AZE: 'az', BEL: 'be',
  BFA: 'bf', BGD: 'bd', BGR: 'bg', BHR: 'bh', BHS: 'bs',
  BIH: 'ba', BLR: 'by', BOL: 'bo', BRA: 'br', BRB: 'bb',
  BRN: 'bn', BMU: 'bm', BTN: 'bt', BWA: 'bw', CAN: 'ca',
  CHE: 'ch', CHL: 'cl', CHN: 'cn', CIV: 'ci', CMR: 'cm',
  COL: 'co', CPV: 'cv', CRI: 'cr', CUW: 'cw', CYM: 'ky',
  CYP: 'cy', CZE: 'cz', DEU: 'de', DNK: 'dk', DOM: 'do',
  DZA: 'dz', ECU: 'ec', EGY: 'eg', ERI: 'er', ESP: 'es',
  EST: 'ee', ETH: 'et', FIN: 'fi', FJI: 'fj', FRA: 'fr',
  GBR: 'gb', GEO: 'ge', GGY: 'gg', GHA: 'gh', GIB: 'gi',
  GRC: 'gr', GTM: 'gt', GUM: 'gu', GUY: 'gy', HKG: 'hk',
  HND: 'hn', HRV: 'hr', HUN: 'hu', IDN: 'id', IMN: 'im',
  IND: 'in', IRL: 'ie', IRQ: 'iq', ISR: 'il', ITA: 'it',
  JAM: 'jm', JEY: 'je', JOR: 'jo', JPN: 'jp', KAZ: 'kz',
  KEN: 'ke', KGZ: 'kg', KHM: 'kh', KOR: 'kr', KWT: 'kw',
  LAO: 'la', LBN: 'lb', LBY: 'ly', LCA: 'lc', LIE: 'li',
  LKA: 'lk', LSO: 'ls', LTU: 'lt', LUX: 'lu', LVA: 'lv',
  MAC: 'mo', MAR: 'ma', MCO: 'mc', MDA: 'md', MDV: 'mv',
  MEX: 'mx', MKD: 'mk', MLT: 'mt', MNE: 'me', MNG: 'mn',
  MNP: 'mp', MOZ: 'mz', MUS: 'mu', MWI: 'mw', MYS: 'my',
  NAM: 'na', NGA: 'ng', NIC: 'ni', NLD: 'nl', NOR: 'no',
  NZL: 'nz', OMN: 'om', PAK: 'pk', PAN: 'pa', PER: 'pe',
  PHL: 'ph', PNG: 'pg', POL: 'pl', PRI: 'pr', PRT: 'pt',
  PRY: 'py', PSE: 'ps', QAT: 'qa', ROU: 'ro', RUS: 'ru',
  RWA: 'rw', SAU: 'sa', SGP: 'sg', SLV: 'sv', SRB: 'rs',
  SSD: 'ss', STP: 'st', SUR: 'sr', SVK: 'sk', SVN: 'si',
  SWE: 'se', SXM: 'sx', SYC: 'sc', THA: 'th', TTO: 'tt',
  TUN: 'tn', TUR: 'tr', TWN: 'tw', TZA: 'tz', UGA: 'ug',
  UKR: 'ua', URY: 'uy', USA: 'us', UZB: 'uz', VEN: 've',
  VGB: 'vg', VIR: 'vi', VNM: 'vn', ZAF: 'za', ZMB: 'zm',
  ZWE: 'zw',
};

// Name-based fallback for features where both ISO fields are "-99", plus common
// alternate spellings for robustness against future GeoJSON dataset changes.
const NAME_TO_CODE: Record<string, string> = {
  // GeoJSON features with ISO2="-99" that are in our dataset
  'france':  'fr',
  'norway':  'no',
  'kosovo':  'xk',
  // Common alternate names / aliases
  'united states of america': 'us',
  'usa':                      'us',
  'russian federation':       'ru',
  'russia':                   'ru',
  'republic of korea':        'kr',
  'south korea':              'kr',
  'czechia':                  'cz',
  'czech republic':           'cz',
  'united kingdom':           'gb',
  'great britain':            'gb',
  'uk':                       'gb',
  'taiwan':                   'tw',
  "taiwan, province of china": 'tw',
  'ivory coast':              'ci',
  "côte d'ivoire":            'ci',
  'the netherlands':          'nl',
  'holland':                  'nl',
  'slovak republic':          'sk',
  'north macedonia':          'mk',
  'republic of north macedonia': 'mk',
  'myanmar':                  'mm',
  'burma':                    'mm',
  'iran':                     'ir',
  'islamic republic of iran': 'ir',
  'vietnam':                  'vn',
  'viet nam':                 'vn',
  'syria':                    'sy',
  'syrian arab republic':     'sy',
  'bolivia':                  'bo',
  'plurinational state of bolivia': 'bo',
  'venezuela':                've',
  'bolivarian republic of venezuela': 've',
  'moldova':                  'md',
  'republic of moldova':      'md',
  'tanzania':                 'tz',
  'united republic of tanzania': 'tz',
};

/**
 * Given a GeoJSON feature's properties object, return our internal 2-letter
 * lowercase country code, or undefined if the feature isn't in our dataset.
 */
export function matchGeoFeature(properties: Record<string, unknown>): string | undefined {
  const iso2 = String(properties['ISO3166-1-Alpha-2'] ?? '');
  const iso3 = String(properties['ISO3166-1-Alpha-3'] ?? '');
  const name = String(properties['name'] ?? '').toLowerCase().trim();

  // Strategy 1: standard 2-letter uppercase code → lowercase directly.
  // Rejects '-99' and non-standard values like 'CN-TW'.
  if (/^[A-Z]{2}$/.test(iso2)) return iso2.toLowerCase();

  // Strategy 2: ISO3 lookup — critical for Taiwan (ISO2='CN-TW', ISO3='TWN').
  if (iso3 && iso3 !== '-99') {
    const code = ISO3_TO_CODE[iso3];
    if (code) return code;
  }

  // Strategy 3: name-based fallback.
  return NAME_TO_CODE[name];
}

/**
 * Dev-only diagnostic: logs dataset countries that have no matching GeoJSON feature.
 * Call once after GeoJSON loads to surface coverage gaps.
 */
export function logCoverageWarnings(
  datasetCodes: string[],
  features: Array<{ properties: Record<string, unknown> | null }>,
): void {
  const codeSet = new Set(datasetCodes);
  const matched = new Set<string>();
  for (const f of features) {
    const code = matchGeoFeature((f.properties ?? {}) as Record<string, unknown>);
    if (code && codeSet.has(code)) matched.add(code);
  }
  const unmatched = datasetCodes.filter(c => !matched.has(c));
  if (unmatched.length > 0) {
    console.warn('[TaxCompass] Map: dataset countries with no GeoJSON feature:', unmatched);
  }
}
