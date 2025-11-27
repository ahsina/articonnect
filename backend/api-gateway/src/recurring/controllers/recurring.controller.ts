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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RecurringService } from '../services/recurring.service';
import {
  CreateRecurringServiceDto,
  UpdateRecurringServiceDto,
  RecurringServiceFilterDto,
} from '../dto/recurring.dto';

@Controller('recurring-services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARTISAN')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateRecurringServiceDto) {
    return this.recurringService.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Request() req, @Query() filters: RecurringServiceFilterDto) {
    return this.recurringService.findAll(req.user.id, filters);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.recurringService.getStats(req.user.id);
  }

  @Get('upcoming')
  async getUpcoming(@Request() req, @Query('days') days?: number) {
    return this.recurringService.getUpcoming(req.user.id, days || 7);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.recurringService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringServiceDto,
  ) {
    return this.recurringService.update(id, req.user.id, dto);
  }

  @Post(':id/pause')
  async pause(@Request() req, @Param('id') id: string) {
    return this.recurringService.pause(id, req.user.id);
  }

  @Post(':id/resume')
  async resume(@Request() req, @Param('id') id: string) {
    return this.recurringService.resume(id, req.user.id);
  }

  @Post(':id/cancel')
  async cancel(@Request() req, @Param('id') id: string) {
    return this.recurringService.cancel(id, req.user.id);
  }

  @Post(':id/generate-mission')
  async generateMission(@Request() req, @Param('id') id: string) {
    return this.recurringService.generateMission(id, req.user.id);
  }
}
