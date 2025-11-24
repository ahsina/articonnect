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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Employee Management')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post(':companyId/invite')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Invite an employee to join the company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Employee invited successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Company or user not found' })
  @ApiResponse({ status: 409, description: 'Employee already exists or invitation pending' })
  async inviteEmployee(
    @Param('companyId') companyId: string,
    @Request() req,
    @Body() inviteDto: InviteEmployeeDto,
  ) {
    return this.employeeService.inviteEmployee(companyId, req.user.userId, inviteDto);
  }

  @Post('accept-invitation')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Accept an employment invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Invitation already accepted or expired' })
  async acceptInvitation(@Request() req, @Body() acceptDto: AcceptInvitationDto) {
    return this.employeeService.acceptInvitation(req.user.userId, acceptDto.invitationToken);
  }

  @Get('company/:companyId')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get all employees for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of employees retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyEmployees(
    @Param('companyId') companyId: string,
    @Request() req,
    @Query() queryDto: EmployeeQueryDto,
  ) {
    return this.employeeService.getCompanyEmployees(companyId, req.user.userId, queryDto);
  }

  @Get(':id')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEmployeeById(@Param('id') id: string, @Request() req) {
    return this.employeeService.getEmployeeById(id, req.user.userId);
  }

  @Put(':id')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update employee information' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async updateEmployee(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(id, req.user.userId, updateDto);
  }

  @Delete(':id')
  @Roles('ARTISAN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove/terminate an employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee terminated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Cannot remove employee with active missions or owner' })
  async removeEmployee(@Param('id') id: string, @Request() req) {
    return this.employeeService.removeEmployee(id, req.user.userId);
  }

  @Post(':id/resend-invitation')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Resend invitation to pending employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Employee already accepted invitation' })
  async resendInvitation(@Param('id') id: string, @Request() req) {
    return this.employeeService.resendInvitation(id, req.user.userId);
  }

  @Get(':id/stats')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee statistics' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEmployeeStats(@Param('id') id: string, @Request() req) {
    return this.employeeService.getEmployeeStats(id, req.user.userId);
  }
}
