import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DlpService } from './dlp.service';
import { ScreenshotAuditService } from './screenshot-audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dlp')
@UseGuards(JwtAuthGuard)
export class DlpController {
  constructor(private dlpService: DlpService, private screenshotAudit: ScreenshotAuditService) {}

  @Get('classification/:fileName')
  async getClassification(@Param('fileName') fileName: string) {
    return { fileName, classification: await this.dlpService.getClassification(fileName) };
  }

  @Post('watermark')
  getWatermark(@Req() req: any) {
    // Enterprise-only inside DlpService.generateWatermark (returns '' otherwise).
    return { watermark: this.dlpService.generateWatermark(req.user.email, req.ip) };
  }

  // Called by the frontend's screenshot-detection widget (ScreenshotProtection.tsx)
  // when a capture attempt is detected client-side. This can only ever be a
  // best-effort deterrent + audit trail - a determined user can still take a
  // photo of their screen with another device, which no web app can prevent.
  @Post('screenshot-attempt')
  async logScreenshotAttempt(
    @Body() body: {
      fileId: string;
      fileName: string;
      detectionMethod: 'PRINTSCREEN_KEY' | 'VISIBILITY_CHANGE' | 'BLUR' | 'DEVTOOLS' | 'CONTEXT_MENU';
      classification: string;
    },
    @Req() req: any,
  ) {
    if (!req.user?.id || !req.user?.email) {
      throw new ForbiddenException('Authenticated user required');
    }
    return this.screenshotAudit.logScreenshotAttempt({
      userId: req.user.id,
      userEmail: req.user.email,
      fileId: body.fileId,
      fileName: body.fileName,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      detectionMethod: body.detectionMethod,
      classification: body.classification,
    });
  }
}
