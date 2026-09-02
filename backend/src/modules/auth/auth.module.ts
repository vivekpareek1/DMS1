import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    // registerAsync + ConfigService (not a bare `process.env.JWT_SECRET` read at
    // module-evaluation time) so this doesn't race against ConfigModule's own
    // env loading depending on import order in AppModule.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [GoogleAuthService, JwtAuthGuard, PrismaService],
  exports: [JwtModule, GoogleAuthService, JwtAuthGuard],
})
export class AuthModule {}
