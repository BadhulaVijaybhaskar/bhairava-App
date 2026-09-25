import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PlotsService } from './plots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreatePlotDto {
  @IsString() projectId!: string;
  @IsString() @MinLength(1) number!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) areaSqYd!: number;
  @IsOptional() @Type(() => Number) @IsNumber() ratePerSqYd?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalPrice?: number;
  @IsOptional() @IsString() facing?: string;
  @IsOptional() @IsString() notes?: string;
}

class TransitionDto {
  @IsString() toStatus!: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() source?: 'SALES_FLOW' | 'ADMIN_MANUAL';
}

@Controller('plots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlotsController {
  constructor(private readonly plots: PlotsService) {}

  @Get('project/:projectId')
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal, @Param('projectId') projectId: string) {
    return this.plots.listByProject(user, projectId);
  }

  @Post()
  @RequirePermissions('projects.plots.edit')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreatePlotDto) {
    return this.plots.create(user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('projects.plots.edit')
  transition(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.plots.transitionStatus(user, id, dto);
  }
}
