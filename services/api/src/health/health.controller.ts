import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  private redis: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private getRedis() {
    if (!this.redis) {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 1500,
      });
    }
    return this.redis;
  }

  /** Liveness — process is up (no deep deps). */
  @Get('health')
  live() {
    return {
      status: 'ok',
      service: 'bhairava-api',
      ts: new Date().toISOString(),
    };
  }

  /** Readiness — DB + Redis must respond. */
  @Get('ready')
  async ready() {
    const checks: Record<string, 'up' | 'down'> = { db: 'down', redis: 'down' };

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.db = 'up';
    } catch {
      checks.db = 'down';
    }

    try {
      const r = this.getRedis();
      if (r.status !== 'ready') await r.connect();
      const pong = await r.ping();
      checks.redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }

    const ok = checks.db === 'up' && checks.redis === 'up';
    const body = {
      status: ok ? 'ready' : 'not_ready',
      service: 'bhairava-api',
      checks,
      worker: {
        note: 'Worker health is process-local; see worker logs / BullMQ queue depth',
        queue: 'reservation-expiry',
      },
      ts: new Date().toISOString(),
    };
    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }

  /** Back-compat alias used by docker healthcheck. */
  @Get('health/detailed')
  detailed() {
    return this.ready();
  }
}
