
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { getEditionFeatures, requireDlpFeature } from '../../common/config/edition.config';

@Injectable()
export class DlpService {
  private readonly logger = new Logger(DlpService.name);

  // PII Patterns for India
  private piiPatterns = {
    aadhaar: /\b\d{4}\s\d{4}\s\d{4}\b/g, // Aadhaar
    pan: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, // PAN
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\b\+?91[-\s]?[6-9]\d{9}\b/g,
  };

  async scanForPii(content: string, fileName: string): Promise<{ hasPii: boolean, types: string[], redactedContent?: string }> {
    if (!requireDlpFeature('piiDetection')) {
      return { hasPii: false, types: [] };
    }

    const found: string[] = [];
    for (const [type, regex] of Object.entries(this.piiPatterns)) {
      if (regex.test(content)) {
        found.push(type);
        this.logger.warn(`DLP: PII detected ${type} in ${fileName}`);
      }
    }

    // If PII found and classification is Confidential, block upload
    const classification = await this.getClassification(fileName);
    if (found.length > 0 && classification === 'CONFIDENTIAL') {
      throw new ForbiddenException(`DLP Block: File ${fileName} contains PII (${found.join(', ')}) and is marked Confidential. Cannot upload.`);
    }

    return { hasPii: found.length > 0, types: found };
  }

  async getClassification(fileName: string): Promise<'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'> {
    if (!requireDlpFeature('classification')) return 'INTERNAL';
    
    // In prod, get from DB file.classification field
    // For demo, based on folder path or file name
    if (fileName.includes('confidential') || fileName.includes('salary') || fileName.includes('aadhaar')) {
      return 'CONFIDENTIAL';
    }
    if (fileName.includes('internal')) return 'INTERNAL';
    if (fileName.includes('public')) return 'PUBLIC';
    return 'INTERNAL';
  }

  generateWatermark(userEmail: string, ip: string): string {
    if (!requireDlpFeature('watermarking')) return '';

    // Dynamic watermark: user email + IP + timestamp
    const timestamp = new Date().toISOString();
    // In frontend, this watermark is rendered as diagonal text over viewer
    return `${userEmail} | ${ip} | ${timestamp} | CONFIDENTIAL`;
  }

  async canDownload(userId: string, fileId: string, classification: string): Promise<boolean> {
    if (!requireDlpFeature('downloadRestriction')) return true;

    // Enterprise DLP: CONFIDENTIAL and RESTRICTED files cannot be downloaded, only viewed
    if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
      // Check if user has DLP override role
      // In real, check userRole DLP_BYPASS
      this.logger.warn(`DLP: Download blocked for ${fileId} classification ${classification} by user ${userId}`);
      return false;
    }
    return true;
  }

  async canShareExternally(fileId: string, targetEmail: string, orgDomain: string): Promise<boolean> {
    if (!requireDlpFeature('externalShareBlock')) return true;

    // Block sharing outside org domain for INTERNAL/CONFIDENTIAL
    if (!targetEmail.endsWith(`@${orgDomain}`)) {
      this.logger.warn(`DLP: External share blocked for ${fileId} to ${targetEmail}`);
      throw new ForbiddenException(`DLP: Sharing outside ${orgDomain} is blocked by Enterprise DLP policy`);
    }
    return true;
  }

  // File fingerprinting - track where file goes
  async fingerprintFile(fileId: string, action: string, userId: string, ip: string) {
    if (!requireDlpFeature('fileFingerprinting')) return;

    // Log to immutable DLP audit log
    // In prod, send to SIEM
    this.logger.log(`DLP FINGERPRINT: file=${fileId} action=${action} user=${userId} ip=${ip} time=${new Date().toISOString()}`);
  }
}
