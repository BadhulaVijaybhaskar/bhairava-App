import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateCustomerDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(5) phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() kycStatus?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() aadhaar?: string;
}

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal) {
    return this.customers.list(user);
  }

  @Get(':id/pii')
  @RequirePermissions('customers.pii.reveal')
  reveal(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Query('field') field?: string,
  ) {
    const f = field === 'aadhaar' ? 'aadhaar' : 'pan';
    return this.customers.revealPii(user, id, f);
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.customers.get(user, id);
  }

  @Post()
  @RequirePermissions('sales.leads.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }
}