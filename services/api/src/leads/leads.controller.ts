import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateLeadDto {
  @IsString() projectId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() agentId?: string;
}

class UpdateLeadStageDto {
  @IsString() stage!: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions('sales.leads.manage')
  list(@CurrentUser() user: AuthPrincipal, @Query('projectId') projectId?: string) {
    return this.leads.list(user, { projectId });
  }

  @Post()
  @RequirePermissions('sales.leads.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLeadDto) {
    return this.leads.create(user, dto);
  }

  @Patch(':id/stage')
  @RequirePermissions('sales.leads.manage')
  stage(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateLeadStageDto) {
    return this.leads.updateStage(user, id, dto.stage, dto.notes);
  }
}
