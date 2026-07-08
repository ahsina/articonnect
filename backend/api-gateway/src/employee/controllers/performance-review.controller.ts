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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  constructor(
    private readonly reviewService: PerformanceReviewService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Le JWT ne pose PAS companyId sur req.user. On dérive donc l'entreprise
   * à partir du CompanyEmployee actif de l'utilisateur (rôle OWNER/MANAGER),
   * garantissant l'isolation multi-tenant. Un throw évite le companyId=undefined
   * qui neutralisait tous les filtres Prisma d'accès.
   */
  private async resolveCompanyId(userId: string): Promise<string> {
    const membership = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { companyId: true },
    });
    if (!membership) {
      throw new ForbiddenException(
        "Accès refusé : aucune entreprise gérée trouvée pour cet utilisateur",
      );
    }
    return membership.companyId;
  }

  // Reviews CRUD
  @Post()
  async createReview(@Request() req, @Body() dto: CreatePerformanceReviewDto) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.createReview(req.user.id, companyId, dto);
  }

  @Get()
  async findAllReviews(@Request() req, @Query() filters: ReviewFilterDto) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.findAllReviews(companyId, req.user.id, filters);
  }

  @Get(':id')
  async findReviewById(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.findReviewById(id, req.user.id, companyId);
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
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.deleteReview(id, req.user.id, companyId);
  }

  // Goals
  @Post('goals')
  async createGoal(@Request() req, @Body() dto: CreateGoalDto) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.createGoal(req.user.id, companyId, dto);
  }

  @Get('goals/employee/:employeeId')
  async getEmployeeGoals(
    @Request() req,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.getEmployeeGoals(employeeId, req.user.id, companyId);
  }

  @Put('goals/:goalId')
  async updateGoal(
    @Request() req,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.updateGoal(goalId, req.user.id, companyId, dto);
  }

  @Delete('goals/:goalId')
  @HttpCode(HttpStatus.OK)
  async deleteGoal(@Request() req, @Param('goalId', ParseUUIDPipe) goalId: string) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.deleteGoal(goalId, req.user.id, companyId);
  }

  // 360 Feedback
  @Post('360-feedback/request')
  async create360FeedbackRequest(@Request() req, @Body() dto: Feedback360RequestDto) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.create360FeedbackRequest(req.user.id, companyId, dto);
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
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.get360FeedbackSummary(employeeId, req.user.id, companyId);
  }

  // Templates
  @Post('templates')
  async createTemplate(@Request() req, @Body() dto: ReviewTemplateDto) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.createReviewTemplate(req.user.id, companyId, dto);
  }

  @Get('templates')
  async getTemplates(@Request() req) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.getReviewTemplates(companyId);
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @Request() req,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.deleteReviewTemplate(templateId, req.user.id, companyId);
  }

  // Analytics
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = await this.resolveCompanyId(req.user.id);
    return this.reviewService.getReviewAnalytics(
      companyId,
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
