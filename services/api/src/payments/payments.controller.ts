import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreatePaymentDto {
  @IsString() bookingId!: string;
  @IsString() amountPaise!: string;
  @IsString() paidAt!: string;
  @IsString() method!: string;
  @IsOptional() @IsString() txnRef?: string;
  @IsOptional() @IsString() scheduleItemId?: string;
  @IsOptional() @IsString() notes?: string;
}

class VoidPaymentDto {
  @IsString() @MinLength(3) reason!: string;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermissions('finance.view')
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query('bookingId') bookingId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.payments.list(user, { bookingId, projectId });
  }

  @Get(':id')
  @RequirePermissions('finance.view')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.payments.get(user, id);
  }

  @Post()
  @RequirePermissions('finance.operate')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user, dto);
  }

  @Post(':id/void')
  @RequirePermissions('finance.operate')
  void(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: VoidPaymentDto) {
    return this.payments.voidPayment(user, id, dto.reason);
  }
}
