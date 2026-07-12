import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddTicketMessageDto,
  TicketFilterDto,
  AdminTicketFilterDto,
  TicketStatus,
  CreateArticleDto,
  UpdateArticleDto,
  TicketPriority,
} from '../dto/support.dto';

// SLA configuration by priority (in minutes)
const SLA_CONFIG = {
  URGENT: { firstResponse: 30, resolution: 240 }, // 30 min first response, 4 hours resolution
  HIGH: { firstResponse: 120, resolution: 480 }, // 2 hours first response, 8 hours resolution
  MEDIUM: { firstResponse: 480, resolution: 1440 }, // 8 hours first response, 24 hours resolution
  LOW: { firstResponse: 1440, resolution: 2880 }, // 24 hours first response, 48 hours resolution
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== TICKET MANAGEMENT ====================

  private async generateTicketNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const sequence = await this.prisma.ticketSequence.upsert({
      where: { date: dateStr },
      create: { date: dateStr, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    });

    return `TKT-${dateStr}-${String(sequence.lastSequence).padStart(4, '0')}`;
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();
    const priority = dto.priority || 'MEDIUM';
    const slaConfig = SLA_CONFIG[priority as keyof typeof SLA_CONFIG];

    const now = new Date();
    const firstResponseDue = new Date(now.getTime() + slaConfig.firstResponse * 60000);
    const resolutionDue = new Date(now.getTime() + slaConfig.resolution * 60000);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority,
        missionId: dto.missionId,
        orderId: dto.orderId,
        quoteId: dto.quoteId,
        attachments: dto.attachments || [],
        tags: dto.tags || [],
        firstResponseDue,
        resolutionDue,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Auto-assign based on workload
    await this.autoAssignTicket(ticket.id);

    return ticket;
  }

  async getMyTickets(userId: string, filters: TicketFilterDto) {
    const { status, category, priority, page = 1, limit = 20 } = filters;

    const where: any = { userId };

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Inbox opérateur (ADMIN) : liste GLOBALE de TOUS les tickets, tous utilisateurs confondus.
   * Filtrable par statut/catégorie/priorité, par agent assigné, par demandeur et par recherche
   * texte (n° de ticket ou sujet). Aucune restriction `userId` — réservé aux ADMIN par le contrôleur.
   */
  async getAllTickets(filters: AdminTicketFilterDto) {
    const { status, category, priority, assignedToId, userId, search, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        // Les plus récents d'abord (défaut d'inbox). Le filtrage par statut/priorité permet à
        // l'opérateur de cibler les tickets urgents / en attente de support.
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicket(id: string, userId: string) {
    // On récupère le rôle AVANT de construire le filtre des messages : un opérateur ADMIN doit
    // voir TOUTES les notes (y compris internes) pour traiter le ticket, alors qu'un client ne
    // voit que les messages publics + les siens.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    const messagesWhere = isAdmin
      ? {} // admin : tous les messages, notes internes comprises
      : { OR: [{ isInternal: false }, { senderId: userId }] };

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        messages: {
          where: messagesWhere,
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        mission: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access
    if (ticket.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // Add SLA status
    const slaStatus = this.calculateSLAStatus(ticket);

    return {
      ...ticket,
      slaStatus,
    };
  }

  async updateTicket(id: string, userId: string, dto: UpdateTicketDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update tickets');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = {
      status: dto.status,
      priority: dto.priority,
      assignedToId: dto.assignedToId,
      tags: dto.tags,
      resolution: dto.resolution,
    };

    // Track status changes
    if (dto.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
      const createdAt = new Date(ticket.createdAt);
      updateData.resolutionSLA = Math.floor((Date.now() - createdAt.getTime()) / 60000);
    }

    if (dto.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    // Update SLA due dates if priority changed
    if (dto.priority && dto.priority !== ticket.priority) {
      const slaConfig = SLA_CONFIG[dto.priority as keyof typeof SLA_CONFIG];
      const createdAt = new Date(ticket.createdAt);
      updateData.firstResponseDue = new Date(createdAt.getTime() + slaConfig.firstResponse * 60000);
      updateData.resolutionDue = new Date(createdAt.getTime() + slaConfig.resolution * 60000);
    }

    // Track first response
    if (!ticket.firstResponseAt && dto.assignedToId) {
      updateData.firstResponseAt = new Date();
      const createdAt = new Date(ticket.createdAt);
      updateData.firstResponseSLA = Math.floor((Date.now() - createdAt.getTime()) / 60000);
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
    });
  }

  async addMessage(ticketId: string, userId: string, dto: AddTicketMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Check access
    if (ticket.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    // Only admins can add internal notes
    if (dto.isInternal && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can add internal notes');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        content: dto.content,
        isInternal: dto.isInternal || false,
        attachments: dto.attachments || [],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Update ticket status based on who replied
    const newStatus = user?.role === 'ADMIN'
      ? TicketStatus.WAITING_FOR_CUSTOMER
      : TicketStatus.WAITING_FOR_SUPPORT;

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        ...(user?.role === 'ADMIN' && !ticket.firstResponseAt && {
          firstResponseAt: new Date(),
          firstResponseSLA: Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000),
        }),
      },
    });

    return message;
  }

  async rateTicket(id: string, userId: string, rating: number, feedback?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new ForbiddenException('Can only rate resolved or closed tickets');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        satisfactionRating: rating,
        satisfactionFeedback: feedback,
      },
    });
  }

  async reopenTicket(id: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new ForbiddenException('Can only reopen resolved or closed tickets');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: TicketStatus.OPEN,
        reopenedAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
    });
  }

  // ==================== SLA TRACKING ====================

  private calculateSLAStatus(ticket: any) {
    const now = new Date();
    const priority = ticket.priority as keyof typeof SLA_CONFIG;
    const slaConfig = SLA_CONFIG[priority];

    const firstResponseDue = ticket.firstResponseDue ? new Date(ticket.firstResponseDue) : null;
    const resolutionDue = ticket.resolutionDue ? new Date(ticket.resolutionDue) : null;

    let firstResponseStatus = 'OK';
    let resolutionStatus = 'OK';

    if (firstResponseDue && !ticket.firstResponseAt) {
      if (now > firstResponseDue) {
        firstResponseStatus = 'BREACHED';
      } else if (now > new Date(firstResponseDue.getTime() - 30 * 60000)) {
        firstResponseStatus = 'AT_RISK';
      }
    }

    if (resolutionDue && !ticket.resolvedAt) {
      if (now > resolutionDue) {
        resolutionStatus = 'BREACHED';
      } else if (now > new Date(resolutionDue.getTime() - 60 * 60000)) {
        resolutionStatus = 'AT_RISK';
      }
    }

    return {
      firstResponse: {
        due: firstResponseDue,
        status: firstResponseStatus,
        metAt: ticket.firstResponseAt,
        slaMinutes: slaConfig.firstResponse,
        actualMinutes: ticket.firstResponseSLA,
      },
      resolution: {
        due: resolutionDue,
        status: resolutionStatus,
        metAt: ticket.resolvedAt,
        slaMinutes: slaConfig.resolution,
        actualMinutes: ticket.resolutionSLA,
      },
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSLABreaches() {
    const now = new Date();

    // Find tickets at risk of SLA breach
    const atRiskTickets = await this.prisma.supportTicket.findMany({
      where: {
        status: { in: [TicketStatus.OPEN, TicketStatus.WAITING_FOR_SUPPORT] },
        OR: [
          {
            firstResponseAt: null,
            firstResponseDue: { lte: new Date(now.getTime() + 30 * 60000) },
          },
          {
            resolvedAt: null,
            resolutionDue: { lte: new Date(now.getTime() + 60 * 60000) },
          },
        ],
      },
      include: {
        assignedTo: true,
      },
    });

    for (const ticket of atRiskTickets) {
      const slaStatus = this.calculateSLAStatus(ticket);

      // Escalate if at risk or breached
      if (slaStatus.firstResponse.status !== 'OK' || slaStatus.resolution.status !== 'OK') {
        await this.escalateTicket(ticket.id, 'SLA_AT_RISK', `SLA breach imminent - First Response: ${slaStatus.firstResponse.status}, Resolution: ${slaStatus.resolution.status}`);
      }
    }
  }

  // ==================== ESCALATION ====================

  async escalateTicket(ticketId: string, reason: string, notes?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Increase priority if not already urgent
    let newPriority = ticket.priority;
    if (ticket.priority === 'LOW') newPriority = 'MEDIUM';
    else if (ticket.priority === 'MEDIUM') newPriority = 'HIGH';
    else if (ticket.priority === 'HIGH') newPriority = 'URGENT';

    // Record escalation
    await this.prisma.ticketEscalation.create({
      data: {
        ticketId,
        reason,
        notes,
        fromPriority: ticket.priority,
        toPriority: newPriority,
      },
    });

    // Update ticket
    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: newPriority,
        escalatedAt: new Date(),
        escalationCount: { increment: 1 },
      },
    });

    // Re-calculate SLA due dates
    const slaConfig = SLA_CONFIG[newPriority as keyof typeof SLA_CONFIG];
    const now = new Date();
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        firstResponseDue: ticket.firstResponseAt ? undefined : new Date(now.getTime() + slaConfig.firstResponse * 60000),
        resolutionDue: new Date(now.getTime() + slaConfig.resolution * 60000),
      },
    });

    this.logger.log(`Ticket ${ticket.ticketNumber} escalated: ${reason}`);

    return updatedTicket;
  }

  async getEscalationHistory(ticketId: string) {
    return this.prisma.ticketEscalation.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== AUTO-ASSIGNMENT ====================

  async autoAssignTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.assignedToId) return;

    // Find available agents with least workload
    const agents = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { in: [TicketStatus.OPEN, TicketStatus.WAITING_FOR_SUPPORT, TicketStatus.WAITING_FOR_CUSTOMER] },
              },
            },
          },
        },
      },
    });

    if (agents.length === 0) return;

    // Sort by workload and assign to least busy agent
    const sortedAgents = agents.sort((a, b) =>
      (a._count.assignedTickets || 0) - (b._count.assignedTickets || 0)
    );

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId: sortedAgents[0].id },
    });
  }

  async assignTicket(ticketId: string, agentId: string, assignedBy: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== 'ADMIN') {
      throw new BadRequestException('Invalid agent');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: agentId,
        assignedAt: new Date(),
      },
    });
  }

  async getAgentWorkload() {
    const agents = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            assignedTickets: true,
          },
        },
        assignedTickets: {
          where: {
            status: { in: [TicketStatus.OPEN, TicketStatus.WAITING_FOR_SUPPORT, TicketStatus.WAITING_FOR_CUSTOMER] },
          },
          select: {
            id: true,
            priority: true,
            status: true,
          },
        },
      },
    });

    return agents.map(agent => ({
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      totalTickets: agent._count.assignedTickets,
      openTickets: agent.assignedTickets.length,
      byPriority: {
        urgent: agent.assignedTickets.filter(t => t.priority === 'URGENT').length,
        high: agent.assignedTickets.filter(t => t.priority === 'HIGH').length,
        medium: agent.assignedTickets.filter(t => t.priority === 'MEDIUM').length,
        low: agent.assignedTickets.filter(t => t.priority === 'LOW').length,
      },
    }));
  }

  // ==================== CANNED RESPONSES ====================

  async getCannedResponses(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    });
  }

  async createCannedResponse(userId: string, data: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    shortcut?: string;
  }) {
    return this.prisma.cannedResponse.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        shortcut: data.shortcut,
        createdById: userId,
      },
    });
  }

  async updateCannedResponse(id: string, data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    shortcut?: string;
    isActive?: boolean;
  }) {
    return this.prisma.cannedResponse.update({
      where: { id },
      data,
    });
  }

  async deleteCannedResponse(id: string) {
    return this.prisma.cannedResponse.delete({ where: { id } });
  }

  async useCannedResponse(responseId: string, ticketId: string, userId: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Canned response not found');
    }

    // Increment usage count
    await this.prisma.cannedResponse.update({
      where: { id: responseId },
      data: { usageCount: { increment: 1 } },
    });

    // Add message with canned response
    return this.addMessage(ticketId, userId, {
      content: response.content,
      isInternal: false,
    });
  }

  // ==================== NPS/CSAT COLLECTION ====================

  async submitNPS(userId: string, score: number, feedback?: string, ticketId?: string) {
    return this.prisma.npsResponse.create({
      data: {
        userId,
        score,
        feedback,
        ticketId,
        source: ticketId ? 'TICKET' : 'GENERAL',
      },
    });
  }

  async getNPSAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const responses = await this.prisma.npsResponse.findMany({ where });

    if (responses.length === 0) {
      return {
        npsScore: 0,
        totalResponses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
      };
    }

    const promoters = responses.filter(r => r.score >= 9).length;
    const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter(r => r.score <= 6).length;

    const npsScore = Math.round(((promoters - detractors) / responses.length) * 100);

    return {
      npsScore,
      totalResponses: responses.length,
      promoters,
      passives,
      detractors,
      promoterPercentage: Math.round((promoters / responses.length) * 100),
      passivePercentage: Math.round((passives / responses.length) * 100),
      detractorPercentage: Math.round((detractors / responses.length) * 100),
    };
  }

  // ==================== ANALYTICS ====================

  async getSupportAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalTickets,
      byStatus,
      byPriority,
      byCategory,
      avgFirstResponse,
      avgResolution,
      csatScores,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.supportTicket.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      this.prisma.supportTicket.aggregate({
        where: { ...where, firstResponseSLA: { not: null } },
        _avg: { firstResponseSLA: true },
      }),
      this.prisma.supportTicket.aggregate({
        where: { ...where, resolutionSLA: { not: null } },
        _avg: { resolutionSLA: true },
      }),
      this.prisma.supportTicket.aggregate({
        where: { ...where, satisfactionRating: { not: null } },
        _avg: { satisfactionRating: true },
        _count: { satisfactionRating: true },
      }),
    ]);

    // SLA compliance
    const resolvedTickets = await this.prisma.supportTicket.findMany({
      where: {
        ...where,
        resolvedAt: { not: null },
      },
      select: {
        priority: true,
        firstResponseSLA: true,
        resolutionSLA: true,
        firstResponseDue: true,
        resolutionDue: true,
        firstResponseAt: true,
        resolvedAt: true,
      },
    });

    let slaCompliant = 0;
    for (const ticket of resolvedTickets) {
      const slaConfig = SLA_CONFIG[ticket.priority as keyof typeof SLA_CONFIG];
      if (
        (ticket.firstResponseSLA || 0) <= slaConfig.firstResponse &&
        (ticket.resolutionSLA || 0) <= slaConfig.resolution
      ) {
        slaCompliant++;
      }
    }

    return {
      totalTickets,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
      avgFirstResponseMinutes: Math.round(avgFirstResponse._avg.firstResponseSLA || 0),
      avgResolutionMinutes: Math.round(avgResolution._avg.resolutionSLA || 0),
      avgCSAT: csatScores._avg.satisfactionRating ? Math.round(csatScores._avg.satisfactionRating * 10) / 10 : null,
      csatResponses: csatScores._count.satisfactionRating || 0,
      slaCompliance: resolvedTickets.length > 0
        ? Math.round((slaCompliant / resolvedTickets.length) * 100)
        : 100,
    };
  }

  // ==================== KNOWLEDGE BASE ====================

  async getArticles(category?: string, search?: string, locale: string = 'en') {
    const where: any = {
      status: 'PUBLISHED',
      locale,
    };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    return this.prisma.knowledgeBaseArticle.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        subcategory: true,
        tags: true,
        viewCount: true,
        helpfulCount: true,
      },
      orderBy: [{ viewCount: 'desc' }, { helpfulCount: 'desc' }],
    });
  }

  async getArticle(slug: string) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
    });

    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('Article not found');
    }

    // Increment view count
    await this.prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  async markArticleHelpful(slug: string, helpful: boolean) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: helpful
        ? { helpfulCount: { increment: 1 } }
        : { notHelpfulCount: { increment: 1 } },
    });
  }

  // Admin: Create/Update articles

  async createArticle(userId: string, dto: CreateArticleDto) {
    const slug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return this.prisma.knowledgeBaseArticle.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt,
        category: dto.category,
        subcategory: dto.subcategory,
        tags: dto.tags || [],
        targetAudience: dto.targetAudience || 'ALL',
        locale: dto.locale || 'en',
        authorId: userId,
      },
    });
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        category: dto.category,
        subcategory: dto.subcategory,
        tags: dto.tags,
        targetAudience: dto.targetAudience,
        status: dto.status,
        publishedAt: dto.status === 'PUBLISHED' && article.status !== 'PUBLISHED' ? new Date() : undefined,
      },
    });
  }
}
