import {
  Controller,
  Get,
  Put,
  Post,
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
import { UpdateProfileDto, CreateArtisanProfileDto } from '../dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
