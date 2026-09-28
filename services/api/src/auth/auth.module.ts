import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { MpinAuthService } from './mpin-auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), AuditModule],
  providers: [AuthService, GoogleAuthService, MpinAuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, GoogleAuthService, MpinAuthService],
})
export class AuthModule {}
