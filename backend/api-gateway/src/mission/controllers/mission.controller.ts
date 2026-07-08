import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PhoneVerifiedGuard } from '../../auth/guards/phone-verified.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MissionService } from '../services/mission.service';
import { NegotiationService } from '../services/negotiation.service';
import {
  CreateMissionDto,
  UpdateMissionStatusDto,
} from '../dto/mission.dto';
import {
  CreateNegotiationDto,
  AcceptNegotiationDto,
} from '../dto/negotiation.dto';
import {
  SetupDepositDto,
  DepositSetupResponseDto,
  DepositStatusResponseDto,
  ValidationResponseDto,
  CompletedResponseDto,
} from '../dto/mission-workflow.dto';

@ApiTags('Missions')
@Controller('missions')
export class MissionController {
  constructor(
    private readonly missionService: MissionService,
    private readonly negotiationService: NegotiationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new mission' })
  async create(@Request() req, @Body() createDto: CreateMissionDto) {
    return this.missionService.create(req.user.userId, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all missions for current user' })
  @ApiQuery({ name: 'status', required: false, enum: MissionStatus })
  async findAll(@Request() req, @Query('status') status?: string) {
    // On ne transmet le filtre que si c'est une valeur d'enum valide (évite une injection de where).
    const validStatus =
      status && (Object.values(MissionStatus) as string[]).includes(status) ? status : undefined;
    return this.missionService.findAll(req.user.userId, req.user.role, validStatus);
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get nearby missions for artisan' })
  async getNearby(
    @Request() req,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.missionService.getNearbyMissions(
      req.user.userId,
      Number(lat),
      Number(lng),
      radius ? Number(radius) : 20,
    );
  }

  @Get(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mission details' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.missionService.findOne(id, req.user.userId, req.user.role);
  }

  @Get(':id/tracking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mission tracking history/timeline' })
  async getTracking(@Request() req, @Param('id') id: string) {
    return this.missionService.getMissionTracking(id, req.user.userId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mission status' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateMissionStatusDto,
  ) {
    return this.missionService.updateStatus(id, req.user.userId, updateDto);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, PhoneVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept mission (artisan) - Requires verified phone' })
  @ApiResponse({
    status: 403,
    description: 'Phone verification required (PHONE_REQUIRED or PHONE_NOT_VERIFIED)',
  })
  async acceptMission(@Request() req, @Param('id') id: string) {
    return this.missionService.acceptMission(id, req.user.userId);
  }

  @Post(':id/negotiations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create negotiation offer' })
  async createNegotiation(
    @Request() req,
    @Param('id') missionId: string,
    @Body() createDto: CreateNegotiationDto,
  ) {
    createDto.missionId = missionId;
    return this.negotiationService.create(req.user.userId, createDto);
  }

  @Get(':id/negotiations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get negotiations for mission' })
  async getNegotiations(@Request() req, @Param('id') missionId: string) {
    return this.negotiationService.findByMission(missionId, req.user.userId);
  }

  @Put('negotiations/:negotiationId/accept')
  @UseGuards(JwtAuthGuard, PhoneVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept/reject negotiation - Requires verified phone' })
  @ApiResponse({
    status: 403,
    description: 'Phone verification required (PHONE_REQUIRED or PHONE_NOT_VERIFIED)',
  })
  async acceptNegotiation(
    @Request() req,
    @Param('negotiationId') negotiationId: string,
    @Body() dto: AcceptNegotiationDto,
  ) {
    return this.negotiationService.accept(req.user.userId, negotiationId, dto);
  }

  @Post(':id/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refuser une mission (artisan)' })
  async declineMission(@Request() req, @Param('id') id: string) {
    return this.missionService.declineMission(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler une mission' })
  async cancelMission(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.missionService.cancelMission(id, req.user.userId, body?.reason);
  }

  @Get(':id/cancellation-fees')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estimer les frais d\'annulation' })
  async getCancellationFees(@Request() req, @Param('id') id: string) {
    return this.missionService.getCancellationFees(id, req.user.userId);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter des photos à une mission (URLs)' })
  async addPhotos(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { photos: string[]; type?: 'before' | 'after' | 'general' },
  ) {
    return this.missionService.addPhotos(id, req.user.userId, body.photos || [], body.type);
  }

  // ================================================================
  // HYBRID PAYMENT SYSTEM - MISSION WORKFLOW ENDPOINTS
  // ================================================================

  /**
   * Configurer les exigences d'acompte (après négociation de prix)
   */
  @Post(':id/setup-deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configurer l\'acompte requis',
    description: 'Détermine le modèle de paiement basé sur la réputation du client et configure l\'acompte',
  })
  @ApiResponse({
    status: 200,
    description: 'Acompte configuré avec succès',
    type: DepositSetupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mission introuvable' })
  async setupDepositRequirements(
    @Param('id') missionId: string,
    @Body() dto: SetupDepositDto,
  ): Promise<DepositSetupResponseDto> {
    return this.missionService.setupDepositRequirements(missionId, dto.agreedPrice);
  }

  /**
   * Démarrer le voyage vers le client (artisan)
   */
  @Post(':id/start-travel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Démarrer le voyage',
    description: 'L\'artisan démarre son voyage vers le client (bloqué si acompte non payé)',
  })
  @ApiResponse({
    status: 200,
    description: 'Voyage démarré avec succès',
  })
  @ApiResponse({ status: 400, description: 'Acompte non payé' })
  @ApiResponse({ status: 403, description: 'Réservé aux artisans' })
  async startTravel(@Request() req, @Param('id') missionId: string) {
    return this.missionService.startTravel(missionId, req.user.userId);
  }

  /**
   * Marquer l'arrivée sur place (artisan)
   */
  @Post(':id/arrive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marquer l\'arrivée',
    description: 'L\'artisan marque son arrivée sur le lieu de la mission',
  })
  @ApiResponse({
    status: 200,
    description: 'Arrivée enregistrée avec succès',
  })
  @ApiResponse({ status: 403, description: 'Réservé aux artisans' })
  async markArrival(@Request() req, @Param('id') missionId: string) {
    return this.missionService.markArrival(missionId, req.user.userId);
  }

  /**
   * Marquer la mission comme terminée (artisan)
   */
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marquer terminée',
    description: 'L\'artisan marque la mission comme terminée - Démarre la période de rétractation 48h',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission marquée comme terminée',
    type: CompletedResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Réservé aux artisans' })
  async markCompleted(
    @Request() req,
    @Param('id') missionId: string,
  ): Promise<CompletedResponseDto> {
    return this.missionService.markCompleted(missionId, req.user.userId);
  }

  /**
   * Valider la mission (client)
   */
  @Post(':id/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Valider la mission',
    description: 'Le client valide le travail effectué - Déclenche le paiement à l\'artisan',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission validée avec succès',
    type: ValidationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Mission doit être terminée pour être validée' })
  @ApiResponse({ status: 403, description: 'Réservé aux clients' })
  async validateCompletion(
    @Request() req,
    @Param('id') missionId: string,
  ): Promise<ValidationResponseDto> {
    return this.missionService.validateCompletion(missionId, req.user.userId);
  }

  /**
   * Obtenir le statut de l'acompte
   */
  @Get(':id/deposit-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Statut de l\'acompte',
    description: 'Récupère le statut de l\'acompte pour une mission',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de l\'acompte',
    type: DepositStatusResponseDto,
  })
  async getDepositStatus(
    @Param('id') missionId: string,
  ): Promise<DepositStatusResponseDto> {
    return this.missionService.getDepositStatus(missionId);
  }

  /**
   * Auto-valider les missions bloquées (CRON job - admin)
   */
  @Post('auto-validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Auto-valider missions bloquées',
    description: 'CRON: Auto-valide les missions terminées depuis > 7 jours sans validation',
  })
  @ApiResponse({
    status: 200,
    description: 'Missions auto-validées',
  })
  @ApiResponse({ status: 403, description: 'Réservé aux admins' })
  async autoValidateStuckMissions() {
    return this.missionService.autoValidateStuckMissions();
  }
}
