import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SkillsModule } from './modules/skills/skills.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { RecruitersModule } from './modules/recruiters/recruiters.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { ResumesModule } from './modules/resumes/resumes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    SkillsModule,
    StudentsModule,
    RecruitersModule,
    CompaniesModule,
    JobsModule,
    ApplicationsModule,
    ResumesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
