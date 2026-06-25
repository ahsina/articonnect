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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CertificationService } from '../services/certification.service';
import { CreateCertificationDto, UpdateCertificationDto } from '../dto/certification.dto';

@ApiTags('Certifications')
@Controller('certifications')
@UseGuards(JwtAuthGuard)
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create certification (Artisan only)' })
  @ApiResponse({ status: 201, description: 'Certification created' })
  async create(@Request() req, @Body() createDto: CreateCertificationDto) {
    return this.certificationService.create(req.user.userId, createDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certifications (own or all if admin)' })
  @ApiQuery({ name: 'artisanUserId', required: false })
  @ApiResponse({ status: 200, description: 'List of certifications' })
  async findAll(@Request() req, @Query('artisanUserId') artisanUserId?: string) {
    // If user is artisan, return their own certifications
    if (req.user.role === 'ARTISAN' && !artisanUserId) {
      return this.certificationService.findAll(req.user.userId);
    }

    // If artisanUserId provided, return that artisan's certifications
    if (artisanUserId) {
      return this.certificationService.findAll(artisanUserId);
    }

    // Admin can see all
    if (req.user.role === 'ADMIN') {
      return this.certificationService.findAll();
    }

    return this.certificationService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certification by ID' })
  @ApiResponse({ status: 200, description: 'Certification details' })
  async findOne(@Param('id') id: string) {
    return this.certificationService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update certification (Artisan only)' })
  @ApiResponse({ status: 200, description: 'Certification updated' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCertificationDto,
  ) {
    return this.certificationService.update(req.user.userId, id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete certification' })
  @ApiResponse({ status: 200, description: 'Certification deleted' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.certificationService.delete(req.user.userId, id);
  }

  @Post(':id/document')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a document (URL) to a certification' })
  @ApiResponse({ status: 200, description: 'Document attached' })
  async addDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { document: string },
  ) {
    return this.certificationService.update(req.user.userId, id, { document: body.document } as any);
  }

  @Post(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify certification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Certification verified' })
  async verify(@Request() req, @Param('id') id: string) {
    return this.certificationService.verify(req.user.userId, id);
  }

  @Post(':id/unverify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unverify certification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Certification unverified' })
  async unverify(@Request() req, @Param('id') id: string) {
    return this.certificationService.unverify(req.user.userId, id);
  }
}
