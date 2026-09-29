import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to normalize skill names to prevent duplication (e.g., "java", "JAVA" -> "Java")
   */
  normalizeName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '';

    return trimmed
      .split(' ')
      .map((word) => {
        if (word.length <= 3 && word === word.toUpperCase()) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Find or create skill by name
   */
  async findOrCreate(name: string) {
    const normalized = this.normalizeName(name);

    // Search case-insensitively first
    const existing = await this.prisma.skill.findFirst({
      where: {
        name: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.skill.create({
      data: {
        name: normalized,
      },
    });
  }

  /**
   * List all skills with optional search filter
   */
  async findAll(searchQuery?: string) {
    if (searchQuery && searchQuery.trim().length > 0) {
      return this.prisma.skill.findMany({
        where: {
          name: {
            contains: searchQuery.trim(),
            mode: 'insensitive',
          },
        },
        orderBy: {
          name: 'asc',
        },
        take: 20,
      });
    }

    return this.prisma.skill.findMany({
      orderBy: {
        name: 'asc',
      },
      take: 50,
    });
  }

  /**
   * Find skill by ID
   */
  async findById(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID "${id}" not found`);
    }

    return skill;
  }
}
