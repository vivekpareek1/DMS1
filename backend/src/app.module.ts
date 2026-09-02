
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { FilesModule } from './modules/files/files.module';
import { DriveModule } from './modules/drive/drive.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CompanyModule } from './modules/company/company.module';
import { DlpModule } from './modules/dlp/dlp.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './modules/workers/queue.module';
import { SecureHeadersGuard } from './common/guards/secure-headers.guard';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { envValidationSchema } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20, // 20 requests per minute per user - best for DWG upload
    }]),
    AuthModule,
    FilesModule,
    DriveModule,
    PermissionsModule,
    AuditModule,
    BillingModule,
    CompanyModule,
    DlpModule,
    HealthModule,
    QueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SecureHeadersGuard }, // P0: Security headers
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // P1: Rate limiting
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // P0: Auth - routes opt out with @Public()
  ],
})
export class AppModule {}
