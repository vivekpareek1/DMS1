import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  hostedDomain: string | null; // Google Workspace domain, if signed in via a workspace account
}

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
      // We don't throw here at module load time (would crash boot before env
      // validation runs); AuthController fails fast on first real request instead.
    }
    this.client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
  }

  /**
   * Verifies a Google Identity Services ID token (sent by the frontend after
   * the user completes Google Sign-In) and returns the verified profile.
   * Throws if the token is missing, expired, malformed, or wasn't issued for
   * our client ID - never trust an unverified token's claims.
   */
  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
      throw new UnauthorizedException('Google SSO is not configured on this server (GOOGLE_OAUTH_CLIENT_ID missing)');
    }
    if (!idToken) {
      throw new UnauthorizedException('Missing Google idToken');
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
    } catch (e) {
      throw new UnauthorizedException(`Invalid Google token: ${(e as Error).message}`);
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Google token payload missing required claims');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || null,
      emailVerified: !!payload.email_verified,
      hostedDomain: payload.hd || null,
    };
  }
}
