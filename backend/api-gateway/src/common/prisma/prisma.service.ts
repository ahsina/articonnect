import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// Models that support soft delete
const SOFT_DELETE_MODELS = ['User', 'Mission', 'Company', 'Product', 'Review'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    // Soft delete middleware - intercept delete operations
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      // Check if this is a soft delete model
      if (params.model && SOFT_DELETE_MODELS.includes(params.model)) {
        // Certaines opérations (ex: count(), findMany()) sont appelées sans arguments :
        // params.args est alors undefined. On le garantit pour éviter un crash sur args.where.
        if (!params.args) {
          params.args = {};
        }
        // Convert delete to soft delete (update deletedAt)
        if (params.action === 'delete') {
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }

        // Convert deleteMany to soft delete
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (params.args.data !== undefined) {
            params.args.data['deletedAt'] = new Date();
          } else {
            params.args['data'] = { deletedAt: new Date() };
          }
        }

        // Filter out soft-deleted records on find operations
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Change to findFirst to allow filtering
          params.action = 'findFirst';
          // Add deletedAt filter
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }

        if (params.action === 'findMany') {
          // Add deletedAt filter if not explicitly querying deleted records
          if (params.args.where) {
            if (params.args.where.deletedAt === undefined) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args['where'] = { deletedAt: null };
          }
        }

        // Also filter count operations
        if (params.action === 'count') {
          if (params.args.where) {
            if (params.args.where.deletedAt === undefined) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args['where'] = { deletedAt: null };
          }
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Hard delete a record (permanently remove from database)
   * Use with caution - this bypasses soft delete
   */
  async hardDelete<T>(model: string, where: any): Promise<T> {
    return (this as any)[model.toLowerCase()].delete({ where });
  }

  /**
   * Find records including soft-deleted ones
   */
  async findWithDeleted<T>(model: string, args: any): Promise<T[]> {
    return (this as any)[model.toLowerCase()].findMany({
      ...args,
      where: {
        ...args?.where,
        // Explicitly allow deleted records
      },
    });
  }

  /**
   * Restore a soft-deleted record
   */
  async restore<T>(model: string, where: any): Promise<T> {
    return (this as any)[model.toLowerCase()].update({
      where,
      data: { deletedAt: null },
    });
  }
}
