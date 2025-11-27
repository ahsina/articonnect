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
import {
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CreateComplianceRequirementDto,
  UpdateComplianceRequirementDto,
  SubmitComplianceRecordDto,
  UpdateComplianceRecordDto,
  VerifyComplianceRecordDto,
} from '../dto/country.dto';

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
  async getComplianceRequirements(
    @Param('code') code: string,
    @Query('trade') trade?: string,
  ) {
    return this.countryService.getComplianceRequirements(code, trade);
  }

  // ============ ADMIN COUNTRY CONFIG ENDPOINTS ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createCountryConfig(@Body() dto: CreateCountryConfigDto) {
    return this.countryService.createCountryConfig(dto);
  }

  @Put(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateCountryConfig(
    @Param('code') code: string,
    @Body() dto: UpdateCountryConfigDto,
  ) {
    return this.countryService.updateCountryConfig(code, dto);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteCountryConfig(@Param('code') code: string) {
    return this.countryService.deleteCountryConfig(code);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async seedDefaults() {
    return this.countryService.seedDefaultCountries();
  }

  // ============ ADMIN COMPLIANCE REQUIREMENT ENDPOINTS ============

  @Post('compliance/requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createComplianceRequirement(@Body() dto: CreateComplianceRequirementDto) {
    return this.countryService.createComplianceRequirement(dto);
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
    @Body() dto: UpdateComplianceRequirementDto,
  ) {
    return this.countryService.updateComplianceRequirement(id, dto);
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
    @Body() dto: VerifyComplianceRecordDto,
  ) {
    return this.countryService.verifyComplianceRecord(req.user.id, id, dto);
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
    @Body() dto: SubmitComplianceRecordDto,
  ) {
    return this.countryService.submitComplianceRecord(req.user.id, dto);
  }

  @Put(':id')
  async updateComplianceRecord(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateComplianceRecordDto,
  ) {
    return this.countryService.updateComplianceRecord(req.user.id, id, dto);
  }
}
