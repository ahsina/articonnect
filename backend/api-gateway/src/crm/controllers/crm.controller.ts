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
import { CrmService } from '../services/crm.service';
import {
  CreateClientRelationshipDto,
  UpdateClientRelationshipDto,
  CreateFollowUpDto,
  UpdateFollowUpDto,
  ClientFilterDto,
} from '../dto/crm.dto';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARTISAN')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ============ CLIENT RELATIONSHIPS ============

  @Post('clients')
  async createRelationship(@Request() req, @Body() dto: CreateClientRelationshipDto) {
    return this.crmService.createRelationship(req.user.id, dto);
  }

  @Get('clients')
  async getClients(@Request() req, @Query() filters: ClientFilterDto) {
    return this.crmService.findAllClients(req.user.id, filters);
  }

  @Get('clients/stats')
  async getStats(@Request() req) {
    return this.crmService.getStats(req.user.id);
  }

  @Get('clients/:id')
  async getRelationship(@Request() req, @Param('id') id: string) {
    return this.crmService.getRelationship(id, req.user.id);
  }

  @Put('clients/:id')
  async updateRelationship(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateClientRelationshipDto,
  ) {
    return this.crmService.updateRelationship(id, req.user.id, dto);
  }

  @Delete('clients/:id')
  async deleteRelationship(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteRelationship(id, req.user.id);
  }

  // ============ FOLLOW-UPS ============

  @Post('follow-ups')
  async createFollowUp(@Request() req, @Body() dto: CreateFollowUpDto) {
    return this.crmService.createFollowUp(req.user.id, dto);
  }

  @Get('follow-ups')
  async getFollowUps(@Request() req, @Query('status') status?: string) {
    return this.crmService.getFollowUps(req.user.id, status);
  }

  @Put('follow-ups/:id')
  async updateFollowUp(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.crmService.updateFollowUp(id, req.user.id, dto);
  }

  @Delete('follow-ups/:id')
  async deleteFollowUp(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteFollowUp(id, req.user.id);
  }
}
