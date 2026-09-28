import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthPrincipal | undefined;
  },
);
