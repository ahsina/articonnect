import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';

/**
 * Admin controller for managing fraud protection settings
 */
@Controller('admin/fraud-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Roles('ADMIN')
export class FraudSettingsController {
  constructor(private featureToggle: FeatureToggleService) {}

  /**
   * GET /admin/fraud-settings
   * Get current fraud protection configuration
   */
  @Get()
  async getSettings() {
    return this.featureToggle.getConfig();
  }

  /**
   * PUT /admin/fraud-settings
   * Update fraud protection configuration
   */
  @Put()
  async updateSettings(@Request() req, @Body() updates: any) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(updates, adminId);
  }

  /**
   * PUT /admin/fraud-settings/multi-account/toggle
   * Toggle multi-account detection
   */
  @Put('multi-account/toggle')
  async toggleMultiAccountDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { multiAccountDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/review-fraud/toggle
   * Toggle review fraud detection
   */
  @Put('review-fraud/toggle')
  async toggleReviewFraudDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { reviewFraudDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/payout-fraud/toggle
   * Toggle payout fraud screening
   */
  @Put('payout-fraud/toggle')
  async togglePayoutFraudScreening(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { payoutFraudScreeningEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/price-anomaly/toggle
   * Toggle price anomaly detection
   */
  @Put('price-anomaly/toggle')
  async togglePriceAnomalyDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { priceAnomalyDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/refund-abuse/toggle
   * Toggle refund abuse detection
   */
  @Put('refund-abuse/toggle')
  async toggleRefundAbuseDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { refundAbuseDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/session-anomaly/toggle
   * Toggle session anomaly detection
   */
  @Put('session-anomaly/toggle')
  async toggleSessionAnomalyDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { sessionAnomalyDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/kyc/toggle
   * Toggle KYC/AML
   */
  @Put('kyc/toggle')
  async toggleKyc(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig({ kycEnabled: enabled }, adminId);
  }

  /**
   * PUT /admin/fraud-settings/bot-detection/toggle
   * Toggle bot detection
   */
  @Put('bot-detection/toggle')
  async toggleBotDetection(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { botDetectionEnabled: enabled },
      adminId,
    );
  }

  /**
   * PUT /admin/fraud-settings/business-verification/toggle
   * Toggle business verification requirement
   */
  @Put('business-verification/toggle')
  async toggleBusinessVerification(@Request() req, @Body('enabled') enabled: boolean) {
    const adminId = req.user.userId;
    return this.featureToggle.updateConfig(
      { businessVerificationRequired: enabled },
      adminId,
    );
  }

  /**
   * GET /admin/fraud-settings/status
   * Get quick status of all fraud protection features
   */
  @Get('status')
  async getStatus() {
    const config = await this.featureToggle.getConfig();

    return {
      multiAccountDetection: {
        enabled: config.multiAccountDetectionEnabled,
        threshold: config.multiAccountRiskThreshold,
      },
      reviewFraudDetection: {
        enabled: config.reviewFraudDetectionEnabled,
        threshold: config.reviewFraudScoreThreshold,
        autoHide: config.reviewAutoHideEnabled,
      },
      payoutFraudScreening: {
        enabled: config.payoutFraudScreeningEnabled,
        threshold: config.payoutRiskThreshold,
        autoHold: config.payoutAutoHoldEnabled,
      },
      priceAnomalyDetection: {
        enabled: config.priceAnomalyDetectionEnabled,
        threshold: config.priceDeviationThreshold,
        autoFlag: config.priceAutoFlagEnabled,
      },
      refundAbuseDetection: {
        enabled: config.refundAbuseDetectionEnabled,
        threshold: config.refundAbuseScoreThreshold,
        autoReject: config.refundAutoRejectEnabled,
      },
      sessionAnomalyDetection: {
        enabled: config.sessionAnomalyDetectionEnabled,
        threatThreshold: config.sessionThreatLevelThreshold,
        autoLogout: config.sessionAutoLogoutEnabled,
      },
      kyc: {
        enabled: config.kycEnabled,
        singleThreshold: config.kycSingleTransactionThreshold,
        cumulativeThreshold: config.kycCumulativeThreshold,
        autoBlock: config.kycAutoBlockEnabled,
      },
      botDetection: {
        enabled: config.botDetectionEnabled,
        threshold: config.botScoreThreshold,
        captchaEnabled: config.botCaptchaEnabled,
      },
      businessVerification: {
        required: config.businessVerificationRequired,
        autoReject: config.businessVerificationAutoReject,
      },
    };
  }
}
