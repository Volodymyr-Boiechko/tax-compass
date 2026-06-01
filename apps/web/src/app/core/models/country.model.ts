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
  computableRegimes?: ComputableRegime[];
}

export interface ComputableRegimePit {
  kind: 'progressive' | 'flat' | 'lump-sum' | 'zero';
  rate?: number;
  appliesTo: 'gross' | 'taxable' | 'revenue' | 'profit';
  deductionPercent?: number;
  cap?: { amount: number; currency: string };
}

export interface ComputableRegimeSS {
  kind: 'percentage' | 'fixed-monthly' | 'banded' | 'none';
  rate?: number;
  monthly?: number;
  bands?: { upTo: number; monthly: number }[];
  cap?: number;
}

export interface AdditionalLevy {
  name: string;
  rate: number;
  appliesTo: 'gross' | 'taxable' | 'revenue';
}

export interface ComputableRegime {
  id: string;
  name: string;
  shortName?: string;
  type: 'employment' | 'self-employment';
  eligibility?: string;
  duration?: string;
  notes?: string;
  pit: ComputableRegimePit;
  socialSecurity: ComputableRegimeSS;
  additionalLevies?: AdditionalLevy[];
  personalAllowance?: { amount: number; currency: string };
}

export interface CountriesData {
  generatedAt: string;
  sourceCount: number;
  primarySource: string;
  verificationSource: string;
  countries: Country[];
}
