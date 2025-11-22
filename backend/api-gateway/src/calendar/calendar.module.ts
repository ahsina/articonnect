import { Module } from '@nestjs/common';
import { CalendarService } from './services/calendar.service';
import { CalendarController } from './controllers/calendar.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
