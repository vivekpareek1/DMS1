
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ScreenshotAuditService {
  private readonly logger = new Logger(ScreenshotAuditService.name);

  constructor(private auditService: AuditService, private prisma: PrismaService) {}

  // Log screenshot attempt - called from frontend when detection triggers
  async logScreenshotAttempt(data: {
    userId: string,
    userEmail: string,
    fileId: string,
    fileName: string,
    ip: string,
    userAgent: string,
    detectionMethod: 'PRINTSCREEN_KEY' | 'VISIBILITY_CHANGE' | 'BLUR' | 'DEVTOOLS' | 'CONTEXT_MENU',
    classification: string
  }) {
    this.logger.warn(`DLP SCREENSHOT ATTEMPT: ${data.detectionMethod} by ${data.userEmail} on ${data.fileName}`);

    // Log to audit with high severity
    await this.auditService.log(this.prisma, {
      userId: data.userId,
      userEmail: data.userEmail,
      action: 'DLP_SCREENSHOT_ATTEMPT',
      fileId: data.fileId,
      details: {
        detectionMethod: data.detectionMethod,
        fileName: data.fileName,
        classification: data.classification,
        ip: data.ip,
        userAgent: data.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'HIGH',
        watermark: `${data.userEmail} | ${data.ip} | ${new Date().toISOString()}`
      },
      ip: data.ip
    });

    // In Enterprise, also send to SIEM / Slack alert
    // await this.siemService.alert(...)

    return { logged: true, watermark: `${data.userEmail} | ${data.ip}` };
  }
}
