import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RequestService,
  CreateRequestDto,
  UpdateRequestDto,
} from '../services/request.service';

/**
 * Controller pour la gestion des demandes de devis/mission
 */
@ApiTags('Marketplace - Requests')
@Controller('marketplace/requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  /**
   * POST /marketplace/requests
   * Créer une nouvelle demande
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new request',
    description: 'Create a new quote/mission request (CLIENT only)',
  })
  @ApiBody({
    schema: {
      example: {
        artisanId: 'optional-artisan-id',
        title: 'Rénovation salle de bain',
        description: 'Remplacement baignoire par douche italienne, carrelage...',
        category: 'Plomberie',
        address: '15 Rue de la Gare',
        city: 'Luxembourg',
        postalCode: '1234',
        latitude: 49.6116,
        longitude: 6.1319,
        estimatedBudget: 5000,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 404, description: 'Artisan not found (if artisanId provided)' })
  async createRequest(@Request() req, @Body() data: CreateRequestDto) {
    return this.requestService.create(req.user.userId, data);
  }

  /**
   * GET /marketplace/requests
   * Récupérer toutes les demandes (avec filtres)
   */
  @Get()
  @ApiOperation({
    summary: 'Get all requests',
    description: 'Get all requests with optional filters',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client (ADMIN only)' })
  @ApiQuery({ name: 'artisanId', required: false, description: 'Filter by artisan' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getRequests(
    @Request() req,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('clientId') clientId?: string,
    @Query('artisanId') artisanId?: string,
  ) {
    // Filtrer automatiquement par utilisateur selon le rôle
    const filters: any = { status, category };

    if (req.user.role === 'CLIENT') {
      filters.clientId = req.user.userId; // Clients voient uniquement leurs demandes
    } else if (req.user.role === 'ARTISAN') {
      filters.artisanId = artisanId || req.user.userId; // Artisans voient leurs demandes assignées
    } else if (req.user.role === 'ADMIN') {
      // Admin peut voir toutes les demandes avec filtres optionnels
      if (clientId) filters.clientId = clientId;
      if (artisanId) filters.artisanId = artisanId;
    }

    return this.requestService.findAll(filters);
  }

  /**
   * GET /marketplace/requests/my
   * Récupérer mes demandes
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get my requests',
    description: 'Get all requests created by or assigned to the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'My requests' })
  async getMyRequests(@Request() req) {
    const filters: any = {};

    if (req.user.role === 'CLIENT') {
      filters.clientId = req.user.userId;
    } else if (req.user.role === 'ARTISAN') {
      filters.artisanId = req.user.userId;
    }

    return this.requestService.findAll(filters);
  }

  /**
   * GET /marketplace/requests/stats
   * Statistiques des demandes
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get requests statistics',
    description: 'Get count of requests by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Requests statistics',
    schema: {
      example: {
        total: 25,
        pending: 10,
        quoted: 8,
        accepted: 5,
        declined: 1,
        expired: 1,
      },
    },
  })
  async getRequestStats(@Request() req) {
    return this.requestService.getRequestStats(req.user.userId, req.user.role);
  }

  /**
   * GET /marketplace/requests/:id
   * Récupérer une demande par ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get request by ID',
    description: 'Get detailed information about a specific request',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequest(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  /**
   * PATCH /marketplace/requests/:id
   * Mettre à jour une demande
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a request',
    description: 'Update request details. Permissions vary by role.',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiBody({
    schema: {
      example: {
        status: 'QUOTED',
        estimatedBudget: 4500,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateRequest(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateRequestDto,
  ) {
    return this.requestService.update(id, req.user.userId, req.user.role, data);
  }

  /**
   * DELETE /marketplace/requests/:id
   * Supprimer une demande
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a request',
    description: 'Delete a request (CLIENT and ADMIN only)',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Artisans cannot delete requests' })
  async deleteRequest(@Request() req, @Param('id') id: string) {
    return this.requestService.remove(id, req.user.userId, req.user.role);
  }

  /**
   * POST /marketplace/requests/:id/assign/:artisanId
   * Assigner un artisan à une demande
   */
  @Post(':id/assign/:artisanId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign artisan to request',
    description: 'Assign an artisan to a request (CLIENT only)',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiParam({ name: 'artisanId', description: 'Artisan ID to assign' })
  @ApiResponse({ status: 200, description: 'Artisan assigned successfully' })
  @ApiResponse({ status: 404, description: 'Request or artisan not found' })
  @ApiResponse({ status: 400, description: 'Artisan already assigned' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign to your own requests' })
  async assignArtisan(
    @Request() req,
    @Param('id') requestId: string,
    @Param('artisanId') artisanId: string,
  ) {
    return this.requestService.assignArtisan(requestId, artisanId, req.user.userId);
  }
}
