import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import { CreateWorkingHoursDto, UpdateWorkingHoursDto } from '../dto/working-hours.dto';
import { CreateAvailabilitySlotDto, BookAvailabilitySlotDto, QueryAvailabilityDto } from '../dto/availability-slot.dto';
import { CreateTimeOffDto, ApproveTimeOffDto } from '../dto/time-off.dto';
import { CreateRecurringUnavailabilityDto, UpdateRecurringUnavailabilityDto } from '../dto/recurring-unavailability.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ================================
  // WORKING HOURS
  // ================================

  /**
   * Set or update working hours for a specific day
   * POST /calendar/artisan/:artisanId/working-hours
   */
  @Post('artisan/:artisanId/working-hours')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async setWorkingHours(
    @Param('artisanId') artisanId: string,
    @Body() dto: CreateWorkingHoursDto,
  ) {
    return this.calendarService.setWorkingHours(artisanId, dto);
  }

  /**
   * Get all working hours for an artisan
   * GET /calendar/artisan/:artisanId/working-hours
   */
  @Get('artisan/:artisanId/working-hours')
  async getWorkingHours(@Param('artisanId') artisanId: string) {
    return this.calendarService.getWorkingHours(artisanId);
  }

  /**
   * Update specific working hours
   * PUT /calendar/artisan/:artisanId/working-hours/:id
   */
  @Put('artisan/:artisanId/working-hours/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async updateWorkingHours(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.calendarService.updateWorkingHours(artisanId, id, dto);
  }

  /**
   * Delete working hours
   * DELETE /calendar/artisan/:artisanId/working-hours/:id
   */
  @Delete('artisan/:artisanId/working-hours/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async deleteWorkingHours(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.deleteWorkingHours(artisanId, id);
  }

  // ================================
  // AVAILABILITY SLOTS
  // ================================

  /**
   * Create availability slot
   * POST /calendar/artisan/:artisanId/slots
   */
  @Post('artisan/:artisanId/slots')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async createAvailabilitySlot(
    @Param('artisanId') artisanId: string,
    @Body() dto: CreateAvailabilitySlotDto,
  ) {
    return this.calendarService.createAvailabilitySlot(artisanId, dto);
  }

  /**
   * Get availability slots
   * GET /calendar/slots?startDate=...&endDate=...&artisanId=...
   */
  @Get('slots')
  async getAvailabilitySlots(@Query() query: QueryAvailabilityDto) {
    return this.calendarService.getAvailabilitySlots(query);
  }

  /**
   * Book an availability slot
   * POST /calendar/slots/:id/book
   */
  @Post('slots/:id/book')
  async bookAvailabilitySlot(
    @Param('id') id: string,
    @Body() dto: BookAvailabilitySlotDto,
  ) {
    return this.calendarService.bookAvailabilitySlot(id, dto);
  }

  /**
   * Cancel a booked slot
   * POST /calendar/artisan/:artisanId/slots/:id/cancel
   */
  @Post('artisan/:artisanId/slots/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async cancelAvailabilitySlot(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.cancelAvailabilitySlot(artisanId, id);
  }

  /**
   * Delete availability slot
   * DELETE /calendar/artisan/:artisanId/slots/:id
   */
  @Delete('artisan/:artisanId/slots/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async deleteAvailabilitySlot(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.deleteAvailabilitySlot(artisanId, id);
  }

  // ================================
  // TIME OFF
  // ================================

  /**
   * Request time off
   * POST /calendar/artisan/:artisanId/time-off
   */
  @Post('artisan/:artisanId/time-off')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async requestTimeOff(
    @Param('artisanId') artisanId: string,
    @Body() dto: CreateTimeOffDto,
  ) {
    return this.calendarService.requestTimeOff(artisanId, dto);
  }

  /**
   * Get all time off requests for an artisan
   * GET /calendar/artisan/:artisanId/time-off
   */
  @Get('artisan/:artisanId/time-off')
  async getTimeOffs(@Param('artisanId') artisanId: string) {
    return this.calendarService.getTimeOffs(artisanId);
  }

  /**
   * Approve or reject time off (admin only)
   * PUT /calendar/time-off/:id/approve
   */
  @Put('time-off/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveTimeOff(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ApproveTimeOffDto,
  ) {
    const approvedBy = req.user.userId;
    return this.calendarService.approveTimeOff(id, approvedBy, dto);
  }

  /**
   * Cancel time off request
   * DELETE /calendar/artisan/:artisanId/time-off/:id
   */
  @Delete('artisan/:artisanId/time-off/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async cancelTimeOff(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.cancelTimeOff(artisanId, id);
  }

  // ================================
  // RECURRING UNAVAILABILITY
  // ================================

  /**
   * Create recurring unavailability
   * POST /calendar/artisan/:artisanId/recurring-unavailability
   */
  @Post('artisan/:artisanId/recurring-unavailability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async createRecurringUnavailability(
    @Param('artisanId') artisanId: string,
    @Body() dto: CreateRecurringUnavailabilityDto,
  ) {
    return this.calendarService.createRecurringUnavailability(artisanId, dto);
  }

  /**
   * Get all recurring unavailability for an artisan
   * GET /calendar/artisan/:artisanId/recurring-unavailability
   */
  @Get('artisan/:artisanId/recurring-unavailability')
  async getRecurringUnavailabilities(@Param('artisanId') artisanId: string) {
    return this.calendarService.getRecurringUnavailabilities(artisanId);
  }

  /**
   * Update recurring unavailability
   * PUT /calendar/artisan/:artisanId/recurring-unavailability/:id
   */
  @Put('artisan/:artisanId/recurring-unavailability/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async updateRecurringUnavailability(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringUnavailabilityDto,
  ) {
    return this.calendarService.updateRecurringUnavailability(artisanId, id, dto);
  }

  /**
   * Delete recurring unavailability
   * DELETE /calendar/artisan/:artisanId/recurring-unavailability/:id
   */
  @Delete('artisan/:artisanId/recurring-unavailability/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ARTISAN, UserRole.ADMIN)
  async deleteRecurringUnavailability(
    @Param('artisanId') artisanId: string,
    @Param('id') id: string,
  ) {
    return this.calendarService.deleteRecurringUnavailability(artisanId, id);
  }

  /**
   * Check artisan availability
   * GET /calendar/artisan/:artisanId/available
   */
  @Get('artisan/:artisanId/available')
  async checkAvailability(
    @Param('artisanId') artisanId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const available = await this.calendarService.isArtisanAvailable(
      artisanId,
      new Date(startTime),
      new Date(endTime),
    );
    return { available };
  }
}
