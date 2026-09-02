import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { DriveModule } from '../drive/drive.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [DriveModule],
  controllers: [CompanyController],
  providers: [CompanyService, PrismaService],
  exports: [CompanyService],
})
export class CompanyModule {}
