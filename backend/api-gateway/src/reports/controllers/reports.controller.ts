import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompanyReportsService } from '../services/company-reports.service';
import { EmployeeReportsService } from '../services/employee-reports.service';
import { DashboardService } from '../services/dashboard.service';
import {
  ReportsQueryDto,
  RevenueReportQueryDto,
  ProductivityTrendsQueryDto,
  PerformanceOverviewQueryDto,
} from '../dto/reports-query.dto';

@ApiTags('Reports & Analytics')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly companyReportsService: CompanyReportsService,
    private readonly employeeReportsService: EmployeeReportsService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('company/:companyId/dashboard')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get company dashboard with KPIs and metrics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async getCompanyDashboard(@Param('companyId') companyId: string, @Req() req: any) {
    return this.companyReportsService.getCompanyDashboard(companyId, req.user.userId);
  }

  @Get('company/:companyId/kpis')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get company KPIs and real-time metrics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async getCompanyKPIs(@Param('companyId') companyId: string, @Req() req: any) {
    return this.dashboardService.getCompanyKPIs(companyId, req.user.userId);
  }

  @Get('company/:companyId/revenue')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get revenue report with breakdown by period' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'], description: 'Group data by period' })
  async getRevenueReport(
    @Param('companyId') companyId: string,
    @Query() query: RevenueReportQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.companyReportsService.getRevenueReport(companyId, req.user.userId, startDate, endDate, query.groupBy);
  }

  @Get('company/:companyId/employee-performance')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee performance report for the company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getEmployeePerformanceReport(
    @Param('companyId') companyId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.companyReportsService.getEmployeePerformanceReport(companyId, req.user.userId, startDate, endDate);
  }

  @Get('company/:companyId/mission-statistics')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get mission statistics and category breakdown' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getMissionStatistics(
    @Param('companyId') companyId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.companyReportsService.getMissionStatistics(companyId, req.user.userId, startDate, endDate);
  }

  @Get('company/:companyId/financial-summary')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get financial summary with revenue, earnings, and payouts' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getFinancialSummary(
    @Param('companyId') companyId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.companyReportsService.getFinancialSummary(companyId, req.user.userId, startDate, endDate);
  }

  @Get('company/:companyId/performance-overview')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get performance overview chart data for dashboard' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include (default: 30)' })
  async getPerformanceOverview(
    @Param('companyId') companyId: string,
    @Query() query: PerformanceOverviewQueryDto,
    @Req() req: any,
  ) {
    return this.dashboardService.getPerformanceOverview(companyId, req.user.userId, query.days);
  }

  @Get('employee/:employeeId/earnings-history')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee earnings history with breakdown' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getEmployeeEarningsHistory(
    @Param('employeeId') employeeId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.employeeReportsService.getEmployeeEarningsHistory(employeeId, req.user.userId, startDate, endDate);
  }

  @Get('employee/:employeeId/performance')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get detailed employee performance metrics' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getEmployeePerformance(
    @Param('employeeId') employeeId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.employeeReportsService.getEmployeePerformance(employeeId, req.user.userId, startDate, endDate);
  }

  @Get('employee/:employeeId/productivity-trends')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee productivity trends over time' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to analyze (default: 6)' })
  async getEmployeeProductivityTrends(
    @Param('employeeId') employeeId: string,
    @Query() query: ProductivityTrendsQueryDto,
    @Req() req: any,
  ) {
    return this.employeeReportsService.getEmployeeProductivityTrends(employeeId, req.user.userId, query.months);
  }

  @Get('employee/:employeeId/dashboard')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee personal dashboard' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  async getEmployeeDashboard(@Param('employeeId') employeeId: string, @Req() req: any) {
    return this.dashboardService.getEmployeeDashboard(employeeId, req.user.userId);
  }

  @Get('company/:companyId/employee-comparison')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get employee comparison report for performance analysis' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  async getEmployeeComparison(
    @Param('companyId') companyId: string,
    @Query() query: ReportsQueryDto,
    @Req() req: any,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.employeeReportsService.getEmployeeComparison(companyId, req.user.userId, startDate, endDate);
  }
}
