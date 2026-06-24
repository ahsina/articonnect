import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserService } from '../services/user.service';
import { GdprService } from '../services/gdpr.service';
import { UpdateProfileDto, CreateArtisanProfileDto, UpdateClientProfileDto } from '../dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly gdprService: GdprService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.userId, updateDto);
  }

  @Get('client-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current client profile (B2B/B2C)' })
  async getClientProfile(@Request() req) {
    return this.userService.getClientProfile(req.user.userId);
  }

  @Put('client-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update current client profile' })
  async updateClientProfile(@Request() req, @Body() dto: UpdateClientProfileDto) {
    return this.userService.updateClientProfile(req.user.userId, dto);
  }

  @Post('artisan-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create artisan profile' })
  async createArtisanProfile(
    @Request() req,
    @Body() dto: CreateArtisanProfileDto,
  ) {
    return this.userService.createArtisanProfile(req.user.userId, dto);
  }

  @Get('artisans')
  @ApiOperation({ summary: 'Get list of artisans' })
  async getArtisans(
    @Query('specialtyId') specialtyId?: string,
    @Query('city') city?: string,
    @Query('minRating') minRating?: number,
  ) {
    return this.userService.getArtisans({
      specialtyId,
      city,
      minRating,
    });
  }

  @Get('artisans/:id')
  @ApiOperation({ summary: 'Get artisan details' })
  async getArtisan(@Param('id') id: string) {
    return this.userService.getArtisan(id);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(req.user.userId, file);
  }

  // ==================== GDPR ====================

  @Get('gdpr/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all user data (GDPR compliance)' })
  async exportData(@Request() req) {
    return this.gdprService.exportUserData(req.user.userId);
  }

  @Post('gdpr/request-deletion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request account deletion (GDPR right to erasure)' })
  async requestDeletion(@Request() req) {
    return this.gdprService.requestDeletion(req.user.userId);
  }

  @Delete('gdpr/cancel-deletion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel account deletion request' })
  async cancelDeletion(@Request() req) {
    return this.gdprService.cancelDeletionRequest(req.user.userId);
  }

  @Get('gdpr/consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user consents (GDPR)' })
  async getConsents(@Request() req) {
    return this.gdprService.getUserConsents(req.user.userId);
  }

  @Put('gdpr/consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user consents' })
  async updateConsents(
    @Request() req,
    @Body() updates: { marketing?: boolean; analytics?: boolean; geolocation?: boolean },
  ) {
    return this.gdprService.updateConsents(req.user.userId, updates);
  }
}
