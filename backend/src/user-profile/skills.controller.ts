import { Controller, Get, Query } from '@nestjs/common';
import { SKILL_CATALOG } from '../jobs/scoring/skill-extractor';
import { PrismaService } from '../prisma/prisma.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Référentiel de compétences pour l'autocomplétion du formulaire :
   * catalogue statique + compétences déjà rencontrées en base.
   */
  @Get()
  async list(@Query('q') query?: string): Promise<
    Array<{ slug: string; label: string; category: string; usage: number }>
  > {
    const term = query?.trim().toLowerCase();

    const usage = await this.prisma.skill.findMany({
      select: {
        slug: true,
        label: true,
        category: true,
        _count: { select: { offers: true, profiles: true } },
      },
      orderBy: { label: 'asc' },
    });

    const usageBySlug = new Map(
      usage.map((skill) => [
        skill.slug,
        skill._count.offers + skill._count.profiles,
      ]),
    );

    const merged = new Map<string, { slug: string; label: string; category: string }>();
    for (const skill of SKILL_CATALOG) {
      merged.set(skill.slug, {
        slug: skill.slug,
        label: skill.label,
        category: skill.category,
      });
    }
    for (const skill of usage) {
      if (!merged.has(skill.slug)) {
        merged.set(skill.slug, {
          slug: skill.slug,
          label: skill.label,
          category: skill.category,
        });
      }
    }

    return [...merged.values()]
      .filter((skill) =>
        term
          ? skill.label.toLowerCase().includes(term) || skill.slug.includes(term)
          : true,
      )
      .map((skill) => ({ ...skill, usage: usageBySlug.get(skill.slug) ?? 0 }))
      .sort((a, b) => b.usage - a.usage || a.label.localeCompare(b.label))
      .slice(0, 60);
  }
}
