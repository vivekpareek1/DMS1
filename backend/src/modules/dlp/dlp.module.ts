import { Module } from '@nestjs/common';
import { DlpController } from './dlp.controller';
import { DlpService } from './dlp.service';
import { DlpGuard } from './dlp.guard';
import { ScreenshotAuditService } from './screenshot-audit.service';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [AuditModule],
  controllers: [DlpController],
  providers: [DlpService, DlpGuard, ScreenshotAuditService, PrismaService],
  exports: [DlpService, DlpGuard],
})
export class DlpModule {}
