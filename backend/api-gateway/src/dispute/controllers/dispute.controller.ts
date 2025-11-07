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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DisputeService } from '../services/dispute.service';
import { CreateDisputeDto, UpdateDisputeDto, ResolveDisputeDto } from '../dto/dispute.dto';
import { DisputeStatus } from '@prisma/client';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new dispute for a mission' })
  @ApiResponse({ status: 201, description: 'Dispute created successfully' })
  async create(@Request() req, @Body() createDto: CreateDisputeDto) {
    return this.disputeService.create(req.user.userId, createDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all disputes (filtered by user or admin)' })
  @ApiQuery({ name: 'status', enum: DisputeStatus, required: false })
  @ApiQuery({ name: 'priority', required: false })
  async findAll(
    @Request() req,
    @Query('status') status?: DisputeStatus,
    @Query('priority') priority?: string,
  ) {
    // If user is admin, show all disputes, otherwise filter by user
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (priority) {
      filters.priority = priority;
    }

    // For non-admin users, filter by userId
    if (req.user.role !== 'ADMIN') {
      filters.userId = req.user.userId;
    }

    return this.disputeService.findAll(filters);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.disputeService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update dispute (only by creator)' })
  @ApiResponse({ status: 200, description: 'Dispute updated' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateDisputeDto,
  ) {
    return this.disputeService.update(id, req.user.userId, updateDto);
  }

  @Post(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve dispute (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolve(
    @Request() req,
    @Param('id') id: string,
    @Body() resolveDto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolve(id, req.user.userId, resolveDto);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel dispute (only by creator)' })
  @ApiResponse({ status: 200, description: 'Dispute cancelled' })
  async cancel(@Request() req, @Param('id') id: string) {
    return this.disputeService.cancel(id, req.user.userId);
  }
}
