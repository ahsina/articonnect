import { Controller, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
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

  @Post('capture/:missionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async captureMissionPayment(@Param('missionId') missionId: string) {
    return this.paymentService.captureMissionPayment(missionId);
  }

  @Post('refund/:missionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async refundMissionPayment(
    @Param('missionId') missionId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentService.refundMissionPayment(missionId, body.reason);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: Record<string, unknown>) {
    // In production, verify webhook signature
    return this.paymentService.handleWebhook(body);
  }
}
