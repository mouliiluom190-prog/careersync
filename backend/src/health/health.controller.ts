import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let dbStatus = 'disconnected';
    let postgisStatus = 'unavailable';
    let postgisVersion: string | null = null;

    try {
      // Test basic database query
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';

      // Check PostGIS extension version
      const result: any[] = await this.prisma.$queryRaw`
        SELECT PostGIS_Version() as version;
      `;

      if (result && result.length > 0 && result[0].version) {
        postgisStatus = 'available';
        postgisVersion = String(result[0].version);
      }
    } catch {
      // Return safe status without exposing database connection strings or internal credentials
    }

    return {
      status: 'ok',
      service: 'CareerSync API',
      database: {
        status: dbStatus,
        postgis: {
          status: postgisStatus,
          version: postgisVersion,
        },
      },
    };
  }
}
