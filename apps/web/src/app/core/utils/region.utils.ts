import { Region } from '../models/country.model';

const REGION_KEY_MAP: Record<Region, string> = {
  'africa':          'regions.africa',
  'caribbean':       'regions.caribbean',
  'central-america': 'regions.centralAmerica',
  'central-asia':    'regions.centralAsia',
  'east-asia':       'regions.eastAsia',
  'eastern-europe':  'regions.easternEurope',
  'middle-east':     'regions.middleEast',
  'north-america':   'regions.northAmerica',
  'northern-europe': 'regions.northernEurope',
  'pacific':         'regions.pacific',
  'south-america':   'regions.southAmerica',
  'south-asia':      'regions.southAsia',
  'southeast-asia':  'regions.southeastAsia',
  'southern-europe': 'regions.southernEurope',
  'western-europe':  'regions.westernEurope',
};

/** Returns a translation key for use with | translate */
export function regionLabel(r: Region): string {
  return REGION_KEY_MAP[r] ?? r;
}
