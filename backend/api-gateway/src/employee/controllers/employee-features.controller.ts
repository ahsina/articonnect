import { Controller, Post, Get, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ShiftSchedulingService } from '../services/shift-scheduling.service';

@ApiTags('Employee Features (Shifts, Time, Reviews, Skills)')
@Controller('employee-features')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeeFeaturesController {
  constructor(
    private readonly shiftSchedulingService: ShiftSchedulingService,
  ) {}

  @Post('shifts')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Create new shift for employee' })
  async createShift(@Query('companyId') companyId: string, @Body() createDto: any, @Req() req: any) {
    return this.shiftSchedulingService.createShift(companyId, req.user.userId, createDto);
  }

  @Put('shifts/:shiftId')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update shift' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  async updateShift(@Param('shiftId') shiftId: string, @Body() updateDto: any, @Req() req: any) {
    return this.shiftSchedulingService.updateShift(shiftId, req.user.userId, updateDto);
  }

  @Delete('shifts/:shiftId')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Delete shift' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  async deleteShift(@Param('shiftId') shiftId: string, @Req() req: any) {
    return this.shiftSchedulingService.deleteShift(shiftId, req.user.userId);
  }

  @Get('company/:companyId/schedule')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get company schedule for date range' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO 8601)' })
  async getCompanySchedule(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    return this.shiftSchedulingService.getCompanySchedule(
      companyId,
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('employee/:employeeId/schedule')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee schedule for date range' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO 8601)' })
  async getEmployeeSchedule(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    return this.shiftSchedulingService.getEmployeeSchedule(
      employeeId,
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('shifts/bulk')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Bulk schedule shifts for multiple employees' })
  @ApiQuery({ name: 'companyId', description: 'Company ID' })
  async bulkScheduleShifts(@Query('companyId') companyId: string, @Body() bulkDto: any, @Req() req: any) {
    return this.shiftSchedulingService.bulkScheduleShifts(companyId, req.user.userId, bulkDto);
  }

  @Get('company/:companyId/available-employees')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get available employees for a time period' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startTime', description: 'Start time (ISO 8601)' })
  @ApiQuery({ name: 'endTime', description: 'End time (ISO 8601)' })
  async getAvailableEmployees(
    @Param('companyId') companyId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Req() req: any,
  ) {
    return this.shiftSchedulingService.getAvailableEmployees(
      companyId,
      req.user.userId,
      new Date(startTime),
      new Date(endTime),
    );
  }
}
