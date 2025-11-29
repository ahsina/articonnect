import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReturnService } from '../services/return.service';
import {
  CreateReturnRequestDto,
  ApproveReturnDto,
  RejectReturnDto,
  ProcessRefundDto,
  ReceiveReturnDto,
  ReturnFilterDto,
} from '../dto/return.dto';

@Controller('marketplace/returns')
@UseGuards(JwtAuthGuard)
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  async createReturnRequest(@Request() req, @Body() dto: CreateReturnRequestDto) {
    return this.returnService.createReturnRequest(req.user.id, dto);
  }

  @Get()
  async findAllReturns(@Request() req, @Query() filters: ReturnFilterDto) {
    return this.returnService.findAllReturns(req.user.id, filters);
  }

  @Get('analytics')
  async getReturnAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.returnService.getReturnAnalytics(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async findReturnById(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.returnService.findReturnById(id, req.user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveReturn(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnService.approveReturn(id, req.user.id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectReturn(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReturnDto,
  ) {
    return this.returnService.rejectReturn(id, req.user.id, dto);
  }

  @Put(':id/tracking')
  async updateTrackingNumber(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    return this.returnService.updateTrackingNumber(id, req.user.id, trackingNumber);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  async receiveReturn(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveReturnDto,
  ) {
    return this.returnService.receiveReturn(id, req.user.id, dto);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.returnService.processRefund(id, req.user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeReturn(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.returnService.completeReturn(id, req.user.id);
  }
}
