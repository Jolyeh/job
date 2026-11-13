import { ContractType, ExperienceLevel, WorkMode } from '../../generated/prisma/enums';
import { extractSkills, stripHtml } from '../scoring/skill-extractor';
import { NormalizedOffer } from './job-provider.interface';

/**
 * Mapping Remotive → modèle interne.
 *
 * Extrait du provider (qui ne garde que la responsabilité réseau) :
 *  - la logique de normalisation est **pure** et donc testable sans HTTP ni Nest ;
 *  - elle est réutilisable par un script d'import batch.
 */

export interface RemotiveJob {
  id: number | string;
  title: string;
  company_name: string;
  description: string;
  url: string;
  company_logo?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
}

export function mapRemotiveJob(raw: RemotiveJob): NormalizedOffer {
  const description = stripHtml(raw.description ?? '');
  const location = raw.candidate_required_location ?? 'Remote';
  const salary = parseRemotiveSalary(raw.salary);

  return {
    externalId: String(raw.id),
    source: 'remotive',
    title: raw.title,
    company: raw.company_name,
    description: description || raw.title,
    city: /worldwide|anywhere|monde/i.test(location) ? 'Télétravail' : titleCase(location),
    country: 'INT',
    contractType: mapContractType(raw.job_type, raw.title),
    workMode: 'REMOTE' as WorkMode,
    experienceLevel: mapExperience(raw.title, description),
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    salaryCurrency: /£/.test(raw.salary ?? '')
      ? 'GBP'
      : /€/.test(raw.salary ?? '')
        ? 'EUR'
        : 'USD',
    url: raw.url,
    applyUrl: raw.url,
    logoUrl: raw.company_logo || null,
    tags: [...(raw.tags ?? []), ...(raw.category ? [raw.category] : [])]
      .filter(Boolean)
      .slice(0, 10),
    publishedAt: new Date(raw.publication_date ?? Date.now()),
    skills: extractSkills(`${raw.title} ${description} ${(raw.tags ?? []).join(' ')}`),
    rawPayload: {
      id: raw.id,
      company_name: raw.company_name,
      category: raw.category,
      candidate_required_location: raw.candidate_required_location,
    },
  };
}

export function mapContractType(jobType?: string, title = ''): ContractType {
  const text = `${jobType ?? ''} ${title}`.toLowerCase();
  if (text.includes('intern')) return 'STAGE';
  if (text.includes('part')) return 'CDD';
  if (text.includes('contract') || text.includes('freelance')) return 'FREELANCE';
  return 'CDI';
}

export function mapExperience(title: string, description: string): ExperienceLevel {
  const text = `${title} ${description.slice(0, 800)}`.toLowerCase();
  if (/\b(lead|head of|principal|staff)\b/.test(text)) return 'LEAD';
  if (/\b(senior|sr\.?|expert)\b/.test(text)) return 'SENIOR';
  if (/\b(junior|jr\.?|entry level|graduate|intern)\b/.test(text)) return 'JUNIOR';
  return 'INTERMEDIATE';
}

/** "90,000 - 120,000 $" → { min: 90000, max: 120000 } (montants annuels). */
export function parseRemotiveSalary(
  label?: string,
): { min: number | null; max: number | null } | null {
  if (!label) return null;
  const numbers = [...label.matchAll(/(\d[\d\s.,]{3,})/g)]
    .map((match) => Number(match[1].replace(/[\s,]/g, '')))
    .filter((value) => Number.isFinite(value) && value > 1000);
  if (!numbers.length) return null;
  return {
    min: Math.min(...numbers),
    max: numbers.length > 1 ? Math.max(...numbers) : null,
  };
}

function titleCase(value: string): string {
  return value
    .split(/[\s,]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}
