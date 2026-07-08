import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TimeTrackingService } from '../services/time-tracking.service';
import { PrismaService } from '../../common/prisma/prisma.service';

class ClockInDto {
  location?: { lat: number; lng: number };
  notes?: string;
  missionId?: string;
}

class ClockOutDto {
  location?: { lat: number; lng: number };
  notes?: string;
}

class BreakNotesDto {
  notes?: string;
}

class CorrectTimeDto {
  newTimestamp: string;
  reason: string;
}

@ApiTags('Time Tracking')
@ApiBearerAuth()
@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Vérifie que l'utilisateur authentifié (dérivé du JWT) est OWNER/MANAGER
   * de l'entreprise ciblée. Empêche l'IDOR / falsification de paie.
   */
  private async assertCompanyManager(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        "Accès refusé : vous devez être propriétaire ou gestionnaire de cette entreprise",
      );
    }
  }

  // ==================== EMPLOYEE SELF-SERVICE ====================

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in (start work)' })
  @ApiBody({ type: ClockInDto, required: false })
  async clockIn(@Request() req, @Body() dto: ClockInDto = {}) {
    // Get employee ID from user's employment
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.clockIn({
      employeeId,
      location: dto.location,
      notes: dto.notes,
      missionId: dto.missionId,
    });
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out (end work)' })
  @ApiBody({ type: ClockOutDto, required: false })
  async clockOut(@Request() req, @Body() dto: ClockOutDto = {}) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.clockOut(employeeId, dto.location, dto.notes);
  }

  @Post('break/start')
  @ApiOperation({ summary: 'Start a break' })
  @ApiBody({ type: BreakNotesDto, required: false })
  async startBreak(@Request() req, @Body() dto: BreakNotesDto = {}) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.startBreak(employeeId, dto.notes);
  }

  @Post('break/end')
  @ApiOperation({ summary: 'End a break' })
  async endBreak(@Request() req) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.endBreak(employeeId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current work status' })
  async getCurrentStatus(@Request() req) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.getCurrentStatus(employeeId);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s summary' })
  async getTodaySummary(@Request() req) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    return this.timeTrackingService.getDailySummary(employeeId, new Date());
  }

  @Get('daily/:date')
  @ApiOperation({ summary: 'Get summary for a specific date' })
  async getDailySummary(@Request() req, @Param('date') dateStr: string) {
    const employeeId = await this.getEmployeeId(req.user.userId);
    const date = new Date(dateStr);
    return this.timeTrackingService.getDailySummary(employeeId, date);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly summary' })
  @ApiQuery({ name: 'weekStart', required: false, description: 'Start of week (YYYY-MM-DD), defaults to current week' })
  async getWeeklySummary(@Request() req, @Query('weekStart') weekStartStr?: string) {
    const employeeId = await this.getEmployeeId(req.user.userId);

    let weekStart: Date;
    if (weekStartStr) {
      weekStart = new Date(weekStartStr);
    } else {
      // Default to Monday of current week
      weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
    }

    return this.timeTrackingService.getWeeklySummary(employeeId, weekStart);
  }

  // ==================== MANAGER/ADMIN ENDPOINTS ====================

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get all time entries for a company (manager/owner only)' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getCompanyTimeEntries(
    @Request() req,
    @Param('companyId') companyId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    await this.assertCompanyManager(req.user.userId, companyId);
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException(
        "Les paramètres 'startDate' et 'endDate' sont requis",
      );
    }
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        "Les paramètres 'startDate' et 'endDate' doivent être des dates valides",
      );
    }
    return this.timeTrackingService.getCompanyTimeEntries(companyId, startDate, endDate);
  }

  @Get('employee/:employeeId/weekly')
  @ApiOperation({ summary: 'Get weekly summary for an employee (manager only)' })
  @ApiQuery({ name: 'weekStart', required: false })
  async getEmployeeWeeklySummary(
    @Request() req,
    @Param('employeeId') employeeId: string,
    @Query('weekStart') weekStartStr?: string,
  ) {
    // L'employeeId est un CompanyEmployee.id : on résout son entreprise puis
    // on autorise soit l'employé lui-même, soit un OWNER/MANAGER de la même entreprise.
    const target = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, userId: true },
    });
    if (!target) {
      throw new NotFoundException('Employé non trouvé');
    }
    if (target.userId !== req.user.userId) {
      await this.assertCompanyManager(req.user.userId, target.companyId);
    }

    let weekStart: Date;
    if (weekStartStr) {
      weekStart = new Date(weekStartStr);
    } else {
      weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
    }

    return this.timeTrackingService.getWeeklySummary(employeeId, weekStart);
  }

  @Post('entry/:entryId/correct')
  @ApiOperation({ summary: 'Correct a time entry (manager only)' })
  @ApiBody({ type: CorrectTimeDto })
  async correctTimeEntry(
    @Request() req,
    @Param('entryId') entryId: string,
    @Body() dto: CorrectTimeDto,
  ) {
    // Corriger une entrée de paie est réservé à un OWNER/MANAGER de l'entreprise
    // à laquelle appartient l'entrée. On dérive l'entreprise de l'entrée elle-même.
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: entryId },
      select: { companyId: true },
    });
    if (!entry) {
      throw new NotFoundException('Entrée de temps non trouvée');
    }
    await this.assertCompanyManager(req.user.userId, entry.companyId);

    return this.timeTrackingService.correctTimeEntry(
      entryId,
      req.user.userId,
      new Date(dto.newTimestamp),
      dto.reason,
    );
  }

  // Helper to get employee ID from user
  private async getEmployeeId(userId: string): Promise<string> {
    // Résout le vrai CompanyEmployee.id depuis l'utilisateur (plus de proxy userId).
    return this.timeTrackingService.getEmployeeIdByUser(userId);
  }
}
