import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const unreadOnlyBool = unreadOnly === 'true';

    return this.notificationService.getUserNotifications(
      userId,
      limitNum,
      unreadOnlyBool,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') notificationId: string) {
    const userId = req.user.userId;
    await this.notificationService.markAsRead(notificationId, userId);
    return { success: true };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Req() req: any, @Param('id') notificationId: string) {
    const userId = req.user.userId;
    await this.notificationService.deleteNotification(notificationId, userId);
    return { success: true };
  }
}
