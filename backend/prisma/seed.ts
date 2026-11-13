/**
 * Seed de démonstration.
 *
 * Crée :
 *  - un référentiel de compétences aligné sur le catalogue du moteur de matching ;
 *  - 2 comptes (démo + admin) et un profil de recherche complet ;
 *  - ~28 offres d'emploi réalistes (Paris/Lyon/remote, CDI/CDD/alternance…).
 *
 * Idempotent : relançable sans dupliquer (upsert sur les clés naturelles).
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { SKILL_CATALOG, extractSkills } from '../src/jobs/scoring/skill-extractor';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://jobradar:jobradar@localhost:55432/jobradar',
  }),
});

const DAY = 86_400_000;
const daysAgo = (days) => new Date(Date.now() - days * DAY);

const OFFERS = [
  {
    externalId: 'demo-001',
    title: 'Développeur Full-Stack Angular / NestJS',
    company: 'Payflow',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 48000,
    salaryMax: 58000,
    publishedAt: daysAgo(1),
    tags: ['fintech', 'scale-up', 'SaaS'],
    description: `Payflow réinvente le paiement B2B. Nous recherchons un développeur full-stack pour rejoindre une squad de 5 personnes.

Missions :
- Concevoir des interfaces réactives en Angular 19+ (standalone components, signals)
- Développer les APIs REST et GraphQL avec NestJS et PostgreSQL
- Contribuer à l'architecture hexagonale et aux tests automatisés (Jest)
- Participer aux revues de code et aux cérémonies Agile / Scrum

Stack : TypeScript, Angular, RxJS, Tailwind CSS, NestJS, Prisma, PostgreSQL, Docker, GitLab CI.
Télétravail : 3 jours par semaine.`,
  },
  {
    externalId: 'demo-002',
    title: 'Ingénieur Frontend Angular Senior',
    company: 'Voyagio',
    city: 'Lyon',
    contractType: 'CDI',
    workMode: 'REMOTE',
    experienceLevel: 'SENIOR',
    salaryMin: 55000,
    salaryMax: 68000,
    publishedAt: daysAgo(2),
    tags: ['travel', 'remote-first', 'design system'],
    description: `Voyagio (120 collaborateurs, remote-first) cherche un ingénieur frontend senior pour porter son design system.

- Angular 18/19, TypeScript strict, signals et zoneless
- Tailwind CSS, Storybook, accessibilité RGAA / WCAG
- Tests unitaires et e2e (Jest, Playwright)
- 5 ans d'expérience minimum sur des applications complexes
100 % télétravail en France, 2 jours de séminaire par trimestre.`,
  },
  {
    externalId: 'demo-003',
    title: 'Développeur Backend NestJS',
    company: 'Orbital',
    city: 'Bordeaux',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 42000,
    salaryMax: 52000,
    publishedAt: daysAgo(3),
    tags: ['iot', 'microservices'],
    description: `Orbital connecte les flottes industrielles. Nous cherchons un développeur backend pour construire nos microservices.

- NestJS, Node.js, TypeScript
- PostgreSQL, Redis, Kafka pour les flux temps réel
- Docker, Kubernetes, AWS (ECS, Lambda)
- API REST documentées avec OpenAPI / Swagger
Un poste avec 2 jours de télétravail par semaine.`,
  },
  {
    externalId: 'demo-004',
    title: 'Lead Tech Full-Stack TypeScript',
    company: 'Nexio Santé',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'LEAD',
    salaryMin: 70000,
    salaryMax: 85000,
    publishedAt: daysAgo(4),
    tags: ['healthtech', 'leadership'],
    description: `Nexio Santé digitalise le parcours de soin. En tant que Lead Tech, vous encadrez 6 développeurs.

- Architecture logicielle : DDD, clean architecture, microservices
- Angular et NestJS, TypeScript, PostgreSQL
- Kubernetes, Azure, Terraform, CI/CD GitHub Actions
- 8 ans d'expérience, dont 2 en encadrement
Télétravail hybride (2 jours/semaine).`,
  },
  {
    externalId: 'demo-005',
    title: 'Développeur Full-Stack Junior React / Node',
    company: 'Studio Kléber',
    city: 'Nantes',
    contractType: 'CDI',
    workMode: 'ONSITE',
    experienceLevel: 'JUNIOR',
    salaryMin: 34000,
    salaryMax: 38000,
    publishedAt: daysAgo(1),
    tags: ['agence', 'web'],
    description: `Studio Kléber accompagne des marques dans leurs projets digitaux. Nous cherchons un développeur junior curieux.

Stack : React, Node.js, Express, MySQL, HTML, CSS, Git.
Formation Bac+5 en informatique, stage ou alternance significative.
Mentorat assuré par un développeur senior.`,
  },
  {
    externalId: 'demo-006',
    title: 'Data Engineer Python / Spark',
    company: 'DataFlux',
    city: 'Lille',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'SENIOR',
    salaryMin: 58000,
    salaryMax: 70000,
    publishedAt: daysAgo(5),
    tags: ['data', 'platform'],
    description: `DataFlux construit des plateformes data pour des acteurs de la distribution.

- Python, Spark, dbt, Airflow
- Kafka pour l'ingestion, Snowflake / PostgreSQL pour le stockage
- Terraform, AWS, Docker, Kubernetes
- Tests automatisés et CI/CD
5 ans d'expérience minimum. 3 jours de télétravail.`,
  },
  {
    externalId: 'demo-007',
    title: 'Product Designer UX/UI',
    company: 'Voyagio',
    city: 'Lyon',
    contractType: 'CDI',
    workMode: 'REMOTE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 45000,
    salaryMax: 54000,
    publishedAt: daysAgo(6),
    tags: ['design', 'ux'],
    description: `Vous portez l'expérience utilisateur de notre produit de A à Z.

- Figma, design system, prototypage
- Recherche utilisateur et tests d'utilisabilité
- Collaboration étroite avec les équipes Angular et Tailwind
- Sensibilité accessibilité (RGAA, WCAG)
100 % remote.`,
  },
  {
    externalId: 'demo-008',
    title: 'Développeur Java Spring Boot',
    company: 'Banque Conseil',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'ONSITE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 50000,
    salaryMax: 60000,
    publishedAt: daysAgo(8),
    tags: ['banque', 'grand groupe'],
    description: `Au sein de la direction des systèmes d'information, vous modernisez nos applications critiques.

- Java 17, Spring Boot, API REST
- PostgreSQL, Kafka, Redis
- Docker, Jenkins, Git
- Méthodologie Agile / Scrum, TDD apprécié
3 ans d'expérience. Poste basé à Paris La Défense.`,
  },
  {
    externalId: 'demo-009',
    title: 'Alternance Développeur Web Angular',
    company: 'Startuplab',
    city: 'Marseille',
    contractType: 'ALTERNANCE',
    workMode: 'HYBRID',
    experienceLevel: 'JUNIOR',
    salaryMin: 15000,
    salaryMax: 19000,
    publishedAt: daysAgo(2),
    tags: ['alternance', 'master'],
    description: `Startuplab recherche un(e) alternant(e) en développement web pour 24 mois.

Vous apprendrez avec nous : Angular, TypeScript, HTML, CSS, Git.
Un mentor dédié et 1 jour de télétravail par semaine.
Rythme : 3 semaines entreprise / 1 semaine école.`,
  },
  {
    externalId: 'demo-010',
    title: 'Ingénieur DevOps / SRE',
    company: 'Cloudpath',
    city: 'Toulouse',
    contractType: 'CDI',
    workMode: 'REMOTE',
    experienceLevel: 'SENIOR',
    salaryMin: 62000,
    salaryMax: 75000,
    publishedAt: daysAgo(3),
    tags: ['devops', 'sre', 'kubernetes'],
    description: `Cloudpath opère des plateformes Kubernetes pour des scale-ups européennes.

- Kubernetes, Docker, Terraform, Helm
- AWS et GCP, observabilité (Prometheus, Grafana)
- CI/CD GitLab CI, GitHub Actions
- Linux, scripting Python / Go
100 % télétravail, astreinte rémunérée.`,
  },
  {
    externalId: 'demo-011',
    title: 'Développeur Full-Stack Vue.js / Laravel',
    company: 'Agence Onze',
    city: 'Montpellier',
    contractType: 'FREELANCE',
    workMode: 'REMOTE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 45000,
    salaryMax: 60000,
    publishedAt: daysAgo(10),
    tags: ['freelance', 'agence'],
    description: `Mission freelance 6 mois renouvelable pour une agence web.

- Vue.js / Nuxt, Laravel, PHP 8
- MySQL, Tailwind CSS
- Git, CI/CD
4 ans d'expérience, travail 100 % à distance.`,
  },
  {
    externalId: 'demo-012',
    title: 'Développeur Angular / NestJS (CDD 12 mois)',
    company: 'Mutuelle Horizon',
    city: 'Rennes',
    contractType: 'CDD',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 40000,
    salaryMax: 47000,
    publishedAt: daysAgo(7),
    tags: ['mutuelle', 'santé'],
    description: `Refonte de notre espace adhérent.

- Angular 17+, TypeScript, RxJS, SCSS
- NestJS, PostgreSQL, Prisma
- Tests Jest, Git
CDD de 12 mois renouvelable, 2 jours de télétravail.`,
  },
  {
    externalId: 'demo-013',
    title: 'Machine Learning Engineer',
    company: 'Cortex AI',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'SENIOR',
    salaryMin: 65000,
    salaryMax: 80000,
    publishedAt: daysAgo(2),
    tags: ['ai', 'llm', 'python'],
    description: `Cortex AI industrialise des modèles de langage pour l'assurance.

- Python, PyTorch, NLP, LLM, RAG
- FastAPI, PostgreSQL (pgvector), Redis
- Docker, Kubernetes, AWS
- Veille active sur l'IA générative
5 ans d'expérience, 2 jours de télétravail.`,
  },
  {
    externalId: 'demo-014',
    title: 'Stagiaire Développeur Frontend',
    company: 'Wavemaker',
    city: 'Lyon',
    contractType: 'STAGE',
    workMode: 'ONSITE',
    experienceLevel: 'JUNIOR',
    salaryMin: 12000,
    salaryMax: 14000,
    publishedAt: daysAgo(4),
    tags: ['stage', 'frontend'],
    description: `Stage de 6 mois au sein de l'équipe produit.

Vous travaillerez sur une application Angular : composants, signals, Tailwind CSS.
Bases en TypeScript, HTML et CSS requises.`,
  },
  {
    externalId: 'demo-015',
    title: 'Développeur Full-Stack TypeScript (Symfony welcome)',
    company: 'Kindred',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'SENIOR',
    salaryMin: 60000,
    salaryMax: 72000,
    publishedAt: daysAgo(1),
    tags: ['impact', 'greentech'],
    description: `Kindred outille les collectivités dans leur transition écologique.

- Angular 19, signals, Tailwind CSS
- NestJS, Prisma, PostgreSQL
- GraphQL, API REST
- CI/CD GitHub Actions, Docker
5 ans d'expérience. Poste hybride à Paris.`,
  },
  {
    externalId: 'demo-016',
    title: 'Architecte Logiciel',
    company: 'Groupe Aurore',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'LEAD',
    salaryMin: 80000,
    salaryMax: 95000,
    publishedAt: daysAgo(9),
    tags: ['architecture', 'conseil'],
    description: `Vous définissez les orientations techniques du groupe.

- Architecture logicielle, DDD, clean architecture, microservices
- Java, Spring Boot, NestJS, Angular
- Kubernetes, Terraform, Azure
- Cybersécurité et OWASP
10 ans d'expérience minimum.`,
  },
  {
    externalId: 'demo-017',
    title: 'Développeur Backend Node.js (interim)',
    company: 'Talent Interim',
    city: 'Boulogne-Billancourt',
    contractType: 'INTERIM',
    workMode: 'ONSITE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 45000,
    salaryMax: 50000,
    publishedAt: daysAgo(6),
    tags: ['interim', 'média'],
    description: `Mission intérim de 4 mois pour un groupe média.

- Node.js, Express, MongoDB, Redis
- API REST, GraphQL
- Docker, Git
Démarrage immédiat, 3 ans d'expérience.`,
  },
  {
    externalId: 'demo-018',
    title: 'Développeur Full-Stack Angular / Node',
    company: 'AgriTech Solutions',
    city: 'Lyon',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 44000,
    salaryMax: 52000,
    publishedAt: daysAgo(12),
    tags: ['agritech'],
    description: `Nous aidons les exploitations agricoles à piloter leurs données.

- Angular, TypeScript, RXJS, SCSS
- Node.js, NestJS, PostgreSQL
- IoT, capteurs, cartographie
3 ans d'expérience, 2 jours de télétravail.`,
  },
  {
    externalId: 'demo-019',
    title: 'QA Automation Engineer',
    company: 'Payflow',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 45000,
    salaryMax: 55000,
    publishedAt: daysAgo(5),
    tags: ['qa', 'fintech'],
    description: `Vous garantissez la qualité de notre plateforme de paiement.

- Playwright, Cypress, Jest
- TypeScript, API REST
- CI/CD GitLab, Docker
- TDD, tests de performance
3 ans d'expérience.`,
  },
  {
    externalId: 'demo-020',
    title: 'Développeur Frontend React Senior',
    company: 'MediConnect',
    city: 'Bordeaux',
    contractType: 'CDI',
    workMode: 'REMOTE',
    experienceLevel: 'SENIOR',
    salaryMin: 55000,
    salaryMax: 65000,
    publishedAt: daysAgo(3),
    tags: ['healthtech', 'remote'],
    description: `Application de téléconsultation utilisée par 2 000 praticiens.

- React, Next.js, TypeScript
- Tailwind CSS, accessibilité WCAG
- GraphQL, Apollo
- Tests Jest, Cypress
4 ans d'expérience minimum, 100 % télétravail.`,
  },
  {
    externalId: 'demo-021',
    title: 'Chef de Projet Digital / Product Owner',
    company: 'Agence Onze',
    city: 'Montpellier',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 42000,
    salaryMax: 50000,
    publishedAt: daysAgo(15),
    tags: ['product', 'agence'],
    description: `Vous pilotez des projets web de la découverte à la livraison.

- Product management, backlog, user stories
- Agile / Scrum, Kanban
- Notions de HTML, CSS, Figma
3 ans d'expérience.`,
  },
  {
    externalId: 'demo-022',
    title: 'Développeur PHP Symfony',
    company: 'e-shop Factory',
    city: 'Nantes',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 38000,
    salaryMax: 46000,
    publishedAt: daysAgo(11),
    tags: ['e-commerce', 'php'],
    description: `Nous développons des boutiques en ligne à forte audience.

- PHP 8, Symfony, Doctrine
- MySQL, Redis, Elasticsearch
- Vue.js pour le front, Tailwind CSS
- Docker, Git
3 ans d'expérience.`,
  },
  {
    externalId: 'demo-023',
    title: 'Développeur Full-Stack NestJS / Angular',
    company: 'Urbis',
    city: 'Nantes',
    contractType: 'CDI',
    workMode: 'ONSITE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 43000,
    salaryMax: 50000,
    publishedAt: daysAgo(1),
    tags: ['smart city', 'impact'],
    description: `Urbis modélise les mobilités urbaines.

- NestJS, Prisma, PostgreSQL
- Angular, TypeScript, Tailwind CSS
- Docker, CI/CD, Linux
- PostgreSQL et modélisation de données géographiques (PostGIS apprécié)
Poste sur site à Nantes.`,
  },
  {
    externalId: 'demo-024',
    title: 'Développeur Go / Kubernetes',
    company: 'Stackline',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'REMOTE',
    experienceLevel: 'SENIOR',
    salaryMin: 70000,
    salaryMax: 85000,
    publishedAt: daysAgo(4),
    tags: ['platform', 'go'],
    description: `Nous construisons une plateforme de déploiement self-service.

- Go, Kubernetes, Docker
- Terraform, operator patterns
- AWS, GCP, CI/CD
- Observabilité et SRE
100 % remote, 5 ans d'expérience.`,
  },
  {
    externalId: 'demo-025',
    title: 'Développeur Web Junior PHP / JavaScript',
    company: 'Freelance Collective',
    city: 'Strasbourg',
    contractType: 'CDD',
    workMode: 'HYBRID',
    experienceLevel: 'JUNIOR',
    salaryMin: 30000,
    salaryMax: 34000,
    publishedAt: daysAgo(20),
    tags: ['junior', 'web'],
    description: `CDD de 8 mois pour accompagner notre croissance.

- PHP, JavaScript, HTML, CSS
- WordPress, Git
- 1 an d'expérience ou alternance réussie
2 jours de télétravail.`,
  },
  {
    externalId: 'demo-026',
    title: 'Ingénieur Cybersécurité',
    company: 'Groupe Aurore',
    city: 'Paris',
    contractType: 'CDI',
    workMode: 'HYBRID',
    experienceLevel: 'SENIOR',
    salaryMin: 60000,
    salaryMax: 75000,
    publishedAt: daysAgo(6),
    tags: ['cybersécurité', 'soc'],
    description: `Rejoignez notre SOC interne.

- Cybersécurité, OWASP, pentest
- SIEM, SOC, réponse à incident
- Linux, Docker, scripting Python
- Normes ISO 27001
4 ans d'expérience.`,
  },
  {
    externalId: 'demo-027',
    title: 'Développeur Angular (mission longue)',
    company: 'Digital Partners',
    city: 'Issy-les-Moulineaux',
    contractType: 'FREELANCE',
    workMode: 'HYBRID',
    experienceLevel: 'SENIOR',
    salaryMin: 60000,
    salaryMax: 78000,
    publishedAt: daysAgo(2),
    tags: ['freelance', 'esn'],
    description: `Mission de 12 mois chez un grand compte de l'énergie.

- Angular 19, signals, standalone components
- RxJS, TypeScript strict, Tailwind CSS
- Tests Jest, Storybook
- Architecture front et design system
TJM 550-650 €, hybride 3 jours sur site à Issy-les-Moulineaux.`,
  },
  {
    externalId: 'demo-028',
    title: 'Développeur Full-Stack C# .NET / Angular',
    company: 'Industrie 4.0',
    city: 'Lille',
    contractType: 'CDI',
    workMode: 'ONSITE',
    experienceLevel: 'INTERMEDIATE',
    salaryMin: 46000,
    salaryMax: 56000,
    publishedAt: daysAgo(13),
    tags: ['industrie', 'dotnet'],
    description: `Digitalisation des lignes de production.

- C#, .NET 8, ASP.NET Core
- Angular, TypeScript
- SQL Server, PostgreSQL
- Docker, Azure DevOps
4 ans d'expérience, poste sur site.`,
  },
];

async function main() {
  console.log('→ Référentiel de compétences…');
  for (const skill of SKILL_CATALOG) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      create: { slug: skill.slug, label: skill.label, category: skill.category },
      update: { label: skill.label, category: skill.category },
    });
  }

  console.log('→ Comptes de démonstration…');
  const passwordHash = await bcrypt.hash('Demo1234', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@jobradar.dev' },
    create: {
      email: 'demo@jobradar.dev',
      fullName: 'Camille Moreau',
      passwordHash,
      role: 'USER',
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: 'admin@jobradar.dev' },
    create: {
      email: 'admin@jobradar.dev',
      fullName: 'Admin JobRadar',
      passwordHash,
      role: 'ADMIN',
    },
    update: {},
  });

  console.log('→ Profil de recherche…');
  const profile = await prisma.profile.upsert({
    where: { userId: demo.id },
    create: {
      userId: demo.id,
      headline: 'Développeur Full-Stack Angular / NestJS',
      experienceLevel: 'INTERMEDIATE',
      yearsExperience: 4,
      locationCity: 'Paris',
      locationCountry: 'FR',
      radiusKm: 40,
      contractTypes: ['CDI', 'FREELANCE'],
      workModes: ['HYBRID', 'REMOTE'],
      salaryMin: 50000,
      salaryCurrency: 'EUR',
      salaryPeriod: 'YEAR',
      bio: "Développeuse full-stack avec 4 ans d'expérience sur des produits SaaS B2B. J'aime les architectures propres, les tests et les interfaces soignées.",
      isPublished: true,
    },
    update: {},
  });

  const profileSkills = [
    { slug: 'angular', weight: 5, years: 4 },
    { slug: 'nestjs', weight: 4, years: 3 },
    { slug: 'typescript', weight: 5, years: 4 },
    { slug: 'rxjs', weight: 4, years: 3 },
    { slug: 'tailwind', weight: 4, years: 2 },
    { slug: 'postgresql', weight: 4, years: 3 },
    { slug: 'prisma', weight: 3, years: 2 },
    { slug: 'docker', weight: 3, years: 2 },
    { slug: 'git', weight: 4, years: 4 },
    { slug: 'rest-api', weight: 4, years: 4 },
    { slug: 'agile', weight: 3, years: 4 },
    { slug: 'tdd', weight: 3, years: 3 },
  ];

  await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
  for (const entry of profileSkills) {
    const skill = await prisma.skill.findUnique({ where: { slug: entry.slug } });
    if (!skill) continue;
    await prisma.profileSkill.create({
      data: {
        profileId: profile.id,
        skillId: skill.id,
        weight: entry.weight,
        years: entry.years,
      },
    });
  }

  console.log(`→ ${OFFERS.length} offres d'emploi…`);
  for (const offer of OFFERS) {
    const url = `https://jobs.example.com/${offer.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${offer.externalId}`;
    const jobOffer = await prisma.jobOffer.upsert({
      where: {
        source_externalId: { source: 'catalog', externalId: offer.externalId },
      },
      create: {
        externalId: offer.externalId,
        source: 'catalog',
        title: offer.title,
        company: offer.company,
        description: offer.description,
        city: offer.city,
        country: 'FR',
        contractType: offer.contractType,
        workMode: offer.workMode,
        experienceLevel: offer.experienceLevel,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        salaryCurrency: 'EUR',
        url,
        applyUrl: `${url}/apply`,
        tags: offer.tags,
        publishedAt: offer.publishedAt,
        isActive: true,
      },
      update: {
        title: offer.title,
        description: offer.description,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        publishedAt: offer.publishedAt,
        tags: offer.tags,
      },
    });

    const detected = extractSkills(`${offer.title} ${offer.description} ${offer.tags.join(' ')}`);
    await prisma.jobOfferSkill.deleteMany({ where: { jobOfferId: jobOffer.id } });

    for (const skill of detected) {
      const row = await prisma.skill.upsert({
        where: { slug: skill.slug },
        create: { slug: skill.slug, label: skill.label, category: 'general' },
        update: {},
      });
      // La première compétence citée dans l'intitulé est considérée comme requise.
      const required = offer.title.toLowerCase().includes(skill.label.toLowerCase());
      await prisma.jobOfferSkill.create({
        data: {
          jobOfferId: jobOffer.id,
          skillId: row.id,
          required,
          weight: required ? 5 : 3,
        },
      });
    }
  }

  // Quelques favoris pour illustrer le tableau de bord.
  const firstOffers = await prisma.jobOffer.findMany({
    where: { source: 'catalog' },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  });

  const statuses = ['SAVED', 'APPLIED', 'INTERVIEW'];
  for (const [index, offer] of firstOffers.entries()) {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_jobOfferId: { userId: demo.id, jobOfferId: offer.id } },
    });
    if (existing) continue;

    await prisma.bookmark.create({
      data: {
        userId: demo.id,
        jobOfferId: offer.id,
        status: statuses[index] ?? 'SAVED',
        matchScore: 80 - index * 5,
        appliedAt: index >= 1 ? daysAgo(3) : null,
        interviewAt: index >= 2 ? daysAgo(1) : null,
        notes: index === 0 ? 'À postuler avant vendredi — contact RH sur LinkedIn.' : null,
        nextActionAt: index === 0 ? new Date(Date.now() + 2 * DAY) : null,
        events: {
          create: [{ status: 'SAVED', comment: 'Offre mise en favori' }],
        },
      },
    });
  }

  const [skills, offers, bookmarks] = await Promise.all([
    prisma.skill.count(),
    prisma.jobOffer.count(),
    prisma.bookmark.count(),
  ]);

  console.log(
    `\n✅ Seed terminé : ${skills} compétences, ${offers} offres, ${bookmarks} favoris.`,
  );
  console.log('   Compte démo : demo@jobradar.dev / Demo1234\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed en échec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
