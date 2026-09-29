import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Unknown error';
      console.warn(`Prisma initial connection skipped or failed: ${msg}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
