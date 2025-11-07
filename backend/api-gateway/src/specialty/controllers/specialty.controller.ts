import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpecialtyService } from '../services/specialty.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '../dto/specialty.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all specialties' })
  @ApiResponse({ status: 200, description: 'List of specialties' })
  async findAll(@Query('category') category?: string) {
    return this.specialtyService.findAll(category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of unique categories' })
  async getCategories() {
    return this.specialtyService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specialty by ID' })
  @ApiResponse({ status: 200, description: 'Specialty details' })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async findOne(@Param('id') id: string) {
    return this.specialtyService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new specialty (Admin only)' })
  @ApiResponse({ status: 201, description: 'Specialty created' })
  @ApiResponse({ status: 409, description: 'Specialty already exists' })
  async create(@Body() createDto: CreateSpecialtyDto) {
    return this.specialtyService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a specialty (Admin only)' })
  @ApiResponse({ status: 200, description: 'Specialty updated' })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSpecialtyDto) {
    return this.specialtyService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a specialty (Admin only)' })
  @ApiResponse({ status: 200, description: 'Specialty deleted' })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async delete(@Param('id') id: string) {
    return this.specialtyService.delete(id);
  }
}
