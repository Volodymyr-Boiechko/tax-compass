export interface TaxBracket {
  from: number;
  to: number | null;
  rate: number;
}

export interface PersonalIncomeTax {
  topRate: number | null;
  brackets: TaxBracket[] | null;
  currency: string | null;
}

export interface SocialSecurity {
  employeeRate: number | null;
  annualCap: number | null;
}

export interface SpecialRegime {
  name: string;
  rate: number | null;
}

export interface EffectiveRateSet {
  '30k': number | null;
  '60k': number | null;
  '100k': number | null;
  regime?: string | null;
}

export interface EffectiveRates {
  employment: EffectiveRateSet;
  bestSelfEmployment: EffectiveRateSet;
}

export interface CrossVerification {
  status: string | null;
  verdict: string | null;
}

export interface CountrySources {
  ey: string | null;
  pwc: string | null;
}

export type Confidence = 'high' | 'medium-high' | 'medium' | 'low';

export type Region =
  | 'africa'
  | 'caribbean'
  | 'central-america'
  | 'central-asia'
  | 'east-asia'
  | 'eastern-europe'
  | 'middle-east'
  | 'north-america'
  | 'northern-europe'
  | 'pacific'
  | 'south-america'
  | 'south-asia'
  | 'southeast-asia'
  | 'southern-europe'
  | 'western-europe';

export interface Country {
  code: string;
  name: string;
  flag: string | null;
  region: Region;
  confidence: Confidence | null;
  lastReviewed: string | null;
  personalIncomeTax: PersonalIncomeTax | null;
  socialSecurity: SocialSecurity | null;
  specialRegimes: SpecialRegime[] | null;
  effectiveRates: EffectiveRates;
  changes2026: string[];
  knownGaps: string[];
  crossVerification: CrossVerification | null;
  sources: CountrySources | null;
}

export interface CountriesData {
  generatedAt: string;
  sourceCount: number;
  primarySource: string;
  verificationSource: string;
  countries: Country[];
}
