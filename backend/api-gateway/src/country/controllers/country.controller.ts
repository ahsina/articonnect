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
import { CountryService } from '../services/country.service';

@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  // ============ PUBLIC COUNTRY CONFIG ENDPOINTS ============

  @Get()
  async getCountryConfigs(@Query('includeInactive') includeInactive?: string) {
    return this.countryService.getCountryConfigs(includeInactive === 'true');
  }

  @Get(':code')
  async getCountryConfig(@Param('code') code: string) {
    return this.countryService.getCountryConfig(code);
  }

  @Get(':code/compliance')
  async getComplianceRequirements(@Param('code') code: string) {
    return this.countryService.getComplianceRequirements(code);
  }

  // ============ ADMIN COUNTRY CONFIG ENDPOINTS ============

  @Put(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateCountryConfig(@Param('code') code: string, @Body() data: any) {
    return this.countryService.updateCountryConfig(code, data);
  }

  // ============ ADMIN COMPLIANCE REQUIREMENT ENDPOINTS ============

  @Post(':code/compliance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createComplianceRequirement(
    @Param('code') code: string,
    @Body() data: any,
  ) {
    return this.countryService.createComplianceRequirement(code, data);
  }

  @Get('compliance/requirements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getComplianceRequirement(@Param('id') id: string) {
    return this.countryService.getComplianceRequirement(id);
  }

  @Put('compliance/requirements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateComplianceRequirement(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.countryService.updateComplianceRequirement(id, data);
  }

  @Delete('compliance/requirements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteComplianceRequirement(@Param('id') id: string) {
    return this.countryService.deleteComplianceRequirement(id);
  }

  // ============ ADMIN COMPLIANCE VERIFICATION ============

  @Get('compliance/expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getExpiringCompliance(@Query('days') days?: string) {
    return this.countryService.getExpiringCompliance(days ? parseInt(days) : 30);
  }

  @Put('compliance/records/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async verifyComplianceRecord(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string },
  ) {
    return this.countryService.verifyComplianceRecord(
      req.user.id,
      id,
      body.status,
      body.rejectionReason,
    );
  }
}

// Separate controller for artisan compliance endpoints
@Controller('artisan/compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARTISAN')
export class ArtisanComplianceController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  async getMyComplianceRecords(
    @Request() req,
    @Query('countryCode') countryCode?: string,
  ) {
    return this.countryService.getArtisanComplianceRecords(req.user.id, countryCode);
  }

  @Get('status/:countryCode')
  async getMyComplianceStatus(
    @Request() req,
    @Param('countryCode') countryCode: string,
  ) {
    return this.countryService.getArtisanComplianceStatus(req.user.id, countryCode);
  }

  @Post()
  async submitComplianceRecord(
    @Request() req,
    @Body() body: { requirementId: string; [key: string]: any },
  ) {
    const { requirementId, ...data } = body;
    return this.countryService.submitComplianceRecord(req.user.id, requirementId, data);
  }

  @Put(':id')
  async updateComplianceRecord(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.countryService.updateComplianceRecord(req.user.id, id, data);
  }
}
