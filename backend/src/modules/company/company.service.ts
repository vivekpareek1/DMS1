
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DriveService } from '../drive/drive.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private prisma: PrismaService, private driveService: DriveService) {}

  // Upload company logo - white-label feature
  async uploadLogo(companyId: string, file: Express.Multer.File, userId: string) {
    // Check if user is company admin
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isCompanyAdmin && !(await this.isAdmin(userId))) {
      throw new BadRequestException('Only company admin can upload logo');
    }

    // Validate file
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.mimetype)) {
      throw new BadRequestException('Logo must be PNG, JPEG or SVG');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Logo must be <2MB');
    }

    // Get company folder or create
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Company not found');

    // Upload to Drive - company-logos folder
    const logosFolderId = await this.getOrCreateLogosFolder(company.driveFolderId || process.env.DRIVE_ROOT_FOLDER_ID);
    
    const driveFile = await this.driveService.uploadResumable(
      logosFolderId,
      file.path,
      `logo-${companyId}-${Date.now()}.${file.mimetype.split('/')[1]}`
    );

    // Update company
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        logoUrl: `https://drive.google.com/uc?id=${driveFile.id}`,
        logoDriveId: driveFile.id
      }
    });

    this.logger.log(`Company logo uploaded for ${companyId} -> ${driveFile.id}`);
    return updated;
  }

  async getCompanyWithBranding(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return null;
    
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl || '/default-logo.png',
      primaryColor: company.primaryColor || '#000000',
      domain: company.domain
    };
  }

  private async getOrCreateLogosFolder(parentFolderId: string): Promise<string> {
    // In real, check if folder exists, else create
    // For now return parent (simplified)
    return parentFolderId;
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const admin = await this.prisma.userRole.findFirst({
      where: { userId, role: { name: 'ADMIN' } }
    });
    return !!admin;
  }
}
