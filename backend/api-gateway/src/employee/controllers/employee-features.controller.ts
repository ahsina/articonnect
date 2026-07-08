import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ShiftSchedulingService } from '../services/shift-scheduling.service';
import { CreateShiftDto, BulkScheduleDto } from '../dto/shift.dto';

/**
 * Parse un paramètre de date requis. Renvoie une BadRequestException (400)
 * plutôt que de laisser un `Invalid Date` atteindre Prisma (500).
 */
function parseRequiredDate(value: string, field: string): Date {
  if (!value) {
    throw new BadRequestException(`Le paramètre '${field}' est requis`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestException(`Le paramètre '${field}' est une date invalide`);
  }
  return date;
}

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
  async createShift(
    @Query('companyId') companyId: string,
    @Body() createDto: CreateShiftDto,
    @Req() req: any,
  ) {
    return this.shiftSchedulingService.createShift(companyId, req.user.userId, {
      employeeId: createDto.employeeId,
      startTime: new Date(createDto.startTime),
      endTime: new Date(createDto.endTime),
      shiftType: createDto.shiftType,
      notes: createDto.notes,
    });
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
      parseRequiredDate(startDate, 'startDate'),
      parseRequiredDate(endDate, 'endDate'),
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
      parseRequiredDate(startDate, 'startDate'),
      parseRequiredDate(endDate, 'endDate'),
    );
  }

  @Post('shifts/bulk')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Bulk schedule shifts for multiple employees' })
  @ApiQuery({ name: 'companyId', description: 'Company ID' })
  async bulkScheduleShifts(
    @Query('companyId') companyId: string,
    @Body() bulkDto: BulkScheduleDto,
    @Req() req: any,
  ) {
    return this.shiftSchedulingService.bulkScheduleShifts(companyId, req.user.userId, {
      employeeIds: bulkDto.employeeIds,
      startTime: new Date(bulkDto.startTime),
      endTime: new Date(bulkDto.endTime),
      shiftType: bulkDto.shiftType,
      repeatPattern: bulkDto.repeatPattern,
      repeatCount: bulkDto.repeatCount,
    });
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
      parseRequiredDate(startTime, 'startTime'),
      parseRequiredDate(endTime, 'endTime'),
    );
  }
}
