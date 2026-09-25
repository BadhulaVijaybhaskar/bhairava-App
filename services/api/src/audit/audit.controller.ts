import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.audit.list(user.organizationId, {
      entityType,
      entityId,
      action,
      actorId,
      take: take ? Number(take) : undefined,
      cursor,
    });
  }

  @Get(':id')
  @RequirePermissions('audit.view')
  async get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    const row = await this.audit.get(user.organizationId, id);
    if (!row) throw new NotFoundException('Audit entry not found');
    return row;
  }

  /** Block all write verbs — users cannot modify/delete audit history via API. */
  @Post()
  @RequirePermissions('audit.view')
  createBlocked() {
    return this.audit.rejectMutation();
  }

  @Patch(':id')
  @RequirePermissions('audit.view')
  patchBlocked() {
    return this.audit.rejectMutation();
  }

  @Put(':id')
  @RequirePermissions('audit.view')
  putBlocked() {
    return this.audit.rejectMutation();
  }

  @Delete(':id')
  @RequirePermissions('audit.view')
  deleteBlocked() {
    return this.audit.rejectMutation();
  }
}
