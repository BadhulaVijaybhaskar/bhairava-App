import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateReservationDto {
  @IsString() plotId!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(168) holdHours?: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller('reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  @RequirePermissions('projects.view')
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query('projectId') projectId?: string,
    @Query('state') state?: string,
  ) {
    return this.reservations.list(user, { projectId, state });
  }

  @Post()
  @RequirePermissions('sales.reservations.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateReservationDto) {
    return this.reservations.reserve(user, { ...dto, holdHours: (dto as any).holdHours ?? (dto as any).holdHours });
  }

  @Post(':id/cancel-request')
  @RequirePermissions('sales.reservations.manage')
  cancelRequest(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.reservations.requestCancel(user, id, body?.reason);
  }
}
