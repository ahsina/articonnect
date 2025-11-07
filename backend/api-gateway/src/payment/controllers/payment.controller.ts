import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentService } from '../services/payment.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPaymentIntent(
    @Request() req,
    @Body() body: { missionId: string },
  ) {
    return this.paymentService.createPaymentIntent(body.missionId, req.user.userId);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    // In production, verify webhook signature
    return this.paymentService.handleWebhook(body);
  }
}
