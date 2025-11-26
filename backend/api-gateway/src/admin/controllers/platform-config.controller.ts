import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformConfigService } from '../services/platform-config.service';
import {
  FeeSettingsDto,
  PaymentSettingsDto,
  RateLimitSettingsDto,
  ReputationRulesDto,
  NoShowConfigDto,
  TaxSettingsDto,
  NotificationSettingsDto,
  IntegrationSettingsDto,
  ContentModerationSettingsDto,
  ComplianceSettingsDto,
  MissionSettingsDto,
  UserProfileSettingsDto,
  PerformanceSettingsDto,
} from '../dto/platform-config.dto';

@ApiTags('Admin - Platform Configuration')
@Controller('admin/platform-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlatformConfigController {
  constructor(private readonly platformConfigService: PlatformConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all platform configuration' })
  @ApiResponse({ status: 200, description: 'Platform configuration retrieved successfully' })
  async getPlatformConfig() {
    return this.platformConfigService.getPlatformConfig();
  }

  // Fee Settings
  @Get('fees')
  @ApiOperation({ summary: 'Get fee settings' })
  @ApiResponse({ status: 200, description: 'Fee settings retrieved successfully', type: FeeSettingsDto })
  async getFeeSettings(): Promise<FeeSettingsDto> {
    return this.platformConfigService.getFeeSettings();
  }

  @Put('fees')
  @ApiOperation({ summary: 'Update fee settings' })
  @ApiResponse({ status: 200, description: 'Fee settings updated successfully', type: FeeSettingsDto })
  async updateFeeSettings(
    @Body() settings: Partial<FeeSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<FeeSettingsDto> {
    return this.platformConfigService.updateFeeSettings(settings, req.user?.id);
  }

  // Payment Settings
  @Get('payments')
  @ApiOperation({ summary: 'Get payment settings' })
  @ApiResponse({ status: 200, description: 'Payment settings retrieved successfully', type: PaymentSettingsDto })
  async getPaymentSettings(): Promise<PaymentSettingsDto> {
    return this.platformConfigService.getPaymentSettings();
  }

  @Put('payments')
  @ApiOperation({ summary: 'Update payment settings' })
  @ApiResponse({ status: 200, description: 'Payment settings updated successfully', type: PaymentSettingsDto })
  async updatePaymentSettings(
    @Body() settings: Partial<PaymentSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<PaymentSettingsDto> {
    return this.platformConfigService.updatePaymentSettings(settings, req.user?.id);
  }

  // Rate Limit Settings
  @Get('rate-limits')
  @ApiOperation({ summary: 'Get rate limit settings' })
  @ApiResponse({ status: 200, description: 'Rate limit settings retrieved successfully', type: RateLimitSettingsDto })
  async getRateLimitSettings(): Promise<RateLimitSettingsDto> {
    return this.platformConfigService.getRateLimitSettings();
  }

  @Put('rate-limits')
  @ApiOperation({ summary: 'Update rate limit settings' })
  @ApiResponse({ status: 200, description: 'Rate limit settings updated successfully', type: RateLimitSettingsDto })
  async updateRateLimitSettings(
    @Body() settings: Partial<RateLimitSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<RateLimitSettingsDto> {
    return this.platformConfigService.updateRateLimitSettings(settings, req.user?.id);
  }

  // Reputation Rules
  @Get('reputation-rules')
  @ApiOperation({ summary: 'Get reputation rules' })
  @ApiResponse({ status: 200, description: 'Reputation rules retrieved successfully', type: ReputationRulesDto })
  async getReputationRules(): Promise<ReputationRulesDto> {
    return this.platformConfigService.getReputationRules();
  }

  @Put('reputation-rules')
  @ApiOperation({ summary: 'Update reputation rules' })
  @ApiResponse({ status: 200, description: 'Reputation rules updated successfully', type: ReputationRulesDto })
  async updateReputationRules(
    @Body() rules: Partial<ReputationRulesDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<ReputationRulesDto> {
    return this.platformConfigService.updateReputationRules(rules, req.user?.id);
  }

  // No-Show Config
  @Get('no-show')
  @ApiOperation({ summary: 'Get no-show configuration' })
  @ApiResponse({ status: 200, description: 'No-show configuration retrieved successfully', type: NoShowConfigDto })
  async getNoShowConfig(): Promise<NoShowConfigDto> {
    return this.platformConfigService.getNoShowConfig();
  }

  @Put('no-show')
  @ApiOperation({ summary: 'Update no-show configuration' })
  @ApiResponse({ status: 200, description: 'No-show configuration updated successfully', type: NoShowConfigDto })
  async updateNoShowConfig(
    @Body() config: Partial<NoShowConfigDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<NoShowConfigDto> {
    return this.platformConfigService.updateNoShowConfig(config, req.user?.id);
  }

  // Tax Settings
  @Get('tax')
  @ApiOperation({ summary: 'Get tax/VAT settings' })
  @ApiResponse({ status: 200, description: 'Tax settings retrieved successfully', type: TaxSettingsDto })
  async getTaxSettings(): Promise<TaxSettingsDto> {
    return this.platformConfigService.getTaxSettings();
  }

  @Put('tax')
  @ApiOperation({ summary: 'Update tax/VAT settings' })
  @ApiResponse({ status: 200, description: 'Tax settings updated successfully', type: TaxSettingsDto })
  async updateTaxSettings(
    @Body() settings: Partial<TaxSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<TaxSettingsDto> {
    return this.platformConfigService.updateTaxSettings(settings, req.user?.id);
  }

  // Notification Settings
  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved successfully', type: NotificationSettingsDto })
  async getNotificationSettings(): Promise<NotificationSettingsDto> {
    return this.platformConfigService.getNotificationSettings();
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully', type: NotificationSettingsDto })
  async updateNotificationSettings(
    @Body() settings: Partial<NotificationSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<NotificationSettingsDto> {
    return this.platformConfigService.updateNotificationSettings(settings, req.user?.id);
  }

  // Integration Settings
  @Get('integrations')
  @ApiOperation({ summary: 'Get integration settings' })
  @ApiResponse({ status: 200, description: 'Integration settings retrieved successfully', type: IntegrationSettingsDto })
  async getIntegrationSettings(): Promise<IntegrationSettingsDto> {
    return this.platformConfigService.getIntegrationSettings();
  }

  @Put('integrations')
  @ApiOperation({ summary: 'Update integration settings' })
  @ApiResponse({ status: 200, description: 'Integration settings updated successfully', type: IntegrationSettingsDto })
  async updateIntegrationSettings(
    @Body() settings: Partial<IntegrationSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<IntegrationSettingsDto> {
    return this.platformConfigService.updateIntegrationSettings(settings, req.user?.id);
  }

  // Content Moderation Settings
  @Get('content-moderation')
  @ApiOperation({ summary: 'Get content moderation settings' })
  @ApiResponse({ status: 200, description: 'Content moderation settings retrieved successfully', type: ContentModerationSettingsDto })
  async getContentModerationSettings(): Promise<ContentModerationSettingsDto> {
    return this.platformConfigService.getContentModerationSettings();
  }

  @Put('content-moderation')
  @ApiOperation({ summary: 'Update content moderation settings' })
  @ApiResponse({ status: 200, description: 'Content moderation settings updated successfully', type: ContentModerationSettingsDto })
  async updateContentModerationSettings(
    @Body() settings: Partial<ContentModerationSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<ContentModerationSettingsDto> {
    return this.platformConfigService.updateContentModerationSettings(settings, req.user?.id);
  }

  // Compliance Settings
  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance settings' })
  @ApiResponse({ status: 200, description: 'Compliance settings retrieved successfully', type: ComplianceSettingsDto })
  async getComplianceSettings(): Promise<ComplianceSettingsDto> {
    return this.platformConfigService.getComplianceSettings();
  }

  @Put('compliance')
  @ApiOperation({ summary: 'Update compliance settings' })
  @ApiResponse({ status: 200, description: 'Compliance settings updated successfully', type: ComplianceSettingsDto })
  async updateComplianceSettings(
    @Body() settings: Partial<ComplianceSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<ComplianceSettingsDto> {
    return this.platformConfigService.updateComplianceSettings(settings, req.user?.id);
  }

  // Mission Settings
  @Get('missions')
  @ApiOperation({ summary: 'Get mission settings' })
  @ApiResponse({ status: 200, description: 'Mission settings retrieved successfully', type: MissionSettingsDto })
  async getMissionSettings(): Promise<MissionSettingsDto> {
    return this.platformConfigService.getMissionSettings();
  }

  @Put('missions')
  @ApiOperation({ summary: 'Update mission settings' })
  @ApiResponse({ status: 200, description: 'Mission settings updated successfully', type: MissionSettingsDto })
  async updateMissionSettings(
    @Body() settings: Partial<MissionSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<MissionSettingsDto> {
    return this.platformConfigService.updateMissionSettings(settings, req.user?.id);
  }

  // User Profile Settings
  @Get('users')
  @ApiOperation({ summary: 'Get user profile settings' })
  @ApiResponse({ status: 200, description: 'User profile settings retrieved successfully', type: UserProfileSettingsDto })
  async getUserProfileSettings(): Promise<UserProfileSettingsDto> {
    return this.platformConfigService.getUserProfileSettings();
  }

  @Put('users')
  @ApiOperation({ summary: 'Update user profile settings' })
  @ApiResponse({ status: 200, description: 'User profile settings updated successfully', type: UserProfileSettingsDto })
  async updateUserProfileSettings(
    @Body() settings: Partial<UserProfileSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<UserProfileSettingsDto> {
    return this.platformConfigService.updateUserProfileSettings(settings, req.user?.id);
  }

  // Performance Settings
  @Get('performance')
  @ApiOperation({ summary: 'Get performance settings' })
  @ApiResponse({ status: 200, description: 'Performance settings retrieved successfully', type: PerformanceSettingsDto })
  async getPerformanceSettings(): Promise<PerformanceSettingsDto> {
    return this.platformConfigService.getPerformanceSettings();
  }

  @Put('performance')
  @ApiOperation({ summary: 'Update performance settings' })
  @ApiResponse({ status: 200, description: 'Performance settings updated successfully', type: PerformanceSettingsDto })
  async updatePerformanceSettings(
    @Body() settings: Partial<PerformanceSettingsDto>,
    @Request() req: { user?: { id?: string } },
  ): Promise<PerformanceSettingsDto> {
    return this.platformConfigService.updatePerformanceSettings(settings, req.user?.id);
  }
}
