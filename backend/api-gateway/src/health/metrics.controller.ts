import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number | string;
  labels?: Record<string, string>;
}

@ApiTags('Health')
@Controller('metrics')
export class MetricsController {
  private startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiExcludeEndpoint() // Hide from Swagger - Prometheus scrapes this
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res() res: Response) {
    const metrics = await this.collectMetrics();
    const output = this.formatPrometheusMetrics(metrics);
    res.send(output);
  }

  @Get('json')
  @ApiOperation({ summary: 'Get application metrics in JSON format' })
  @ApiResponse({ status: 200, description: 'Returns application metrics' })
  async getMetricsJson() {
    return this.collectMetrics();
  }

  private async collectMetrics(): Promise<PrometheusMetric[]> {
    const metrics: PrometheusMetric[] = [];
    const memoryUsage = process.memoryUsage();

    // Process metrics
    metrics.push(
      {
        name: 'articonnect_process_uptime_seconds',
        help: 'Process uptime in seconds',
        type: 'gauge',
        value: Math.floor((Date.now() - this.startTime) / 1000),
      },
      {
        name: 'articonnect_process_memory_heap_used_bytes',
        help: 'Process heap memory used',
        type: 'gauge',
        value: memoryUsage.heapUsed,
      },
      {
        name: 'articonnect_process_memory_heap_total_bytes',
        help: 'Process heap memory total',
        type: 'gauge',
        value: memoryUsage.heapTotal,
      },
      {
        name: 'articonnect_process_memory_rss_bytes',
        help: 'Process resident set size',
        type: 'gauge',
        value: memoryUsage.rss,
      },
      {
        name: 'articonnect_process_memory_external_bytes',
        help: 'Process external memory',
        type: 'gauge',
        value: memoryUsage.external,
      },
    );

    // Node.js metrics
    metrics.push(
      {
        name: 'nodejs_version_info',
        help: 'Node.js version info',
        type: 'gauge',
        value: 1,
        labels: { version: process.version },
      },
    );

    // Database metrics
    try {
      const dbHealthy = await this.checkDatabaseHealth();
      metrics.push({
        name: 'articonnect_database_up',
        help: 'Database connection status (1 = up, 0 = down)',
        type: 'gauge',
        value: dbHealthy ? 1 : 0,
      });

      // Count models
      const [
        usersCount,
        missionsCount,
        missionsPending,
        missionsInProgress,
        missionsCompleted,
        missionsAccepted,
        missionsCancelled,
        companiesCount,
        reviewsCount,
        paymentsCount,
        productsCount,
        notificationsCount,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.mission.count(),
        this.prisma.mission.count({ where: { status: 'PENDING' } }),
        this.prisma.mission.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.mission.count({ where: { status: 'COMPLETED' } }),
        this.prisma.mission.count({ where: { status: 'ACCEPTED' } }),
        this.prisma.mission.count({ where: { status: 'CANCELLED' } }),
        this.prisma.company.count(),
        this.prisma.review.count(),
        this.prisma.payment.count(),
        this.prisma.product.count(),
        this.prisma.notification.count(),
      ]);

      metrics.push(
        {
          name: 'articonnect_users_total',
          help: 'Total number of users',
          type: 'gauge',
          value: usersCount,
        },
        {
          name: 'articonnect_missions_total',
          help: 'Total number of missions',
          type: 'gauge',
          value: missionsCount,
        },
        {
          name: 'articonnect_missions_by_status',
          help: 'Number of missions by status',
          type: 'gauge',
          value: missionsPending,
          labels: { status: 'pending' },
        },
        {
          name: 'articonnect_missions_by_status',
          help: 'Number of missions by status',
          type: 'gauge',
          value: missionsInProgress,
          labels: { status: 'in_progress' },
        },
        {
          name: 'articonnect_missions_by_status',
          help: 'Number of missions by status',
          type: 'gauge',
          value: missionsCompleted,
          labels: { status: 'completed' },
        },
        {
          name: 'articonnect_missions_by_status',
          help: 'Number of missions by status',
          type: 'gauge',
          value: missionsAccepted,
          labels: { status: 'accepted' },
        },
        {
          name: 'articonnect_missions_by_status',
          help: 'Number of missions by status',
          type: 'gauge',
          value: missionsCancelled,
          labels: { status: 'cancelled' },
        },
        {
          name: 'articonnect_companies_total',
          help: 'Total number of companies',
          type: 'gauge',
          value: companiesCount,
        },
        {
          name: 'articonnect_reviews_total',
          help: 'Total number of reviews',
          type: 'gauge',
          value: reviewsCount,
        },
        {
          name: 'articonnect_payments_total',
          help: 'Total number of payments',
          type: 'gauge',
          value: paymentsCount,
        },
        {
          name: 'articonnect_products_total',
          help: 'Total number of products',
          type: 'gauge',
          value: productsCount,
        },
        {
          name: 'articonnect_notifications_total',
          help: 'Total number of notifications',
          type: 'gauge',
          value: notificationsCount,
        },
      );
    } catch (error) {
      metrics.push({
        name: 'articonnect_database_up',
        help: 'Database connection status (1 = up, 0 = down)',
        type: 'gauge',
        value: 0,
      });
    }

    // Redis metrics
    try {
      const redisHealthy = await this.checkRedisHealth();
      metrics.push({
        name: 'articonnect_redis_up',
        help: 'Redis connection status (1 = up, 0 = down)',
        type: 'gauge',
        value: redisHealthy ? 1 : 0,
      });
    } catch (error) {
      metrics.push({
        name: 'articonnect_redis_up',
        help: 'Redis connection status (1 = up, 0 = down)',
        type: 'gauge',
        value: 0,
      });
    }

    return metrics;
  }

  private formatPrometheusMetrics(metrics: PrometheusMetric[]): string {
    const lines: string[] = [];
    const processedMetrics = new Set<string>();

    for (const metric of metrics) {
      // Only add HELP and TYPE once per metric name
      if (!processedMetrics.has(metric.name)) {
        lines.push(`# HELP ${metric.name} ${metric.help}`);
        lines.push(`# TYPE ${metric.name} ${metric.type}`);
        processedMetrics.add(metric.name);
      }

      // Format metric with optional labels
      if (metric.labels && Object.keys(metric.labels).length > 0) {
        const labelStr = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        lines.push(`${metric.name}{${labelStr}} ${metric.value}`);
      } else {
        lines.push(`${metric.name} ${metric.value}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redis.set('health:metrics:check', 'ok', 10);
      const result = await this.redis.get('health:metrics:check');
      return result === 'ok';
    } catch {
      return false;
    }
  }
}
