import { Region } from '../models/country.model';

export const REGION_LABELS: Record<Region, string> = {
  'africa':          'Africa',
  'caribbean':       'Caribbean',
  'central-america': 'Central America',
  'central-asia':    'Central Asia',
  'east-asia':       'East Asia',
  'eastern-europe':  'Eastern Europe',
  'middle-east':     'Middle East',
  'north-america':   'North America',
  'northern-europe': 'Northern Europe',
  'pacific':         'Pacific',
  'south-america':   'South America',
  'south-asia':      'South Asia',
  'southeast-asia':  'Southeast Asia',
  'southern-europe': 'Southern Europe',
  'western-europe':  'Western Europe',
};

export function regionLabel(r: Region): string {
  return REGION_LABELS[r] ?? r;
}
