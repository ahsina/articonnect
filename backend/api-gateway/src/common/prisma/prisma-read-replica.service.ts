import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * PrismaReadReplicaService provides read/write splitting for database operations.
 *
 * This service manages two database connections:
 * - Primary (write): For all write operations (INSERT, UPDATE, DELETE)
 * - Replica (read): For read operations (SELECT)
 *
 * Usage:
 * - Use `readReplica` for read-only queries
 * - Use `primary` or direct methods for write operations
 * - The service automatically falls back to primary if replica is unavailable
 *
 * Environment Variables:
 * - DATABASE_URL: Primary database URL (required)
 * - DATABASE_REPLICA_URL: Read replica URL (optional)
 */
@Injectable()
export class PrismaReadReplicaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaReadReplicaService.name);

  private _primary: PrismaClient;
  private _replica: PrismaClient | null = null;
  private replicaHealthy = true;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    // Initialize primary connection
    const primaryUrl = this.configService.get<string>('DATABASE_URL');
    if (!primaryUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this._primary = new PrismaClient({
      datasources: {
        db: { url: primaryUrl },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // Initialize replica connection if configured
    const replicaUrl = this.configService.get<string>('DATABASE_REPLICA_URL');
    if (replicaUrl) {
      this._replica = new PrismaClient({
        datasources: {
          db: { url: replicaUrl },
        },
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ],
      });
      this.logger.log('Read replica connection configured');
    } else {
      this.logger.warn('No read replica configured, all queries will use primary');
    }
  }

  async onModuleInit() {
    // Connect primary
    await this._primary.$connect();
    this.logger.log('Primary database connected');

    // Connect replica if available
    if (this._replica) {
      try {
        await this._replica.$connect();
        this.logger.log('Read replica connected');
        this.replicaHealthy = true;
        this.startHealthCheck();
      } catch (error) {
        this.logger.error('Failed to connect to read replica:', error);
        this.replicaHealthy = false;
      }
    }
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this._primary.$disconnect();
    this.logger.log('Primary database disconnected');

    if (this._replica) {
      await this._replica.$disconnect();
      this.logger.log('Read replica disconnected');
    }
  }

  /**
   * Get the primary database client (for writes)
   */
  get primary(): PrismaClient {
    return this._primary;
  }

  /**
   * Get the read replica client (for reads)
   * Falls back to primary if replica is unavailable
   */
  get readReplica(): PrismaClient {
    if (this._replica && this.replicaHealthy) {
      return this._replica;
    }
    return this._primary;
  }

  /**
   * Execute a read query on the replica
   * Automatically falls back to primary if replica is unavailable
   */
  async executeRead<T>(
    query: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await query(this.readReplica);
    } catch (error) {
      if (this._replica && this.replicaHealthy) {
        this.logger.warn('Read query failed on replica, falling back to primary');
        this.replicaHealthy = false;
        return await query(this._primary);
      }
      throw error;
    }
  }

  /**
   * Execute a write query on the primary
   */
  async executeWrite<T>(
    query: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return query(this._primary);
  }

  /**
   * Execute a transaction on the primary
   * Transactions should always run on primary to ensure consistency
   */
  async $transaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return this._primary.$transaction(fn, options);
  }

  /**
   * Execute raw read query on replica
   */
  async $queryRawRead<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Promise<T> {
    return this.readReplica.$queryRaw(query, ...values);
  }

  /**
   * Execute raw write query on primary
   */
  async $queryRawWrite<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Promise<T> {
    return this._primary.$queryRaw(query, ...values);
  }

  /**
   * Check if read replica is available and healthy
   */
  get isReplicaHealthy(): boolean {
    return this._replica !== null && this.replicaHealthy;
  }

  /**
   * Get replication lag in seconds (if available)
   */
  async getReplicationLag(): Promise<number | null> {
    if (!this._replica) return null;

    try {
      const result = await this._replica.$queryRaw<[{ lag_seconds: number }]>`
        SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
      `;
      return result[0]?.lag_seconds ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Health check for the replica connection
   */
  private startHealthCheck() {
    const checkInterval = this.configService.get<number>('DATABASE_REPLICA_HEALTH_CHECK_INTERVAL', 30000);

    this.healthCheckInterval = setInterval(async () => {
      if (!this._replica) return;

      try {
        await this._replica.$queryRaw`SELECT 1`;

        if (!this.replicaHealthy) {
          this.logger.log('Read replica recovered');
          this.replicaHealthy = true;
        }
      } catch (error) {
        if (this.replicaHealthy) {
          this.logger.error('Read replica health check failed:', error);
          this.replicaHealthy = false;
        }
      }
    }, checkInterval);
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<{
    primary: { connected: boolean };
    replica: { connected: boolean; healthy: boolean; lag: number | null } | null;
  }> {
    let primaryConnected = false;
    try {
      await this._primary.$queryRaw`SELECT 1`;
      primaryConnected = true;
    } catch {
      // Primary not connected
    }

    if (!this._replica) {
      return {
        primary: { connected: primaryConnected },
        replica: null,
      };
    }

    const lag = await this.getReplicationLag();

    return {
      primary: { connected: primaryConnected },
      replica: {
        connected: this._replica !== null,
        healthy: this.replicaHealthy,
        lag,
      },
    };
  }
}
