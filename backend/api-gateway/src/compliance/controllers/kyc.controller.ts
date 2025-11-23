import { Controller, Get, Post, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { KycService } from '../services/kyc.service';

@Controller('compliance/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  /**
   * GET /compliance/kyc/status
   * Get KYC status for current user
   */
  @Get('status')
  async getMyKycStatus(@Request() req) {
    return this.kycService.getKycStatus(req.user.userId);
  }

  /**
   * POST /compliance/kyc/initiate
   * Initiate KYC verification
   */
  @Post('initiate')
  async initiateKyc(@Request() req) {
    return this.kycService.initiateKycVerification(req.user.userId);
  }

  /**
   * GET /compliance/kyc/status/:userId
   * Get KYC status for specific user (Admin only)
   */
  @Get('status/:userId')
  @Roles(UserRole.ADMIN)
  async getUserKycStatus(@Param('userId') userId: string) {
    return this.kycService.getKycStatus(userId);
  }
}
