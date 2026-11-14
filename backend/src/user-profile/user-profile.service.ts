import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toSkillDefinition } from '../jobs/scoring/skill-extractor';
import { ScoringProfile } from '../jobs/scoring/match-scoring';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

/**
 * Source de vérité du profil de recherche : c'est lui qui alimente le moteur
 * de matching. Un seul profil par utilisateur (contrainte unique `userId`).
 */
@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { skills: { include: { skill: true } } },
    });

    if (!profile) {
      throw new NotFoundException(
        "Aucun profil de recherche : complétez le formulaire pour activer le matching",
      );
    }

    return this.toResponse(profile);
  }

  async getRawForScoring(userId: string): Promise<ScoringProfile> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { skills: { include: { skill: true } } },
    });

    if (!profile) {
      throw new NotFoundException(
        'Complétez votre profil avant de lancer une recherche personnalisée',
      );
    }

    return {
      headline: profile.headline,
      experienceLevel: profile.experienceLevel,
      yearsExperience: profile.yearsExperience,
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      radiusKm: profile.radiusKm,
      contractTypes: profile.contractTypes,
      workModes: profile.workModes,
      languages: profile.languages,
      salaryMin: profile.salaryMin,
      salaryCurrency: profile.salaryCurrency,
      skills: profile.skills.map((entry) => ({
        slug: entry.skill.slug,
        label: entry.skill.label,
        weight: entry.weight,
      })),
    };
  }

  /** Création ou mise à jour idempotente (PUT) du profil. */
  async upsert(userId: string, dto: UpsertProfileDto): Promise<ProfileResponseDto> {
    const skills = dedupeSkills(dto.skills);
    const skillIds = await this.ensureSkills(skills.map((skill) => skill.slug));

    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          headline: dto.headline,
          experienceLevel: dto.experienceLevel,
          yearsExperience: dto.yearsExperience,
          locationCity: dto.locationCity,
          locationCountry: dto.locationCountry,
          radiusKm: dto.radiusKm,
          contractTypes: dto.contractTypes,
          workModes: dto.workModes,
          languages: dto.languages ?? [],
          salaryMin: dto.salaryMin ?? 0,
          salaryCurrency: dto.salaryCurrency,
          salaryPeriod: dto.salaryPeriod,
          bio: dto.bio,
          isPublished: dto.isPublished,
        },
        update: {
          headline: dto.headline,
          experienceLevel: dto.experienceLevel,
          yearsExperience: dto.yearsExperience,
          locationCity: dto.locationCity,
          locationCountry: dto.locationCountry,
          radiusKm: dto.radiusKm,
          contractTypes: dto.contractTypes,
          workModes: dto.workModes,
          languages: dto.languages ?? [],
          salaryMin: dto.salaryMin ?? 0,
          salaryCurrency: dto.salaryCurrency,
          salaryPeriod: dto.salaryPeriod,
          bio: dto.bio,
          isPublished: dto.isPublished,
        },
      });

      // Remplacement complet des compétences (le PUT est autoritaire).
      await tx.profileSkill.deleteMany({ where: { profileId: saved.id } });
      if (skills.length) {
        await tx.profileSkill.createMany({
          data: skills.map((skill) => ({
            profileId: saved.id,
            skillId: skillIds.get(skill.slug)!,
            weight: skill.weight,
            years: skill.years,
          })),
        });
      }

      return tx.profile.findUniqueOrThrow({
        where: { id: saved.id },
        include: { skills: { include: { skill: true } } },
      });
    });

    return this.toResponse(profile);
  }

  async remove(userId: string): Promise<{ deleted: true }> {
    await this.prisma.profile.deleteMany({ where: { userId } });
    return { deleted: true };
  }

  async touchLastSearch(userId: string): Promise<void> {
    await this.prisma.profile.updateMany({
      where: { userId },
      data: { lastSearchAt: new Date() },
    });
  }

  /** Crée les compétences manquantes du référentiel et renvoie slug -> id. */
  private async ensureSkills(rawSlugs: string[]): Promise<Map<string, string>> {
    const definitions = rawSlugs.map((raw) => toSkillDefinition(raw));
    const unique = new Map(definitions.map((definition) => [definition.slug, definition]));

    const existing = await this.prisma.skill.findMany({
      where: { slug: { in: [...unique.keys()] } },
      select: { id: true, slug: true },
    });
    const map = new Map(existing.map((skill) => [skill.slug, skill.id]));

    const missing = [...unique.values()].filter((definition) => !map.has(definition.slug));
    if (missing.length) {
      await this.prisma.skill.createMany({
        data: missing.map((definition) => ({
          slug: definition.slug,
          label: definition.label,
          category: definition.category,
        })),
        skipDuplicates: true,
      });
      const created = await this.prisma.skill.findMany({
        where: { slug: { in: missing.map((definition) => definition.slug) } },
        select: { id: true, slug: true },
      });
      for (const skill of created) map.set(skill.slug, skill.id);
    }

    return map;
  }

  private toResponse(profile: {
    id: string;
    headline: string;
    experienceLevel: ProfileResponseDto['experienceLevel'];
    yearsExperience: number;
    locationCity: string;
    locationCountry: string;
    radiusKm: number;
    contractTypes: ProfileResponseDto['contractTypes'];
    workModes: ProfileResponseDto['workModes'];
    languages: ProfileResponseDto['languages'];
    salaryMin: number | null;
    salaryCurrency: string;
    salaryPeriod: string;
    bio: string | null;
    isPublished: boolean;
    lastSearchAt: Date | null;
    updatedAt: Date;
    skills: Array<{
      weight: number;
      years: number;
      skill: { slug: string; label: string; category: string };
    }>;
  }): ProfileResponseDto {
    const skills = profile.skills
      .map((entry) => ({
        slug: entry.skill.slug,
        label: entry.skill.label,
        category: entry.skill.category,
        weight: entry.weight,
        years: entry.years,
      }))
      .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));

    const completeness = computeCompleteness({
      headline: profile.headline,
      skills: skills.length,
      salaryMin: profile.salaryMin ?? 0,
      bio: profile.bio,
      locationCity: profile.locationCity,
      yearsExperience: profile.yearsExperience,
    });

    return { ...profile, skills, completeness };
  }
}

function dedupeSkills(
  skills: UpsertProfileDto['skills'],
): Array<{ slug: string; weight: number; years: number }> {
  const map = new Map<string, { slug: string; weight: number; years: number }>();
  for (const skill of skills) {
    const slug = toSkillDefinition(skill.slug).slug;
    const previous = map.get(slug);
    // En cas de doublon, on conserve l'auto-évaluation la plus haute.
    map.set(slug, {
      slug,
      weight: Math.max(previous?.weight ?? 0, skill.weight),
      years: Math.max(previous?.years ?? 0, skill.years),
    });
  }
  return [...map.values()];
}

/** Score de complétion du profil (0..100), affiché dans le tableau de bord. */
export function computeCompleteness(input: {
  headline: string;
  skills: number;
  salaryMin: number;
  bio: string | null;
  locationCity: string;
  yearsExperience: number;
}): number {
  let score = 0;
  if (input.headline.trim().length > 2) score += 20;
  if (input.locationCity.trim().length > 1) score += 15;
  score += Math.min(30, input.skills * 5);
  if (input.salaryMin > 0) score += 15;
  if (input.bio && input.bio.trim().length > 40) score += 10;
  if (input.yearsExperience > 0) score += 10;
  return Math.min(100, score);
}
