import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  async onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`Redis connection retry limit reached (${times}). Operating in degraded fallback mode.`);
            return null; // Stop retrying automatically to avoid blocking
          }
          return Math.min(times * 200, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis client connected successfully (${host}:${port}).`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis error encountered: ${err.message}. Degraded fallback mode active.`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Initial Redis connection failed: ${err.message}. Continuing with degraded in-memory/DB fallback.`);
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      this.isConnected = false;
      this.logger.warn(`Failed to initialize Redis client: ${errorObj.message || 'Unknown error'}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  public isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.client!.get(key);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      this.logger.warn(`Redis GET failed for key '${key}': ${errorObj.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client!.setex(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      this.logger.warn(`Redis SET failed for key '${key}': ${errorObj.message}`);
      return false;
    }
  }

  async del(keys: string | string[]): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const keysArr = Array.isArray(keys) ? keys : [keys];
      if (keysArr.length === 0) return true;
      await this.client!.del(...keysArr);
      return true;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      this.logger.warn(`Redis DEL failed: ${errorObj.message}`);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
      return true;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      this.logger.warn(`Redis invalidatePattern failed for '${pattern}': ${errorObj.message}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const count = await this.client!.exists(key);
      return count > 0;
    } catch (err: unknown) {
      return false;
    }
  }
}
