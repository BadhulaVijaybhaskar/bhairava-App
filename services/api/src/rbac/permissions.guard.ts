import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleHasPermission, normalizeRoleCode, type PermissionCode } from '@bhairava/permissions';
import type { AuthPrincipal } from '../auth/auth.types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, perms);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthPrincipal | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');
    const role = normalizeRoleCode(user.roleCode);
    const ok = required.every((p) => roleHasPermission(role, p));
    if (!ok) throw new ForbiddenException('Missing permission');
    // Org binding: never trust client organizationId
    req.organizationId = user.organizationId;
    return true;
  }
}
