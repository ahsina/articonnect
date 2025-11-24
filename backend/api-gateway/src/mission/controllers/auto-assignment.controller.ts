import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AutoAssignmentService } from '../services/auto-assignment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Mission Auto-Assignment')
@Controller('missions/auto-assignment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutoAssignmentController {
  constructor(private readonly autoAssignmentService: AutoAssignmentService) {}

  @Post(':missionId/assign')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Auto-assign mission to best available employee' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission auto-assigned successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 400, description: 'Auto-assignment not enabled or mission already assigned' })
  async autoAssignMission(@Param('missionId') missionId: string) {
    return this.autoAssignmentService.autoAssignMission(missionId);
  }

  @Post('company/:companyId/assign-all')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Auto-assign all unassigned company missions' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Batch auto-assignment completed' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 400, description: 'Auto-assignment not enabled' })
  async autoAssignCompanyMissions(@Param('companyId') companyId: string) {
    return this.autoAssignmentService.autoAssignCompanyMissions(companyId);
  }

  @Get(':missionId/suggestions')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee assignment suggestions for a mission' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Assignment suggestions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getAssignmentSuggestions(@Param('missionId') missionId: string) {
    return this.autoAssignmentService.getAutoAssignmentSuggestions(missionId);
  }
}
