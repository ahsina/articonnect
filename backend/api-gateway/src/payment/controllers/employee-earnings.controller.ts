import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EmployeeEarningsService } from '../services/employee-earnings.service';
import {
  CreateEmployeeEarningsDto,
  UpdateEarningsStatusDto,
  EmployeeEarningsQueryDto,
  ProcessPayoutDto,
} from '../dto/employee-earnings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Employee Earnings & Payouts')
@Controller('earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeeEarningsController {
  constructor(private readonly earningsService: EmployeeEarningsService) {}

  @Post('create')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Create earnings record from completed mission' })
  @ApiResponse({ status: 201, description: 'Earnings created successfully' })
  @ApiResponse({ status: 404, description: 'Mission or employee not found' })
  @ApiResponse({ status: 400, description: 'Mission not completed or earnings already exist' })
  async createEarnings(@Body() createDto: CreateEmployeeEarningsDto) {
    return this.earningsService.createEarningsFromMission(
      createDto.missionId,
      createDto.employeeId,
      createDto.notes
    );
  }

  @Get()
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee earnings with filters' })
  @ApiResponse({ status: 200, description: 'List of earnings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEarnings(@Query() queryDto: EmployeeEarningsQueryDto, @Request() req) {
    return this.earningsService.getEmployeeEarnings(queryDto, req.user.userId);
  }

  @Get('me')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get earnings of the current artisan (own records)' })
  @ApiResponse({ status: 200, description: 'Current artisan earnings retrieved successfully' })
  async getMyEarnings(@Query() queryDto: EmployeeEarningsQueryDto, @Request() req) {
    return this.earningsService.getMyEarnings(req.user.userId, queryDto);
  }

  @Get(':id')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get earnings details by ID' })
  @ApiParam({ name: 'id', description: 'Earnings ID' })
  @ApiResponse({ status: 200, description: 'Earnings details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Earnings not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEarningsById(@Param('id') id: string, @Request() req) {
    return this.earningsService.getEarningsById(id, req.user.userId);
  }

  @Put(':id/status')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update earnings status (Owner/Manager only)' })
  @ApiParam({ name: 'id', description: 'Earnings ID' })
  @ApiResponse({ status: 200, description: 'Earnings status updated successfully' })
  @ApiResponse({ status: 404, description: 'Earnings not found' })
  @ApiResponse({ status: 403, description: 'Permission denied - requires canViewFinancials' })
  async updateEarningsStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateEarningsStatusDto,
  ) {
    return this.earningsService.updateEarningsStatus(id, req.user.userId, updateDto);
  }

  @Post('company/:companyId/process-payouts')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Process pending payouts for employees (Owner/Manager only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Payouts processing initiated' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Permission denied - requires canViewFinancials' })
  @ApiResponse({ status: 400, description: 'Some earnings are invalid or already processed' })
  async processPayouts(
    @Param('companyId') companyId: string,
    @Request() req,
    @Body() processDto: ProcessPayoutDto,
  ) {
    return this.earningsService.processPendingPayouts(companyId, req.user.userId, processDto);
  }

  @Get('company/:companyId/summary')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get company earnings summary (Owner/Manager only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Earnings summary retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Access denied - requires canViewFinancials' })
  async getCompanySummary(@Param('companyId') companyId: string, @Request() req) {
    return this.earningsService.getCompanyEarningsSummary(companyId, req.user.userId);
  }
}
