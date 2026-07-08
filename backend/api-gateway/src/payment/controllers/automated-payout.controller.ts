import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AutomatedPayoutService } from '../services/automated-payout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Automated Payouts')
@Controller('payouts/automated')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomatedPayoutController {
  constructor(
    private readonly payoutService: AutomatedPayoutService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Vérifie que l'utilisateur authentifié est OWNER/MANAGER de l'entreprise ciblée.
   * L'identité vient TOUJOURS du JWT (req.user.userId), jamais d'un paramètre client.
   */
  private async assertCompanyManager(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        "Accès refusé : vous devez être propriétaire ou gestionnaire de cette entreprise",
      );
    }
  }

  @Post('company/:companyId/process')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Manually trigger payout processing for a company (Owner/Manager only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Payouts processed successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async processCompanyPayouts(@Request() req, @Param('companyId') companyId: string) {
    await this.assertCompanyManager(req.user.userId, companyId);
    return this.payoutService.processCompanyPayoutsManually(companyId);
  }

  @Get('company/:companyId/schedule')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get payout schedule for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Payout schedule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getPayoutSchedule(@Request() req, @Param('companyId') companyId: string) {
    await this.assertCompanyManager(req.user.userId, companyId);
    return this.payoutService.getPayoutSchedule(companyId);
  }

  @Get('statistics')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get global payout statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getPayoutStatistics() {
    return this.payoutService.getPayoutStatistics();
  }
}
