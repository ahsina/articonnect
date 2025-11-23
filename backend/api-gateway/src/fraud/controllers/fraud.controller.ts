import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MultiAccountDetectorService } from '../services/multi-account-detector.service';
import { ReviewFraudDetectorService } from '../services/review-fraud-detector.service';
import { PayoutFraudDetectorService } from '../services/payout-fraud-detector.service';
import { PriceAnomalyDetectorService } from '../services/price-anomaly-detector.service';
import { RefundAbuseDetectorService } from '../services/refund-abuse-detector.service';

@Controller('fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FraudController {
  constructor(
    private multiAccountDetector: MultiAccountDetectorService,
    private reviewFraudDetector: ReviewFraudDetectorService,
    private payoutFraudDetector: PayoutFraudDetectorService,
    private priceAnomalyDetector: PriceAnomalyDetectorService,
    private refundAbuseDetector: RefundAbuseDetectorService,
  ) {}

  /**
   * GET /fraud/multi-account/flagged
   * Get all users flagged for multi-account fraud
   * Admin only
   */
  @Get('multi-account/flagged')
  @Roles(UserRole.ADMIN)
  async getFlaggedUsers(@Query('limit') limit?: string) {
    return this.multiAccountDetector.getFlaggedUsers(parseInt(limit || '100'));
  }

  /**
   * POST /fraud/multi-account/detect/:userId
   * Manually trigger multi-account detection for a user
   * Admin only
   */
  @Post('multi-account/detect/:userId')
  @Roles(UserRole.ADMIN)
  async detectMultiAccount(@Param('userId') userId: string) {
    return this.multiAccountDetector.detectMultipleAccounts(userId);
  }

  /**
   * POST /fraud/review/detect/:reviewId
   * Detect fraud in a specific review
   * Admin only
   */
  @Post('review/detect/:reviewId')
  @Roles(UserRole.ADMIN)
  async detectReviewFraud(@Param('reviewId') reviewId: string) {
    return this.reviewFraudDetector.detectFakeReview(reviewId);
  }

  /**
   * POST /fraud/payout/screen
   * Screen a payout for fraud
   * Admin only
   */
  @Post('payout/screen')
  @Roles(UserRole.ADMIN)
  async screenPayout(@Body() body: { artisanId: string; amount: number }) {
    return this.payoutFraudDetector.screenPayout(body.artisanId, body.amount);
  }

  /**
   * POST /fraud/price/detect/:missionId
   * Detect price anomalies in a mission
   * Admin only
   */
  @Post('price/detect/:missionId')
  @Roles(UserRole.ADMIN)
  async detectPriceAnomaly(@Param('missionId') missionId: string) {
    return this.priceAnomalyDetector.detectPriceAnomaly(missionId);
  }

  /**
   * POST /fraud/refund/detect
   * Detect refund abuse for a user and mission
   * Admin only
   */
  @Post('refund/detect')
  @Roles(UserRole.ADMIN)
  async detectRefundAbuse(@Body() body: { userId: string; missionId: string }) {
    return this.refundAbuseDetector.detectRefundAbuse(body.userId, body.missionId);
  }
}
