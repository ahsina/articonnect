import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, UpdateReviewDto } from '../dto/review.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a completed mission' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Mission not completed or already reviewed' })
  @ApiResponse({ status: 403, description: 'Not authorized to review this mission' })
  async create(@Request() req: RequestWithUser, @Body() createDto: CreateReviewDto) {
    return this.reviewService.create(req.user.userId, createDto);
  }

  @Get('artisan/:artisanId')
  @ApiOperation({ summary: 'Get all reviews for an artisan' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async getArtisanReviews(@Param('artisanId') artisanId: string) {
    return this.reviewService.findByArtisan(artisanId);
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Get review for a specific mission' })
  @ApiResponse({ status: 200, description: 'Review details' })
  async getMissionReview(@Param('missionId') missionId: string) {
    return this.reviewService.findByMission(missionId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('id') reviewId: string,
    @Request() req: RequestWithUser,
    @Body() updateDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(reviewId, req.user.userId, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async delete(@Param('id') reviewId: string, @Request() req: RequestWithUser) {
    return this.reviewService.delete(reviewId, req.user.userId);
  }
}
