import { Module } from '@nestjs/common';
import { ReportsController } from './controllers/reports.controller';
import { CompanyReportsService } from './services/company-reports.service';
import { EmployeeReportsService } from './services/employee-reports.service';
import { DashboardService } from './services/dashboard.service';

@Module({
  controllers: [ReportsController],
  providers: [
    CompanyReportsService,
    EmployeeReportsService,
    DashboardService,
  ],
  exports: [
    CompanyReportsService,
    EmployeeReportsService,
    DashboardService,
  ],
})
export class ReportsModule {}
