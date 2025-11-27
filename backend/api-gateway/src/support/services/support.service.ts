import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddTicketMessageDto,
  TicketFilterDto,
  TicketStatus,
  CreateArticleDto,
  UpdateArticleDto,
} from '../dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority || 'MEDIUM',
        missionId: dto.missionId,
        orderId: dto.orderId,
        quoteId: dto.quoteId,
        attachments: dto.attachments || [],
        tags: dto.tags || [],
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
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

  async getTicket(id: string, userId: string) {
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
          where: {
            OR: [
              { isInternal: false },
              { senderId: userId },
            ],
          },
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (ticket.userId !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
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
    }

    if (dto.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
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

  async rateTicket(id: string, userId: string, rating: number) {
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
      data: { satisfactionRating: rating },
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

  // Knowledge Base

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
