import { Controller, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FcmService } from './services/fcm.service';
import { RegisterTokenDto, UnregisterTokenDto } from './dto/fcm.dto';

@ApiTags('FCM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register FCM token for push notifications' })
  @ApiResponse({ status: 200, description: 'Token registered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerToken(@Req() req, @Body() dto: RegisterTokenDto) {
    await this.fcmService.registerToken(req.user.userId, dto.token);
    return {
      success: true,
      message: 'FCM token registered successfully',
    };
  }

  @Delete('unregister')
  @ApiOperation({ summary: 'Unregister FCM token' })
  @ApiResponse({ status: 200, description: 'Token unregistered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unregisterToken(@Req() req, @Body() dto: UnregisterTokenDto) {
    await this.fcmService.unregisterToken(req.user.userId, dto.token);
    return {
      success: true,
      message: 'FCM token unregistered successfully',
    };
  }
}
