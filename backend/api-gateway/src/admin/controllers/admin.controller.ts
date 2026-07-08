import { Controller, Get, Put, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminService } from '../services/admin.service';
import { AuditLogService } from '../../common/services/audit-log.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('stats/revenue')
  async getRevenueStats(@Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    return this.adminService.getRevenueStats(period);
  }

  @Get('stats/growth')
  async getUserGrowth() {
    return this.adminService.getUserGrowthStats();
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Put('users/:id/suspend')
  async suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Put('users/:id/activate')
  async activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Post('users/:id/unblock-security')
  @ApiOperation({
    summary:
      'Débloque un compte (multi-comptes / bot / remboursements) après revue (Admin only)',
  })
  async unblockSecurity(@Param('id') id: string) {
    return this.adminService.unblockSecurity(id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogService.findAll({
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('audit-logs/:id')
  @ApiOperation({ summary: 'Get audit log by ID (Admin only)' })
  async getAuditLog(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
