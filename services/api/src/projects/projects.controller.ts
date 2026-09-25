import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) code!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() reraNumber?: string;
  @IsOptional() @IsString() projectType?: string;
  @IsOptional() @IsString() lifecycleStatus?: string;
  @IsOptional() @IsBoolean() agentVisible?: boolean;
  @IsOptional() @IsBoolean() customerListed?: boolean;
  @IsOptional() @IsBoolean() resaleAvailable?: boolean;
  @IsOptional() @IsObject() settingsJson?: Record<string, unknown>;
  @IsOptional() @IsString() pincode?: string;
}

class PlotTypeDto {
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsString() areaSqYd!: string;
  @IsOptional() @IsString() lengthFt?: string;
  @IsOptional() @IsString() widthFt?: string;
  @IsOptional() @IsString() category?: string;
}

class PricingDto {
  @IsString() baseRatePerSqYd!: string;
  @IsOptional() @IsObject() rulesJson?: Record<string, unknown>;
}


class PhaseDto {
  @IsString() name!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

class BlockDto {
  @IsString() name!: string;
  @IsOptional() @IsString() phaseId?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class MediaUploadDto {
  @IsString() kind!: string;
  @IsString() originalName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsNumber() sizeBytes?: number;
  @IsOptional() @IsString() label?: string;
}

class AmenityDto {
  @IsString() name!: string;
  @IsOptional() @IsString() groupName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() completionPct?: number;
}

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal, @Query('lifecycleStatus') lifecycleStatus?: string) {
    return this.projects.list(user, { lifecycleStatus });
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.projects.get(user, id);
  }

  @Post()
  @RequirePermissions('projects.edit')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.edit')
  update(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user, id, dto as any);
  }

  @Get(':id/setup')
  @RequirePermissions('projects.view')
  setup(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.projects.setupBundle(user, id);
  }

  @Post(':id/plot-types')
  @RequirePermissions('projects.edit')
  addPlotType(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: PlotTypeDto) {
    return this.projects.addPlotType(user, id, dto);
  }

  @Delete(':id/plot-types/:plotTypeId')
  @RequirePermissions('projects.edit')
  removePlotType(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Param('plotTypeId') plotTypeId: string,
  ) {
    return this.projects.removePlotType(user, id, plotTypeId);
  }

  @Put(':id/pricing')
  @RequirePermissions('projects.edit')
  upsertPricing(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: PricingDto) {
    return this.projects.upsertPricing(user, id, dto);
  }

  @Post(':id/amenities')
  @RequirePermissions('projects.edit')
  addAmenity(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: AmenityDto) {
    return this.projects.addAmenity(user, id, dto);
  }

  @Delete(':id/amenities/:amenityId')
  @RequirePermissions('projects.edit')
  removeAmenity(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Param('amenityId') amenityId: string,
  ) {
    return this.projects.removeAmenity(user, id, amenityId);
  }

  @Post(':id/phases')
  @RequirePermissions('projects.edit')
  addPhase(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: PhaseDto) {
    return this.projects.addPhase(user, id, dto);
  }

  @Patch(':id/phases/:phaseId')
  @RequirePermissions('projects.edit')
  updatePhase(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('phaseId') phaseId: string, @Body() dto: PhaseDto) {
    return this.projects.updatePhase(user, id, phaseId, dto);
  }

  @Delete(':id/phases/:phaseId')
  @RequirePermissions('projects.edit')
  removePhase(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.projects.removePhase(user, id, phaseId);
  }

  @Post(':id/blocks')
  @RequirePermissions('projects.edit')
  addBlock(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: BlockDto) {
    return this.projects.addBlock(user, id, dto);
  }

  @Patch(':id/blocks/:blockId')
  @RequirePermissions('projects.edit')
  updateBlock(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('blockId') blockId: string, @Body() dto: BlockDto) {
    return this.projects.updateBlock(user, id, blockId, dto);
  }

  @Delete(':id/blocks/:blockId')
  @RequirePermissions('projects.edit')
  removeBlock(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('blockId') blockId: string) {
    return this.projects.removeBlock(user, id, blockId);
  }

  @Get(':id/media')
  @RequirePermissions('projects.view')
  mediaList(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.projects.mediaList(user, id);
  }

  @Post(':id/media')
  @RequirePermissions('projects.edit')
  mediaUpload(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: MediaUploadDto) {
    return this.projects.mediaUpload(user, id, dto);
  }
}
