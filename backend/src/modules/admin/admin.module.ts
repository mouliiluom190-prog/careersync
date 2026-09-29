import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
