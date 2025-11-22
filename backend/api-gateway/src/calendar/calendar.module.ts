import { Module } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { GoogleCalendarService } from './services/google-calendar.service';
import { OutlookCalendarService } from './services/outlook-calendar.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [GoogleCalendarService, OutlookCalendarService],
  exports: [GoogleCalendarService, OutlookCalendarService],
})
export class CalendarModule {}
