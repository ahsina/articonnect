import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AutomatedPayoutService } from '../services/automated-payout.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Automated Payouts')
@Controller('payouts/automated')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomatedPayoutController {
  constructor(private readonly payoutService: AutomatedPayoutService) {}

  @Post('company/:companyId/process')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Manually trigger payout processing for a company (Owner/Manager only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Payouts processed successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async processCompanyPayouts(@Param('companyId') companyId: string) {
    return this.payoutService.processCompanyPayoutsManually(companyId);
  }

  @Get('company/:companyId/schedule')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get payout schedule for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Payout schedule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getPayoutSchedule(@Param('companyId') companyId: string) {
    return this.payoutService.getPayoutSchedule(companyId);
  }

  @Get('statistics')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Get global payout statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getPayoutStatistics() {
    return this.payoutService.getPayoutStatistics();
  }
}
