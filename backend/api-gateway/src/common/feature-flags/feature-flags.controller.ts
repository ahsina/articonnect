import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlag,
  FeatureFlagContext,
} from './feature-flags.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Get all feature flags
   */
  @Get()
  async getAllFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagsService.getAllFlags();
  }

  /**
   * Get a specific feature flag
   */
  @Get(':key')
  async getFlag(@Param('key') key: string): Promise<FeatureFlag | null> {
    return this.featureFlagsService.getFlag(key);
  }

  /**
   * Create a new feature flag
   */
  @Post()
  async createFlag(
    @Body() dto: CreateFeatureFlagDto,
    @Req() req: any,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.createFlag(dto, req.user?.sub);
  }

  /**
   * Update a feature flag
   */
  @Put(':key')
  async updateFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: any,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.updateFlag(key, dto, req.user?.sub);
  }

  /**
   * Delete a feature flag
   */
  @Delete(':key')
  async deleteFlag(@Param('key') key: string): Promise<{ success: boolean }> {
    await this.featureFlagsService.deleteFlag(key);
    return { success: true };
  }

  /**
   * Quick enable a feature flag
   */
  @Post(':key/enable')
  async enableFlag(
    @Param('key') key: string,
    @Req() req: any,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.enableFlag(key, req.user?.sub);
  }

  /**
   * Quick disable a feature flag
   */
  @Post(':key/disable')
  async disableFlag(
    @Param('key') key: string,
    @Req() req: any,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.disableFlag(key, req.user?.sub);
  }

  /**
   * Evaluate a flag for a specific context
   */
  @Post(':key/evaluate')
  async evaluateFlag(
    @Param('key') key: string,
    @Body() context: FeatureFlagContext,
  ) {
    return this.featureFlagsService.evaluate(key, context);
  }

  /**
   * Check if flag is enabled for current user
   */
  @Get(':key/status')
  async getFlagStatus(
    @Param('key') key: string,
    @Req() req: any,
  ): Promise<{ key: string; enabled: boolean }> {
    const context: FeatureFlagContext = {
      userId: req.user?.sub,
      userRole: req.user?.role,
    };
    const enabled = await this.featureFlagsService.isEnabled(key, context);
    return { key, enabled };
  }
}

/**
 * Public endpoint for checking feature flags
 * (for frontend to check flag status)
 */
@Controller('feature-flags')
export class FeatureFlagsPublicController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Check multiple flags at once (for frontend)
   */
  @Post('check')
  async checkFlags(
    @Body() body: { keys: string[]; context?: FeatureFlagContext },
  ): Promise<Record<string, boolean>> {
    return this.featureFlagsService.evaluateMultiple(body.keys, body.context);
  }

  /**
   * Check a single flag
   */
  @Get('check/:key')
  async checkFlag(@Param('key') key: string): Promise<{ enabled: boolean }> {
    const enabled = await this.featureFlagsService.isEnabled(key);
    return { enabled };
  }
}
