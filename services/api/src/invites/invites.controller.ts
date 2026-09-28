import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateInviteDto {
  @IsOptional() @IsString() nameHint?: string;
  @IsOptional() @IsString() phoneHint?: string;
  @IsOptional() @IsString() emailHint?: string;
}

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @RequirePermissions('sales.invites.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateInviteDto) {
    return this.invites.create(user, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('sales.invites.manage')
  list(@CurrentUser() user: AuthPrincipal) {
    return this.invites.listMine(user);
  }

  /** Public peek — no auth; returns agent/org labels only. */
  @Get(':token')
  peek(@Param('token') token: string) {
    return this.invites.peek(token);
  }
}
