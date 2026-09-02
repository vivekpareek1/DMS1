import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthService } from './google-auth.service';
import { PrismaService } from '../../prisma.service';
import { Public } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private googleAuth: GoogleAuthService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * First-time signup: creates a Company + the first User (as company admin)
   * from a verified Google identity. If the Google account already has a
   * user record (e.g. they're re-running signup), this logs them in instead
   * of erroring, since duplicate-signup is a common, harmless retry path.
   */
  @Public()
  @Post('google-signup')
  async googleSignup(@Body() body: { idToken: string; companyName: string; companyDomain?: string }) {
    if (!body.companyName?.trim()) {
      throw new BadRequestException('companyName is required');
    }
    const profile = await this.googleAuth.verifyIdToken(body.idToken);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
      include: { company: true },
    });
    if (existing) {
      return this.issueSession(existing);
    }

    const company = await this.prisma.company.create({
      data: {
        name: body.companyName.trim(),
        domain: body.companyDomain?.trim() || profile.hostedDomain || null,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        companyId: company.id,
        isCompanyAdmin: true,
      },
      include: { company: true },
    });

    return this.issueSession(user);
  }

  /**
   * Login for an existing user via Google SSO. If the account exists by
   * email but hasn't been linked to a Google identity yet (e.g. seeded by
   * an admin), we link it here rather than rejecting - the verified email
   * match from Google is sufficient proof of ownership.
   */
  @Public()
  @Post('google-login')
  async googleLogin(@Body() body: { idToken: string }) {
    const profile = await this.googleAuth.verifyIdToken(body.idToken);

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
      include: { company: true },
    });
    if (!user) {
      throw new BadRequestException('No account found for this Google identity - sign up first');
    }
    if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
        include: { company: true },
      });
    }
    return this.issueSession(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });
    if (!user) throw new BadRequestException('User not found');
    const { password, ...safe } = user as any;
    return safe;
  }

  private issueSession(user: { id: string; email: string; companyId: string | null; isCompanyAdmin: boolean; company?: any }) {
    const payload = {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      isCompanyAdmin: user.isCompanyAdmin,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: { ...payload, companyName: user.company?.name ?? null } };
  }
}
