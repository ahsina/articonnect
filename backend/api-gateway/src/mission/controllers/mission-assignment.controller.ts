import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MissionAssignmentService } from '../services/mission-assignment.service';
import {
  AssignMissionToEmployeeDto,
  ReassignMissionDto,
  AssignMissionToCompanyDto,
  BulkAssignMissionsDto,
  MarkMissionCompletedDto,
} from '../dto/mission-assignment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Mission Assignment')
@Controller('missions/assignment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MissionAssignmentController {
  constructor(private readonly assignmentService: MissionAssignmentService) {}

  @Post(':missionId/assign-to-company')
  @Roles('ARTISAN', 'CLIENT')
  @ApiOperation({ summary: 'Assign mission to a company' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission assigned to company successfully' })
  @ApiResponse({ status: 404, description: 'Mission or company not found' })
  @ApiResponse({ status: 400, description: 'Mission already assigned or invalid status' })
  async assignToCompany(
    @Param('missionId') missionId: string,
    @Request() req,
    @Body() assignDto: AssignMissionToCompanyDto,
  ) {
    return this.assignmentService.assignMissionToCompany(missionId, req.user.userId, assignDto);
  }

  @Post(':missionId/assign-to-employee')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Assign mission to an employee' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission assigned to employee successfully' })
  @ApiResponse({ status: 404, description: 'Mission or employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied - requires canAssignMissions' })
  @ApiResponse({ status: 400, description: 'Invalid assignment (employee not active, wrong company, etc.)' })
  async assignToEmployee(
    @Param('missionId') missionId: string,
    @Request() req,
    @Body() assignDto: AssignMissionToEmployeeDto,
  ) {
    return this.assignmentService.assignMissionToEmployee(missionId, req.user.userId, assignDto);
  }

  @Put(':missionId/reassign')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Reassign mission to another employee' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission reassigned successfully' })
  @ApiResponse({ status: 404, description: 'Mission or employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Cannot reassign completed or cancelled mission' })
  async reassignMission(
    @Param('missionId') missionId: string,
    @Request() req,
    @Body() reassignDto: ReassignMissionDto,
  ) {
    return this.assignmentService.reassignMission(missionId, req.user.userId, reassignDto);
  }

  @Post('bulk-assign')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Bulk assign multiple missions to an employee' })
  @ApiResponse({ status: 200, description: 'Missions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Some missions are invalid or already assigned' })
  async bulkAssignMissions(@Request() req, @Body() bulkDto: BulkAssignMissionsDto) {
    return this.assignmentService.bulkAssignMissions(req.user.userId, bulkDto);
  }

  @Delete(':missionId/unassign')
  @Roles('ARTISAN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unassign mission from employee' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Cannot unassign mission in progress' })
  async unassignMission(@Param('missionId') missionId: string, @Request() req) {
    return this.assignmentService.unassignMission(missionId, req.user.userId);
  }

  @Post(':missionId/complete')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Mark mission as completed (by assigned employee)' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission marked as completed' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiResponse({ status: 403, description: 'Not assigned to this mission' })
  @ApiResponse({ status: 400, description: 'Mission must be in progress' })
  async markCompleted(
    @Param('missionId') missionId: string,
    @Request() req,
    @Body() completionDto: MarkMissionCompletedDto,
  ) {
    const employee = await this.assignmentService['prisma'].companyEmployee.findFirst({
      where: {
        userId: req.user.userId,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new Error('Employé actif non trouvé');
    }

    return this.assignmentService.markMissionCompleted(missionId, employee.id, completionDto);
  }

  @Get('employee/:employeeId/assigned')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get all missions assigned to an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'List of assigned missions' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEmployeeAssignedMissions(@Param('employeeId') employeeId: string, @Request() req) {
    return this.assignmentService.getEmployeeAssignedMissions(employeeId, req.user.userId);
  }

  @Get('company/:companyId/unassigned')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get unassigned missions for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of unassigned missions' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getUnassignedMissions(@Param('companyId') companyId: string, @Request() req) {
    return this.assignmentService.getUnassignedCompanyMissions(companyId, req.user.userId);
  }
}
