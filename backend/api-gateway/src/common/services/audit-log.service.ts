import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogOptions {
  userId?: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(options: AuditLogOptions): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        resource: options.resource,
        details: options.details || {},
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });
  }

  /**
   * Get audit logs with filters (admin only)
   */
  async findAll(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.resource) {
      where.resource = filters.resource;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit log by ID (admin only)
   */
  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  /**
   * Helper method to log user actions
   */
  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    details: any,
    request: { ip: string; headers: { 'user-agent'?: string } },
  ) {
    await this.log({
      userId,
      action,
      resource,
      details,
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers['user-agent'],
    });
  }
}
