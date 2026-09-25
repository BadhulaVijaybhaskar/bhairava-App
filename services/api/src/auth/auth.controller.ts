import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, PasswordResetConfirmDto, PasswordResetRequestDto, RefreshDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthPrincipal } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string, expiresAt: string) {
    const secure = process.env.COOKIE_SECURE === 'true';
    const sameSiteRaw = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
    const sameSite = (['lax', 'strict', 'none'].includes(sameSiteRaw)
      ? sameSiteRaw
      : 'lax') as 'lax' | 'strict' | 'none';
    // SameSite=None requires Secure
    const effectiveSameSite = sameSite === 'none' && !secure ? 'lax' : sameSite;
    res.cookie('bhairava_refresh', refreshToken, {
      httpOnly: true,
      secure: secure || effectiveSameSite === 'none',
      sameSite: effectiveSameSite,
      path: '/api/auth',
      expires: new Date(expiresAt),
    });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return result;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = dto.refreshToken || (req.cookies?.bhairava_refresh as string | undefined);
    const result = await this.auth.refresh(raw, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return result;
  }

  @Post('logout')
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const raw = dto.refreshToken || (req.cookies?.bhairava_refresh as string | undefined);
    await this.auth.logout(raw, user?.userId);
    res.clearCookie('bhairava_refresh', { path: '/api/auth' });
    return { ok: true };
  }

  @Post('password-reset/request')
  requestReset(@Body() dto: PasswordResetRequestDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  confirmReset(@Body() dto: PasswordResetConfirmDto) {
    return this.auth.confirmPasswordReset(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  meGet(@CurrentUser() user: any) {
    return { user };
  }

  @Post('me')
  me(@CurrentUser() user: AuthPrincipal) {
    return { user };
  }
}
