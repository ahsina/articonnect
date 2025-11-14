import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AvailabilityService, TimeSlot, RecurringAvailability } from '../services/availability.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

class SetAvailabilityDto {
  date: string;
  slots: TimeSlot[];
}

class BookSlotDto {
  date: string;
  slotStart: string;
  missionId: string;
}

class SetRecurringDto {
  schedule: RecurringAvailability[];
}

@ApiTags('Availability')
@ApiBearerAuth()
@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('daily')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Set daily availability (Artisan only)' })
  async setDailyAvailability(
    @Request() req,
    @Body() dto: SetAvailabilityDto,
  ) {
    await this.availabilityService.setDailyAvailability(
      req.user.userId,
      dto.date,
      dto.slots,
    );
    return { message: 'Availability set successfully' };
  }

  @Get('daily/:artisanId/:date')
  @ApiOperation({ summary: 'Get daily availability for an artisan' })
  async getDailyAvailability(
    @Param('artisanId') artisanId: string,
    @Param('date') date: string,
  ) {
    const slots = await this.availabilityService.getDailyAvailability(artisanId, date);
    return { artisanId, date, slots };
  }

  @Get('range/:artisanId')
  @ApiOperation({ summary: 'Get availability range for an artisan' })
  async getAvailabilityRange(
    @Param('artisanId') artisanId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const schedules = await this.availabilityService.getAvailabilityRange(
      artisanId,
      startDate,
      endDate,
    );
    return { schedules };
  }

  @Post('book')
  @Roles('CLIENT', 'ADMIN')
  @ApiOperation({ summary: 'Book a time slot' })
  async bookSlot(@Body() dto: BookSlotDto) {
    await this.availabilityService.bookSlot(
      dto.slotStart.split(':')[0], // Extract artisanId from context or dto
      dto.date,
      dto.slotStart,
      dto.missionId,
    );
    return { message: 'Slot booked successfully' };
  }

  @Delete('release/:missionId')
  @Roles('ARTISAN', 'CLIENT', 'ADMIN')
  @ApiOperation({ summary: 'Release a booked slot' })
  async releaseSlot(
    @Request() req,
    @Param('missionId') missionId: string,
  ) {
    await this.availabilityService.releaseSlot(req.user.userId, missionId);
    return { message: 'Slot released successfully' };
  }

  @Post('recurring')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Set recurring weekly availability (Artisan only)' })
  async setRecurringAvailability(
    @Request() req,
    @Body() dto: SetRecurringDto,
  ) {
    await this.availabilityService.setRecurringAvailability(req.user.userId, dto.schedule);
    return { message: 'Recurring availability set successfully' };
  }

  @Get('recurring/:artisanId')
  @ApiOperation({ summary: 'Get recurring weekly availability' })
  async getRecurringAvailability(@Param('artisanId') artisanId: string) {
    const schedule = await this.availabilityService.getRecurringAvailability(artisanId);
    return { artisanId, schedule };
  }

  @Get('check/:artisanId')
  @ApiOperation({ summary: 'Check if artisan is available at specific time' })
  async isAvailableAt(
    @Param('artisanId') artisanId: string,
    @Query('dateTime') dateTime: string,
  ) {
    const available = await this.availabilityService.isAvailableAt(artisanId, dateTime);
    return { artisanId, dateTime, available };
  }

  @Get('next/:artisanId')
  @ApiOperation({ summary: 'Get next available slot for artisan' })
  async getNextAvailableSlot(
    @Param('artisanId') artisanId: string,
    @Query('fromDate') fromDate?: string,
  ) {
    const slot = await this.availabilityService.getNextAvailableSlot(artisanId, fromDate);
    return { artisanId, nextSlot: slot };
  }

  @Put('status')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update general availability status (Artisan only)' })
  async setGeneralAvailability(
    @Request() req,
    @Body('available') available: boolean,
  ) {
    await this.availabilityService.setGeneralAvailability(req.user.userId, available);
    return { message: 'General availability updated' };
  }

  @Delete('clear')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Clear all availability (Artisan only)' })
  async clearAllAvailability(@Request() req) {
    await this.availabilityService.clearAllAvailability(req.user.userId);
    return { message: 'All availability cleared' };
  }
}
