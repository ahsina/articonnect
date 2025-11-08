import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { UpdateNotificationPreferencesDto } from '../dto/preferences.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: RequestWithUser,
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
  async getUnreadCount(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: RequestWithUser, @Param('id') notificationId: string) {
    const userId = req.user.userId;
    await this.notificationService.markAsRead(notificationId, userId);
    return { success: true };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Req() req: RequestWithUser, @Param('id') notificationId: string) {
    const userId = req.user.userId;
    await this.notificationService.deleteNotification(notificationId, userId);
    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Req() req: RequestWithUser) {
    return this.preferencesService.getPreferences(req.user.userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Req() req: RequestWithUser,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(req.user.userId, updateDto);
  }

  @Post('preferences/reset')
  @ApiOperation({ summary: 'Reset preferences to defaults' })
  async resetPreferences(@Req() req: RequestWithUser) {
    return this.preferencesService.resetPreferences(req.user.userId);
  }
}
