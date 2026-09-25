import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateDocumentDto {
  @IsString() @MinLength(1) title!: string;
  @IsString() visibility!: string;
  @IsString() originalName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() docType?: string;
}

class ReplaceDocumentDto {
  @IsString() originalName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
}

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions('documents.customer_related')
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query('projectId') projectId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.documents.list(user, { projectId, bookingId, customerId });
  }

  @Post()
  @RequirePermissions('documents.internal')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Get(':id/download')
  @RequirePermissions('documents.customer_related')
  download(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.documents.download(user, id);
  }

  @Post(':id/replace')
  @RequirePermissions('documents.internal')
  replace(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: ReplaceDocumentDto) {
    return this.documents.replace(user, id, dto);
  }

  @Patch(':id/archive')
  @RequirePermissions('documents.internal')
  archive(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.documents.archive(user, id);
  }

  @Patch(':id/verify')
  @RequirePermissions('documents.internal')
  verify(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.documents.verify(user, id);
  }
}