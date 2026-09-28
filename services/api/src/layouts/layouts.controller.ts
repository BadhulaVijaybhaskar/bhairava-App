import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Allow, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { LayoutsService } from './layouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateLayoutDto {
  @IsString() projectId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @IsOptional() @IsInt() @Min(1) widthPx?: number;
  @IsOptional() @IsInt() @Min(1) heightPx?: number;
}

class SetPolygonDto {
  @Allow() @IsArray() points!: unknown;
  @IsOptional() @IsBoolean() replaceExisting?: boolean;
  @IsOptional() @IsString() layoutId?: string;
}

class RelinkDto {
  @IsString() sourcePlotId!: string;
  @IsString() targetPlotId!: string;
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LayoutsController {
  constructor(private readonly layouts: LayoutsService) {}

  @Get('projects/:projectId/layouts')
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal, @Param('projectId') projectId: string) {
    return this.layouts.list(user, projectId);
  }

  @Get('layouts/:id')
  @RequirePermissions('projects.view')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.layouts.get(user, id);
  }

  @Post('layouts')
  @RequirePermissions('projects.plots.edit')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLayoutDto) {
    return this.layouts.create(user, dto);
  }

  @Post('plots/:plotId/polygon')
  @RequirePermissions('projects.plots.edit')
  setPolygon(@CurrentUser() user: AuthPrincipal, @Param('plotId') plotId: string, @Body() dto: SetPolygonDto) {
    return this.layouts.setPolygon(user, plotId, dto);
  }

  @Delete('plots/:plotId/polygon')
  @RequirePermissions('projects.plots.edit')
  clearPolygon(@CurrentUser() user: AuthPrincipal, @Param('plotId') plotId: string) {
    return this.layouts.clearPolygon(user, plotId);
  }

  @Post('layouts/relink-polygon')
  @RequirePermissions('projects.plots.edit')
  relink(@CurrentUser() user: AuthPrincipal, @Body() dto: RelinkDto) {
    return this.layouts.relink(user, dto);
  }

  @Post('layouts/validate-polygon')
  @RequirePermissions('projects.plots.edit')
  validate(@Body() body: { points: unknown }) {
    return this.layouts.validateDraft(body.points);
  }
}
