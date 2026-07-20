import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SubcontractorService } from '../services/subcontractor.service';
import {
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  CreateSubcontractorAssignmentDto,
  UpdateAssignmentDto,
  SubcontractorStatus,
} from '../dto/subcontractor.dto';

@Controller('subcontractors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubcontractorController {
  constructor(private readonly subcontractorService: SubcontractorService) {}

  @Post()
  @Roles('ARTISAN')
  async create(@Request() req, @Body() dto: CreateSubcontractorDto) {
    return this.subcontractorService.create(req.user.userId, dto);
  }

  @Get()
  @Roles('ARTISAN')
  async findAll(@Request() req, @Query('status') status?: SubcontractorStatus) {
    return this.subcontractorService.findAll(req.user.userId, status);
  }

  // Cockpit donneur d'ordre (#17) : KPI + stats agrégées par sous-traitant (net à payer, en cours,
  // terminées, fiabilité). Déclaré avant la route :id (littéral, pas de collision avec le regex UUID).
  @Get('overview')
  @Roles('ARTISAN')
  async getOverview(@Request() req) {
    return this.subcontractorService.getOverview(req.user.userId);
  }

  @Get(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
  @Roles('ARTISAN')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.subcontractorService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @Roles('ARTISAN')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSubcontractorDto) {
    return this.subcontractorService.update(id, req.user.userId, dto);
  }

  @Post('accept-invitation/:token')
  async acceptInvitation(@Request() req, @Param('token') token: string) {
    return this.subcontractorService.acceptInvitation(token, req.user.userId);
  }

  @Post(':id/terminate')
  @Roles('ARTISAN')
  async terminate(@Request() req, @Param('id') id: string) {
    return this.subcontractorService.terminate(id, req.user.userId);
  }

  // Assignments

  @Post('assignments')
  @Roles('ARTISAN')
  async createAssignment(@Request() req, @Body() dto: CreateSubcontractorAssignmentDto) {
    return this.subcontractorService.createAssignment(req.user.userId, dto);
  }

  @Get('assignments')
  @Roles('ARTISAN')
  async getAssignments(
    @Request() req,
    @Query('subcontractorId') subcontractorId?: string,
    @Query('missionId') missionId?: string,
  ) {
    return this.subcontractorService.getAssignments(req.user.userId, subcontractorId, missionId);
  }

  @Put('assignments/:id')
  @Roles('ARTISAN')
  async updateAssignment(@Request() req, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.subcontractorService.updateAssignment(id, req.user.userId, dto);
  }

  @Delete('assignments/:id')
  @Roles('ARTISAN')
  async deleteAssignment(@Request() req, @Param('id') id: string) {
    return this.subcontractorService.deleteAssignment(id, req.user.userId);
  }
}
