import {
  ScoringOffer,
  ScoringProfile,
  scoreOffer,
  titleSimilarity,
} from './match-scoring';

const baseProfile: ScoringProfile = {
  headline: 'Développeur Full-Stack Angular / NestJS',
  experienceLevel: 'INTERMEDIATE',
  yearsExperience: 4,
  locationCity: 'Paris',
  locationCountry: 'FR',
  radiusKm: 30,
  contractTypes: ['CDI'],
  workModes: ['HYBRID', 'REMOTE'],
  salaryMin: 50000,
  salaryCurrency: 'EUR',
  skills: [
    { slug: 'angular', label: 'Angular', weight: 5 },
    { slug: 'nestjs', label: 'NestJS', weight: 4 },
    { slug: 'typescript', label: 'TypeScript', weight: 5 },
  ],
};

const baseOffer: ScoringOffer = {
  id: 'offer-1',
  title: 'Développeur Full-Stack Angular / NestJS',
  city: 'Paris',
  country: 'FR',
  contractType: 'CDI',
  workMode: 'HYBRID',
  experienceLevel: 'INTERMEDIATE',
  salaryMin: 48000,
  salaryMax: 58000,
  salaryCurrency: 'EUR',
  publishedAt: new Date(),
  skills: [
    { slug: 'angular', label: 'Angular', weight: 5, required: true },
    { slug: 'nestjs', label: 'NestJS', weight: 4, required: true },
    { slug: 'typescript', label: 'TypeScript', weight: 5, required: true },
  ],
};

describe('titleSimilarity', () => {
  it('vaut 1 pour deux intitulés identiques', () => {
    expect(titleSimilarity('Développeur Angular', 'Développeur Angular')).toBe(1);
  });

  it('ignore la casse et les accents', () => {
    expect(titleSimilarity('DEVELOPPEUR Angular', 'développeur angular')).toBe(1);
  });

  it('reconnaît des variantes proches', () => {
    expect(
      titleSimilarity('Développeur Full-Stack Angular', 'Développeur fullstack Angular'),
    ).toBeGreaterThanOrEqual(0.4);
  });

  it('vaut 0 pour des intitulés sans rapport', () => {
    expect(titleSimilarity('Infirmier', 'Développeur Angular')).toBe(0);
  });
});

describe('scoreOffer', () => {
  it('donne un score très élevé à une offre idéale', () => {
    const result = scoreOffer(baseProfile, baseOffer);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.matchedSkills).toEqual(
      expect.arrayContaining(['Angular', 'NestJS', 'TypeScript']),
    );
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('pénalise une offre sans compétence commune', () => {
    const offer: ScoringOffer = {
      ...baseOffer,
      title: 'Infirmier en soins généraux',
      skills: [{ slug: 'soins', label: 'Soins', weight: 4, required: true }],
      salaryMin: 24000,
      salaryMax: 26000,
    };
    const result = scoreOffer(baseProfile, offer);
    expect(result.score).toBeLessThan(40);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('récompense le télétravail total', () => {
    const remote = scoreOffer(baseProfile, {
      ...baseOffer,
      city: 'Nantes',
      workMode: 'REMOTE',
    });
    const onsite = scoreOffer(baseProfile, {
      ...baseOffer,
      city: 'Nantes',
      workMode: 'ONSITE',
    });
    expect(remote.breakdown.location).toBe(100);
    expect(remote.score).toBeGreaterThan(onsite.score);
  });

  it('redistribue les poids quand le salaire est inconnu', () => {
    const result = scoreOffer(baseProfile, {
      ...baseOffer,
      salaryMin: null,
      salaryMax: null,
    });
    expect(result.breakdown.salary).toBe(0);
    expect(result.score).toBeGreaterThan(70);
  });

  it('détecte le décalage de niveau d’expérience', () => {
    const result = scoreOffer(baseProfile, {
      ...baseOffer,
      experienceLevel: 'LEAD',
    });
    expect(result.breakdown.experience).toBeLessThan(50);
    expect(result.warnings.join(' ')).toMatch(/niveau attendu/i);
  });

  it('signale un contrat non recherché', () => {
    const result = scoreOffer(baseProfile, { ...baseOffer, contractType: 'STAGE' });
    expect(result.breakdown.contract).toBeLessThan(50);
  });

  it('reste borné entre 0 et 100', () => {
    const perfect = scoreOffer(baseProfile, baseOffer);
    const worst = scoreOffer(baseProfile, {
      ...baseOffer,
      title: 'Chauffeur livreur',
      city: 'Strasbourg',
      country: 'BE',
      contractType: 'INTERIM',
      experienceLevel: 'LEAD',
      salaryMin: 12000,
      salaryMax: 13000,
      publishedAt: new Date(Date.now() - 400 * 86_400_000),
      skills: [{ slug: 'permis', label: 'Permis B', weight: 5, required: true }],
    });
    expect(perfect.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThanOrEqual(0);
  });

  it('est déterministe', () => {
    const a = scoreOffer(baseProfile, baseOffer);
    const b = scoreOffer(baseProfile, baseOffer);
    expect(a.score).toBe(b.score);
  });
});
