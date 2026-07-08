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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DisputeService } from '../services/dispute.service';
import { DisputeResolutionService } from '../services/dispute-resolution.service';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  ResolveDisputeDto,
  ProposeSettlementDto,
  AcceptSettlementDto,
  EscalateDisputeDto,
  AddEvidenceDto,
} from '../dto/dispute.dto';
import { DisputeStatus } from '@prisma/client';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputeController {
  constructor(
    private readonly disputeService: DisputeService,
    private readonly resolutionService: DisputeResolutionService,
  ) {}

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
    return this.disputeService.findOne(id, req.user.userId, req.user.role);
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

  // ===== Négociation / règlement amiable (auparavant code mort non exposé) =====

  @Post(':id/settlement')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Propose an amicable settlement for a dispute (participant)' })
  @ApiResponse({ status: 201, description: 'Settlement proposed' })
  async proposeSettlement(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ProposeSettlementDto,
  ) {
    // Garantit que l'appelant est bien partie au litige (ou admin) avant d'écrire.
    await this.disputeService.findOne(id, req.user.userId, req.user.role);
    await this.resolutionService.proposeSettlement(id, req.user.userId, {
      refundAmount: dto.refundAmount,
      compensationAmount: dto.compensationAmount,
      description: dto.description,
    });
    return { success: true };
  }

  @Post(':id/settlement/accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a proposed settlement (participant)' })
  @ApiResponse({ status: 201, description: 'Settlement accepted and dispute resolved' })
  async acceptSettlement(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AcceptSettlementDto,
  ) {
    await this.disputeService.findOne(id, req.user.userId, req.user.role);
    await this.resolutionService.acceptSettlement(id, dto.settlementIndex, req.user.userId);
    return { success: true };
  }

  @Post(':id/escalate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Escalate a dispute for priority review (Admin only)' })
  @ApiResponse({ status: 201, description: 'Dispute escalated' })
  async escalate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: EscalateDisputeDto,
  ) {
    await this.resolutionService.escalateDispute(id, req.user.userId, dto.reason);
    return { success: true };
  }

  @Post(':id/evidence')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add evidence to a dispute (participant)' })
  @ApiResponse({ status: 201, description: 'Evidence added' })
  async addEvidence(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
  ) {
    // Anti-XSS stocké : l'URL de preuve doit être une URL http(s) réelle.
    let parsed: URL;
    try {
      parsed = new URL(dto.url);
    } catch {
      throw new BadRequestException('URL de preuve invalide');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('URL de preuve invalide (seuls http/https sont autorisés)');
    }
    await this.disputeService.findOne(id, req.user.userId, req.user.role);
    await this.resolutionService.addEvidence(id, req.user.userId, {
      type: dto.type,
      url: dto.url,
      description: dto.description,
    });
    return { success: true };
  }

  @Get(':id/timeline')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the resolution timeline of a dispute' })
  @ApiResponse({ status: 200, description: 'Dispute timeline' })
  async getTimeline(@Request() req, @Param('id') id: string) {
    await this.disputeService.findOne(id, req.user.userId, req.user.role);
    return this.resolutionService.getDisputeTimeline(id);
  }
}
