import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
