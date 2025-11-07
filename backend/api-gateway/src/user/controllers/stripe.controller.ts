import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StripeConnectService } from '../services/stripe-connect.service';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Stripe Connect')
@Controller('stripe')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StripeController {
  constructor(private readonly stripeConnectService: StripeConnectService) {}

  @Post('onboard')
  @Roles('ARTISAN')
  @ApiBearerAuth()
  async createOnboardingLink(@Request() req: RequestWithUser) {
    return this.stripeConnectService.createOnboardingLink(req.user.userId);
  }

  @Get('status')
  @Roles('ARTISAN')
  @ApiBearerAuth()
  async getOnboardingStatus(@Request() req: RequestWithUser) {
    return this.stripeConnectService.getOnboardingStatus(req.user.userId);
  }

  @Post('refresh-link')
  @Roles('ARTISAN')
  @ApiBearerAuth()
  async refreshOnboardingLink(@Request() req: RequestWithUser) {
    return this.stripeConnectService.refreshOnboardingLink(req.user.userId);
  }
}
