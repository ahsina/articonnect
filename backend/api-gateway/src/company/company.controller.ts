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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Company Management')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Create a new company (Artisan only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Company already exists or SIRET already registered' })
  async createCompany(@Request() req, @Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createCompany(req.user.userId, createCompanyDto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all companies (ADMIN — listing global avec PII owner)' })
  @ApiResponse({ status: 200, description: 'List of companies retrieved successfully' })
  async getAllCompanies(@Query() queryDto: CompanyQueryDto) {
    return this.companyService.getAllCompanies(queryDto);
  }

  @Get('my-company')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get my company (as owner or employee)' })
  @ApiResponse({ status: 200, description: 'Company details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getMyCompany(@Request() req) {
    return this.companyService.getMyCompany(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getCompanyById(@Param('id') id: string, @Request() req) {
    return this.companyService.getCompanyById(id, req.user.userId);
  }

  @Put(':id')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update company information' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async updateCompany(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(id, req.user.userId, updateCompanyDto);
  }

  @Put(':id/settings')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update company settings' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async updateCompanySettings(
    @Param('id') id: string,
    @Request() req,
    @Body() updateSettingsDto: UpdateCompanySettingsDto,
  ) {
    return this.companyService.updateCompanySettings(id, req.user.userId, updateSettingsDto);
  }

  @Post(':id/logo')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Update company logo (URL)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async updateLogo(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { logo: string },
  ) {
    return this.companyService.updateLogo(id, req.user.userId, body.logo);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getCompanyStats(@Param('id') id: string, @Request() req) {
    return this.companyService.getCompanyStats(id, req.user.userId);
  }

  @Delete(':id')
  @Roles('ARTISAN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete company (owner only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 403, description: 'Only owner can delete company' })
  @ApiResponse({ status: 400, description: 'Cannot delete company with active missions' })
  async deleteCompany(@Param('id') id: string, @Request() req) {
    return this.companyService.deleteCompany(id, req.user.userId);
  }
}
