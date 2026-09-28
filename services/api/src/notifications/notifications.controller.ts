import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('take') take?: string,
  ) {
    return this.notifications.listMine(user, {
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      take: take ? Number(take) : undefined,
    });
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post('read-all')
  markAll(@CurrentUser() user: AuthPrincipal) {
    return this.notifications.markAllRead(user);
  }

  /** Staff test dispatch — uses stub providers only (no third-party credentials). */
  @Post('dispatch')
  dispatch(
    @CurrentUser() user: AuthPrincipal,
    @Body()
    body: {
      userId?: string;
      title: string;
      body: string;
      channels?: Array<'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'>;
      toAddress?: string;
    },
  ) {
    if (!['FOUNDER', 'ADMINISTRATOR'].includes(user.roleCode)) {
      throw new ForbiddenException('Only Founder/Administrator may dispatch');
    }
    return this.notifications.notify({
      organizationId: user.organizationId,
      userId: body.userId || user.userId,
      title: body.title,
      body: body.body,
      channels: body.channels,
      toAddress: body.toAddress,
      actorId: user.userId,
    });
  }
}
