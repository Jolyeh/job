import {
  mapContractType,
  mapExperience,
  mapRemotiveJob,
  parseRemotiveSalary,
  RemotiveJob,
} from './remotive.mapper';

/**
 * Tests du mapping Remotive → modèle interne.
 * Le mapper est pur (aucune dépendance Nest/HTTP) : ces tests couvrent toutes
 * les règles de normalisation appliquées aux offres agrégées.
 */
const remoteJob: RemotiveJob = {
  id: 1900001,
  title: 'Senior Angular Engineer',
  company_name: 'Nebula Labs',
  description:
    '<p>We build dashboards with <b>Angular</b>, TypeScript and RxJS.</p><ul><li>Docker</li></ul>',
  url: 'https://remotive.com/jobs/1900001',
  company_logo: 'https://cdn.example.com/nebula.png',
  category: 'Software Development',
  tags: ['angular', 'typescript'],
  job_type: 'full_time',
  publication_date: '2026-11-08T09:00:00',
  candidate_required_location: 'Worldwide',
  salary: '$90,000 - $120,000',
};

describe('mapRemotiveJob', () => {
  it('normalise une offre remote complète', () => {
    const offer = mapRemotiveJob(remoteJob);

    expect(offer.source).toBe('remotive');
    expect(offer.externalId).toBe('1900001');
    expect(offer.workMode).toBe('REMOTE');
    expect(offer.contractType).toBe('CDI');
    expect(offer.experienceLevel).toBe('SENIOR');
    expect(offer.salaryMin).toBe(90000);
    expect(offer.salaryMax).toBe(120000);
    expect(offer.salaryCurrency).toBe('USD');
    expect(offer.city).toBe('Télétravail');
    expect(offer.url).toBe('https://remotive.com/jobs/1900001');
    expect(offer.logoUrl).toBe('https://cdn.example.com/nebula.png');
    expect(offer.publishedAt).toBeInstanceOf(Date);
  });

  it('nettoie le HTML et détecte les compétences', () => {
    const offer = mapRemotiveJob(remoteJob);
    expect(offer.description).not.toContain('<p>');
    expect(offer.description).toContain('Angular');
    expect(offer.skills.map((skill) => skill.slug)).toEqual(
      expect.arrayContaining(['angular', 'typescript', 'docker', 'rxjs']),
    );
  });

  it('conserve les tags et la catégorie comme métadonnées', () => {
    const offer = mapRemotiveJob(remoteJob);
    expect(offer.tags).toEqual(
      expect.arrayContaining(['angular', 'typescript', 'Software Development']),
    );
  });

  it('gère une offre minimale (champs absents)', () => {
    const offer = mapRemotiveJob({
      id: 'abc',
      title: 'Designer',
      company_name: 'Studio',
      description: '',
      url: 'https://example.com',
    });
    expect(offer.description).toBe('Designer');
    expect(offer.salaryMin).toBeNull();
    expect(offer.city).toBe('Remote');
    expect(offer.logoUrl).toBeNull();
    expect(offer.externalId).toBe('abc');
  });
});

describe('mapContractType', () => {
  it('reconnaît stages, temps partiel et freelance', () => {
    expect(mapContractType('internship')).toBe('STAGE');
    expect(mapContractType('part_time')).toBe('CDD');
    expect(mapContractType('contract')).toBe('FREELANCE');
    expect(mapContractType('freelance')).toBe('FREELANCE');
    expect(mapContractType('full_time')).toBe('CDI');
    expect(mapContractType(undefined)).toBe('CDI');
  });
});

describe('mapExperience', () => {
  it('déduit le niveau depuis l’intitulé', () => {
    expect(mapExperience('Head of Engineering', '')).toBe('LEAD');
    expect(mapExperience('Senior Angular Engineer', '')).toBe('SENIOR');
    expect(mapExperience('Junior Developer', '')).toBe('JUNIOR');
    expect(mapExperience('Product Design Intern', '')).toBe('JUNIOR');
    expect(mapExperience('Angular Developer', '')).toBe('INTERMEDIATE');
  });
});

describe('parseRemotiveSalary', () => {
  it('lit une fourchette et une valeur unique', () => {
    expect(parseRemotiveSalary('$90,000 - $120,000')).toEqual({ min: 90000, max: 120000 });
    expect(parseRemotiveSalary('€65,000')).toEqual({ min: 65000, max: null });
  });

  it('ignore les montants non exploitables', () => {
    expect(parseRemotiveSalary('Competitive')).toBeNull();
    expect(parseRemotiveSalary(undefined)).toBeNull();
    expect(parseRemotiveSalary('$500')).toBeNull();
  });
});
