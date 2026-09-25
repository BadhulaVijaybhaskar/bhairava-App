import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateVisitDto {
  @IsString() projectId!: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() notes?: string;
}

class UpdateVisitStatusDto {
  @IsString() status!: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('visits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Get()
  @RequirePermissions('sales.leads.manage')
  list(@CurrentUser() user: AuthPrincipal, @Query('projectId') projectId?: string) {
    return this.visits.list(user, { projectId });
  }

  @Post()
  @RequirePermissions('sales.leads.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateVisitDto) {
    return this.visits.create(user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('sales.leads.manage')
  status(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateVisitStatusDto) {
    return this.visits.updateStatus(user, id, dto.status, dto.notes);
  }
}
