import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubcontractorPortalService } from '../services/subcontractor-portal.service';
// DTO validés (class-validator) du portail : remplacent les anciennes interfaces
// non validées exportées par le service. Le service reste inchangé (ses interfaces
// homonymes sont structurellement compatibles avec ces classes).
import {
  AcceptOfferDto,
  DeclineOfferDto,
  UpdateProgressDto,
  SetAvailabilityDto,
  LeaveRelationshipDto,
} from '../dto/subcontractor-portal.dto';

@ApiTags('Subcontractor Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subcontractor-portal')
export class SubcontractorPortalController {
  constructor(private readonly portalService: SubcontractorPortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get subcontractor dashboard' })
  async getDashboard(@Request() req: any) {
    return this.portalService.getDashboard(req.user.id);
  }

  // ============ OFFERS ============

  @Get('offers')
  @ApiOperation({ summary: 'Get pending job offers' })
  async getPendingOffers(@Request() req: any) {
    return this.portalService.getPendingOffers(req.user.id);
  }

  @Post('offers/:id/accept')
  @ApiOperation({ summary: 'Accept a job offer' })
  async acceptOffer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AcceptOfferDto,
  ) {
    return this.portalService.acceptOffer(req.user.id, id, dto);
  }

  @Post('offers/:id/decline')
  @ApiOperation({ summary: 'Decline a job offer' })
  async declineOffer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DeclineOfferDto,
  ) {
    return this.portalService.declineOffer(req.user.id, id, dto);
  }

  // ============ ASSIGNMENTS ============

  @Get('assignments')
  @ApiOperation({ summary: 'Get my assignments' })
  @ApiQuery({ name: 'status', required: false })
  async getMyAssignments(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.portalService.getMyAssignments(req.user.id, status);
  }

  @Post('assignments/:id/progress')
  @ApiOperation({ summary: 'Update assignment progress' })
  async updateProgress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.portalService.updateProgress(req.user.id, id, dto);
  }

  @Post('assignments/:id/complete')
  @ApiOperation({ summary: 'Mark assignment as complete' })
  async completeWork(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.portalService.completeWork(req.user.id, id, body.notes);
  }

  // ============ DISPONIBILITÉ & RELATIONS (SELF-SERVICE) ============

  @Get('relationships')
  @ApiOperation({ summary: 'List my subcontracting relationships (as subcontractor)' })
  async listRelationships(@Request() req: any) {
    return this.portalService.listRelationships(req.user.id);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Set my availability (pause/resume receiving offers)' })
  async setAvailability(@Request() req: any, @Body() dto: SetAvailabilityDto) {
    return this.portalService.setAvailability(req.user.id, dto);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Leave a subcontracting relationship (definitive)' })
  async leaveRelationship(@Request() req: any, @Body() dto: LeaveRelationshipDto) {
    return this.portalService.leaveRelationship(req.user.id, dto);
  }

  // ============ EARNINGS ============

  @Get('earnings')
  @ApiOperation({ summary: 'Get my earnings' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getEarnings(
    @Request() req: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.portalService.getEarnings(req.user.id, fromDate, toDate);
  }
}
