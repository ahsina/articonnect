import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeFeaturesController } from './controllers/employee-features.controller';
import { PerformanceReviewController } from './controllers/performance-review.controller';
import { TimeTrackingController } from './controllers/time-tracking.controller';
import { ShiftSchedulingService } from './services/shift-scheduling.service';
import { PerformanceReviewService } from './services/performance-review.service';
import { TimeTrackingService } from './services/time-tracking.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    EmployeeController,
    EmployeeFeaturesController,
    PerformanceReviewController,
    TimeTrackingController,
  ],
  providers: [
    EmployeeService,
    ShiftSchedulingService,
    PerformanceReviewService,
    TimeTrackingService,
  ],
  exports: [
    EmployeeService,
    ShiftSchedulingService,
    PerformanceReviewService,
    TimeTrackingService,
  ],
})
export class EmployeeModule {}
