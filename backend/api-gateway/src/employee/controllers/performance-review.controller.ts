import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerformanceReviewService } from '../services/performance-review.service';
import {
  CreatePerformanceReviewDto,
  UpdatePerformanceReviewDto,
  SubmitReviewDto,
  AcknowledgeReviewDto,
  CreateGoalDto,
  UpdateGoalDto,
  ReviewFilterDto,
  Feedback360RequestDto,
  Feedback360ResponseDto,
  ReviewTemplateDto,
} from '../dto/performance-review.dto';

@Controller('performance-reviews')
@UseGuards(JwtAuthGuard)
export class PerformanceReviewController {
  constructor(private readonly reviewService: PerformanceReviewService) {}

  // Reviews CRUD
  @Post()
  async createReview(@Request() req, @Body() dto: CreatePerformanceReviewDto) {
    return this.reviewService.createReview(req.user.id, req.user.companyId, dto);
  }

  @Get()
  async findAllReviews(@Request() req, @Query() filters: ReviewFilterDto) {
    return this.reviewService.findAllReviews(req.user.companyId, req.user.id, filters);
  }

  @Get(':id')
  async findReviewById(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.findReviewById(id, req.user.id, req.user.companyId);
  }

  @Put(':id')
  async updateReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePerformanceReviewDto,
  ) {
    return this.reviewService.updateReview(id, req.user.id, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submitReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewService.submitReview(id, req.user.id, dto);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeReviewDto,
  ) {
    return this.reviewService.acknowledgeReview(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.deleteReview(id, req.user.id, req.user.companyId);
  }

  // Goals
  @Post('goals')
  async createGoal(@Request() req, @Body() dto: CreateGoalDto) {
    return this.reviewService.createGoal(req.user.id, req.user.companyId, dto);
  }

  @Get('goals/employee/:employeeId')
  async getEmployeeGoals(
    @Request() req,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.reviewService.getEmployeeGoals(employeeId, req.user.id, req.user.companyId);
  }

  @Put('goals/:goalId')
  async updateGoal(
    @Request() req,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.reviewService.updateGoal(goalId, req.user.id, req.user.companyId, dto);
  }

  @Delete('goals/:goalId')
  @HttpCode(HttpStatus.OK)
  async deleteGoal(@Request() req, @Param('goalId', ParseUUIDPipe) goalId: string) {
    return this.reviewService.deleteGoal(goalId, req.user.id, req.user.companyId);
  }

  // 360 Feedback
  @Post('360-feedback/request')
  async create360FeedbackRequest(@Request() req, @Body() dto: Feedback360RequestDto) {
    return this.reviewService.create360FeedbackRequest(req.user.id, req.user.companyId, dto);
  }

  @Post('360-feedback/submit')
  @HttpCode(HttpStatus.OK)
  async submit360Feedback(@Request() req, @Body() dto: Feedback360ResponseDto) {
    return this.reviewService.submit360Feedback(req.user.id, dto);
  }

  @Get('360-feedback/summary/:employeeId')
  async get360FeedbackSummary(
    @Request() req,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.reviewService.get360FeedbackSummary(employeeId, req.user.id, req.user.companyId);
  }

  // Templates
  @Post('templates')
  async createTemplate(@Request() req, @Body() dto: ReviewTemplateDto) {
    return this.reviewService.createReviewTemplate(req.user.id, req.user.companyId, dto);
  }

  @Get('templates')
  async getTemplates(@Request() req) {
    return this.reviewService.getReviewTemplates(req.user.companyId);
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @Request() req,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.reviewService.deleteReviewTemplate(templateId, req.user.id, req.user.companyId);
  }

  // Analytics
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reviewService.getReviewAnalytics(
      req.user.companyId,
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
