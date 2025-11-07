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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  async findAll(@Request() req) {
    return this.missionService.findAll(req.user.userId, req.user.role);
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mission details' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.missionService.findOne(id, req.user.userId);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept mission (artisan)' })
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept/reject negotiation' })
  async acceptNegotiation(
    @Request() req,
    @Param('negotiationId') negotiationId: string,
    @Body() dto: AcceptNegotiationDto,
  ) {
    return this.negotiationService.accept(req.user.userId, negotiationId, dto);
  }
}
