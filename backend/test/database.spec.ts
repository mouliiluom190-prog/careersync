import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../src/database/database.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { HealthController } from '../src/health/health.controller.js';

describe('Database Integration & PostGIS Verification (Phase 2)', () => {
  let prismaService: PrismaService;
  let healthController: HealthController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      controllers: [HealthController],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    healthController = module.get<HealthController>(HealthController);
  });

  it('should instantiate PrismaService injectable', () => {
    expect(prismaService).toBeDefined();
    expect(healthController).toBeDefined();
  });

  it('should perform health check without errors', async () => {
    const response = await healthController.getHealth();
    expect(response).toBeDefined();
    expect(response.status).toBe('ok');
    expect(response.service).toBe('CareerSync API');
    expect(response.database).toBeDefined();
  });
});
