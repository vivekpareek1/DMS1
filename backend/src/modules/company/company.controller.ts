import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  // Public: branding is shown on the login/signup page before a user is authenticated.
  @Public()
  @Get(':companyId/branding')
  async getBranding(@Param('companyId') companyId: string) {
    const company = await this.companyService.getCompanyWithBranding(companyId);
    if (!company) throw new BadRequestException('Company not found');
    return company;
  }

  @Post(':companyId/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({ destination: '/tmp/uploads' }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadLogo(@Param('companyId') companyId: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (req.user.companyId !== companyId) {
      throw new ForbiddenException('Cannot modify another company');
    }
    if (!file) throw new BadRequestException('logo file is required');
    return this.companyService.uploadLogo(companyId, file, req.user.id);
  }
}
