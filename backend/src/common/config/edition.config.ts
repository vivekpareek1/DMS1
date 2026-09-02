export type Edition = 'BASIC' | 'STANDARD' | 'ENTERPRISE';

export const VALID_EDITIONS: Edition[] = ['BASIC', 'STANDARD', 'ENTERPRISE'];

export interface EditionPricing {
  pricePerUserMonthINR: number;
  pricePerUserMonthWithGSTINR: number;
  name: string;
  displayName: string;
}

export interface EditionFeatures {
  maxUsers: number;
  maxStorageGB: number;
  maxFileSizeMB: number;
  dwgViewer: boolean;
  excelEditor: boolean;
  versioning: boolean;
  maxVersions: number;
  auditLogDays: number;
  pricePerUserMonthINR: number;
  yearlyDiscount: number; // percent off when billed yearly vs monthly
  name: string;
  displayName: string;
  dlp: {
    enabled: boolean;
    piiDetection: boolean;
    watermarking: boolean;
    downloadRestriction: boolean;
    externalShareBlock: boolean;
    clipboardBlock: boolean;
    printBlock: boolean;
    screenshotDetection: boolean;
    classification: boolean;
    fileFingerprinting: boolean;
  };
}

export const EDITION_PRICING: Record<Edition, EditionPricing> = {
  BASIC: { pricePerUserMonthINR: 749, pricePerUserMonthWithGSTINR: 884, name: 'BASIC', displayName: 'Basic' },
  STANDARD: { pricePerUserMonthINR: 2499, pricePerUserMonthWithGSTINR: 2949, name: 'STANDARD', displayName: 'Standard' },
  ENTERPRISE: { pricePerUserMonthINR: 6999, pricePerUserMonthWithGSTINR: 8259, name: 'ENTERPRISE', displayName: 'Enterprise' }
};

export const EDITIONS: Record<Edition, EditionFeatures> = {
  BASIC: {
    maxUsers: 10, maxStorageGB: 100, maxFileSizeMB: 100, dwgViewer: false, excelEditor: false, versioning: false, maxVersions: 3, auditLogDays: 30,
    pricePerUserMonthINR: 749, yearlyDiscount: 15, name: 'BASIC', displayName: 'Basic',
    dlp: { enabled: false, piiDetection: false, watermarking: false, downloadRestriction: false, externalShareBlock: false, clipboardBlock: false, printBlock: false, screenshotDetection: false, classification: false, fileFingerprinting: false }
  },
  STANDARD: {
    maxUsers: 50, maxStorageGB: 1000, maxFileSizeMB: 1024, dwgViewer: true, excelEditor: true, versioning: true, maxVersions: 10, auditLogDays: 180,
    pricePerUserMonthINR: 2499, yearlyDiscount: 15, name: 'STANDARD', displayName: 'Standard',
    dlp: { enabled: true, piiDetection: false, watermarking: true, downloadRestriction: false, externalShareBlock: true, clipboardBlock: false, printBlock: false, screenshotDetection: false, classification: true, fileFingerprinting: false }
  },
  ENTERPRISE: {
    maxUsers: -1, maxStorageGB: -1, maxFileSizeMB: -1, dwgViewer: true, excelEditor: true, versioning: true, maxVersions: -1, auditLogDays: 2555,
    pricePerUserMonthINR: 6999, yearlyDiscount: 15, name: 'ENTERPRISE', displayName: 'Enterprise',
    dlp: { enabled: true, piiDetection: true, watermarking: true, downloadRestriction: true, externalShareBlock: true, clipboardBlock: true, printBlock: true, screenshotDetection: true, classification: true, fileFingerprinting: true }
  }
};

export function getEdition(): Edition {
  const env = process.env.EDITION as Edition;
  if (env && VALID_EDITIONS.includes(env)) return env;
  return 'STANDARD';
}
export function getEditionFeatures(): EditionFeatures { return EDITIONS[getEdition()]; }
export function getPriceWithGST(edition: Edition = getEdition()): { base: number, gst: number, total: number, display: string, displayWithGST: string } {
  const pricing = EDITION_PRICING[edition];
  const gst = pricing.pricePerUserMonthWithGSTINR - pricing.pricePerUserMonthINR;
  return { base: pricing.pricePerUserMonthINR, gst, total: pricing.pricePerUserMonthWithGSTINR, display: `₹${pricing.pricePerUserMonthINR}`, displayWithGST: `₹${pricing.pricePerUserMonthINR} + 18% GST = ₹${pricing.pricePerUserMonthWithGSTINR}/month` };
}
export function requireDlpFeature(feature: keyof EditionFeatures['dlp']): boolean {
  const edition = getEditionFeatures();
  if (!edition.dlp.enabled) return false;
  return edition.dlp[feature] as boolean;
}
export function isValidEdition(edition: string): edition is Edition { return VALID_EDITIONS.includes(edition as Edition); }
