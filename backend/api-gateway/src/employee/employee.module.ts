import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeFeaturesController } from './controllers/employee-features.controller';
import { ShiftSchedulingService } from './services/shift-scheduling.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmployeeController, EmployeeFeaturesController],
  providers: [EmployeeService, ShiftSchedulingService],
  exports: [EmployeeService, ShiftSchedulingService],
})
export class EmployeeModule {}
