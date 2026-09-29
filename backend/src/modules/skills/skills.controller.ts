import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SkillsService } from './skills.service.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async findAll(@Query('q') query?: string) {
    return this.skillsService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateSkillDto) {
    return this.skillsService.findOrCreate(dto.name);
  }
}
