import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReviewResponseService } from '../services/review-response.service';
import { CreateReviewResponseDto } from '../dto/review-response.dto';

@ApiTags('Review Responses')
@ApiBearerAuth()
@Controller('review-responses')
@UseGuards(JwtAuthGuard)
export class ReviewResponseController {
  constructor(private readonly responseService: ReviewResponseService) {}

  @Post(':reviewId')
  @ApiOperation({ summary: 'Respond to a review (reviewed user only)' })
  async createResponse(
    @Param('reviewId') reviewId: string,
    @Request() req,
    @Body() dto: CreateReviewResponseDto,
  ) {
    const response = await this.responseService.createResponse(
      reviewId,
      req.user.userId,
      dto.response,
    );
    return { response };
  }

  @Put(':responseId')
  @ApiOperation({ summary: 'Update a review response (owner only)' })
  async updateResponse(
    @Param('responseId') responseId: string,
    @Request() req,
    @Body() dto: CreateReviewResponseDto,
  ) {
    const response = await this.responseService.updateResponse(
      responseId,
      req.user.userId,
      dto.response,
    );
    return { response };
  }

  @Delete(':responseId')
  @ApiOperation({ summary: 'Delete a review response (owner only)' })
  async deleteResponse(@Param('responseId') responseId: string, @Request() req) {
    await this.responseService.deleteResponse(responseId, req.user.userId);
    return { message: 'Response deleted successfully' };
  }

  @Get('review/:reviewId')
  @ApiOperation({ summary: 'Get response for a specific review' })
  async getResponseByReview(@Param('reviewId') reviewId: string) {
    const response = await this.responseService.getResponseByReviewId(reviewId);
    return { response };
  }

  @Get('my-responses')
  @ApiOperation({ summary: 'Get all responses by current user' })
  async getMyResponses(@Request() req) {
    const responses = await this.responseService.getResponsesByUser(req.user.userId);
    return { responses };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get reviews that need a response' })
  async getReviewsNeedingResponse(@Request() req) {
    const reviews = await this.responseService.getReviewsNeedingResponse(
      req.user.userId,
    );
    return { reviews };
  }
}
