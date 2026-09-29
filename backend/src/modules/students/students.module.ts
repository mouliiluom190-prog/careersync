import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';
import { SkillsModule } from '../skills/skills.module.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule, SkillsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
