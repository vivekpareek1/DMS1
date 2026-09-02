
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getEditionFeatures } from '../../common/config/edition.config';

@Injectable()
export class DlpGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const edition = getEditionFeatures();
    const request = context.switchToHttp().getRequest();
    const file = request.file || request.params;

    // Enterprise DLP: Block download if classification is confidential
    if (edition.dlp.downloadRestriction && request.route.path.includes('download')) {
      const classification = request.file?.classification || 'INTERNAL';
      if (['CONFIDENTIAL', 'RESTRICTED'].includes(classification)) {
        throw new ForbiddenException('Enterprise DLP: Download blocked for CONFIDENTIAL files. View-only mode. Watermark applied.');
      }
    }

    return true;
  }
}
