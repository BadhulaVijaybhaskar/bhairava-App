import { Body, Controller, Get, Header, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class UpdateSettingsDto {
  @IsObject()
  settingsJson!: Record<string, unknown>;
}

class ScheduleItemDto {
  @IsString() name!: string;
  @IsString() dueDate!: string;
  @IsString() amountDuePaise!: string;
  @IsOptional() installmentNumber?: number;
}

class CreateScheduleDto {
  @IsString() bookingId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ScheduleItemDto)
  items!: ScheduleItemDto[];
}

class CreateRegistrationDto {
  @IsString() bookingId!: string;
  @IsOptional() @IsString() notes?: string;
}

class UpdateRegistrationDto {
  @IsString() status!: string;
  @IsOptional() @IsString() deedNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

class CreateResaleDto {
  @IsString() plotId!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsString() askingPricePaise?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() list?: boolean;
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('agents')
  @RequirePermissions('projects.view')
  agents(@CurrentUser() user: AuthPrincipal) {
    return this.ops.agents(user);
  }

  @Get('receipts')
  @RequirePermissions('finance.view')
  receipts(@CurrentUser() user: AuthPrincipal) {
    return this.ops.receipts(user);
  }

  @Get('receipts/:id')
  @RequirePermissions('finance.view')
  receipt(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.ops.receipt(user, id);
  }

  @Get('receipts/:id/pdf')
  @RequirePermissions('finance.view')
  @Header('Content-Type', 'application/pdf')
  async receiptPdf(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.ops.receiptPdf(user, id);
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }


  @Get('commissions')
  @RequirePermissions('finance.view')
  commissions(@CurrentUser() user: AuthPrincipal) {
    return this.ops.commissions(user);
  }

  @Get('payment-schedules')
  @RequirePermissions('finance.view')
  schedules(@CurrentUser() user: AuthPrincipal, @Query('bookingId') bookingId?: string) {
    return this.ops.schedules(user, bookingId);
  }

  @Post('payment-schedules')
  @RequirePermissions('finance.operate')
  createSchedule(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateScheduleDto) {
    return this.ops.createSchedule(user, dto);
  }

  @Get('registrations')
  @RequirePermissions('projects.view')
  registrations(@CurrentUser() user: AuthPrincipal) {
    return this.ops.registrations(user);
  }

  @Post('registrations')
  @RequirePermissions('projects.edit')
  createRegistration(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateRegistrationDto) {
    return this.ops.createRegistration(user, dto);
  }

  @Patch('registrations/:id')
  @RequirePermissions('projects.edit')
  updateRegistration(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.ops.updateRegistration(user, id, dto);
  }

  @Get('resales')
  @RequirePermissions('projects.view')
  resales(@CurrentUser() user: AuthPrincipal) {
    return this.ops.resales(user);
  }

  @Post('resales')
  @RequirePermissions('projects.edit')
  createResale(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateResaleDto) {
    return this.ops.createResale(user, dto);
  }

  @Get('users')
  @RequirePermissions('users.manage')
  users(@CurrentUser() user: AuthPrincipal) {
    return this.ops.users(user);
  }

  @Get('company-settings')
  @RequirePermissions('projects.view')
  companySettings(@CurrentUser() user: AuthPrincipal) {
    return this.ops.companySettings(user);
  }

  @Put('company-settings')
  @RequirePermissions('settings.manage')
  updateCompanySettings(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateSettingsDto) {
    return this.ops.updateCompanySettings(user, dto.settingsJson);
  }

  @Get('reports/summary')
  @RequirePermissions('reports.view')
  reports(@CurrentUser() user: AuthPrincipal) {
    return this.ops.reportsSummary(user);
  }
}
