/**
 * Données de référence (pas de données de test).
 *
 * Ce script n'insère **aucune offre, aucun profil, aucun favori** : il ne crée
 * que ce dont l'application a besoin pour fonctionner.
 *
 *  1. le référentiel de compétences (utilisé par le moteur de matching) ;
 *  2. le catalogue des sites d'emploi (LinkedIn, Indeed, Apec, Welcome to the
 *     Jungle, ATS…), avec les sites marqués « par défaut » ;
 *  3. le compte propriétaire `dev`, avec ses sites par défaut déjà rattachés
 *     et son profil de recherche vide à compléter.
 *
 * Idempotent : relançable sans dupliquer (upsert sur les clés naturelles).
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { SKILL_CATALOG } from '../src/jobs/scoring/skill-extractor';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://dev:Prince%4014@localhost:55432/jobradar',
  }),
});

/**
 * Sites d'emploi proposés.
 * `isDefault: true` → rattachés automatiquement à chaque nouveau compte
 * (et au compte propriétaire créé ici).
 */
type SeedJobSite = {
  slug: string;
  name: string;
  url: string;
  kind: 'JOB_BOARD' | 'ATS' | 'COMPANY' | 'NETWORK' | 'OTHER';
  country: string;
  language: 'FR' | 'EN';
  description: string;
  isDefault?: boolean;
  position: number;
};

const JOB_SITES: SeedJobSite[] = [
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/',
    kind: 'NETWORK',
    country: 'INT',
    language: 'EN',
    description: 'Réseau professionnel : offres FR et internationales, alertes par recherche.',
    isDefault: true,
    position: 1,
  },
  {
    slug: 'indeed',
    name: 'Indeed',
    url: 'https://fr.indeed.com/',
    kind: 'JOB_BOARD',
    country: 'FR',
    language: 'FR',
    description: 'Méta-moteur généraliste, très large volume d’annonces.',
    isDefault: true,
    position: 2,
  },
  {
    slug: 'apec',
    name: 'Apec',
    url: 'https://www.apec.fr/',
    kind: 'JOB_BOARD',
    country: 'FR',
    language: 'FR',
    description: 'Offres cadres et jeunes diplômés en France.',
    isDefault: true,
    position: 3,
  },
  {
    slug: 'welcometothejungle',
    name: 'Welcome to the Jungle',
    url: 'https://www.welcometothejungle.com/fr/jobs',
    kind: 'JOB_BOARD',
    country: 'FR',
    language: 'FR',
    description: 'Startups et tech, fiches entreprise détaillées.',
    isDefault: true,
    position: 4,
  },
  {
    slug: 'france-travail',
    name: 'France Travail',
    url: 'https://candidat.francetravail.fr/offres/recherche',
    kind: 'JOB_BOARD',
    country: 'FR',
    language: 'FR',
    description: 'Service public de l’emploi (ex-Pôle emploi), API officielle.',
    isDefault: true,
    position: 5,
  },
  {
    slug: 'hellowork',
    name: 'HelloWork',
    url: 'https://www.hellowork.com/fr-fr/emploi.html',
    kind: 'JOB_BOARD',
    country: 'FR',
    language: 'FR',
    description: 'Annonces généralistes, filtres par région.',
    position: 6,
  },
  {
    slug: 'remotive',
    name: 'Remotive',
    url: 'https://remotive.com/',
    kind: 'JOB_BOARD',
    country: 'INT',
    language: 'EN',
    description: 'Offres en télétravail, majoritairement anglophones.',
    position: 7,
  },
  {
    slug: 'remoteok',
    name: 'Remote OK',
    url: 'https://remoteok.com/',
    kind: 'JOB_BOARD',
    country: 'INT',
    language: 'EN',
    description: 'Télétravail international, profils tech et produit.',
    position: 8,
  },
  {
    slug: 'hackernews',
    name: 'Hacker News — Who is hiring',
    url: 'https://news.ycombinator.com/jobs',
    kind: 'OTHER',
    country: 'INT',
    language: 'EN',
    description: 'Fil mensuel de recrutement tech, très anglophone.',
    position: 9,
  },
  {
    slug: 'greenhouse',
    name: 'Greenhouse',
    url: 'https://boards.greenhouse.io/',
    kind: 'ATS',
    country: 'INT',
    language: 'EN',
    description: 'ATS utilisé par de nombreuses entreprises tech.',
    position: 10,
  },
  {
    slug: 'lever',
    name: 'Lever',
    url: 'https://jobs.lever.co/',
    kind: 'ATS',
    country: 'INT',
    language: 'EN',
    description: 'ATS d’entreprises (startups, scale-ups).',
    position: 11,
  },
  {
    slug: 'teamtailor',
    name: 'Teamtailor',
    url: 'https://career.teamtailor.com/jobs',
    kind: 'ATS',
    country: 'INT',
    language: 'EN',
    description: 'Pages carrière d’entreprises européennes.',
    position: 12,
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

  console.log('→ Catalogue des sites d’emploi…');
  for (const site of JOB_SITES) {
    await prisma.jobSite.upsert({
      where: { slug: site.slug },
      create: {
        slug: site.slug,
        name: site.name,
        url: site.url,
        kind: site.kind,
        country: site.country,
        language: site.language,
        description: site.description,
        isDefault: site.isDefault ?? false,
        position: site.position,
      },
      update: {
        name: site.name,
        url: site.url,
        kind: site.kind,
        country: site.country,
        language: site.language,
        description: site.description,
        isDefault: site.isDefault ?? false,
        position: site.position,
      },
    });
  }

  // --- Compte propriétaire ---------------------------------------------------
  // Identifiants volontairement neutres : ils sont affichés sur l'écran de
  // connexion sous forme de rappel de format, et doivent être changés.
  const email = process.env.OWNER_EMAIL ?? 'dev@jobradar.local';
  const password = process.env.OWNER_PASSWORD ?? 'ChangeMoi123!';

  console.log('→ Compte propriétaire…');
  const existingOwner = await prisma.user.findUnique({ where: { email } });
  const owner =
    existingOwner ??
    (await prisma.user.create({
      data: {
        email,
        fullName: 'Compte propriétaire',
        // Mot de passe généré une seule fois ; la valeur n'est pas réutilisée.
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
      },
    }));

  // Profil de recherche vide, à compléter dans l'interface.
  const profile = await prisma.profile.upsert({
    where: { userId: owner.id },
    create: {
      userId: owner.id,
      headline: '',
      locationCity: '',
      yearsExperience: 0,
      radiusKm: 30,
      contractTypes: [],
      workModes: [],
      languages: [],
      salaryMin: 0,
      isPublished: true,
    },
    update: {},
  });

  // Sites par défaut rattachés au compte propriétaire.
  const defaults = await prisma.jobSite.findMany({ where: { isDefault: true, isActive: true } });
  for (const site of defaults) {
    await prisma.userJobSite.upsert({
      where: { userId_jobSiteId: { userId: owner.id, jobSiteId: site.id } },
      create: { userId: owner.id, jobSiteId: site.id, isActive: true },
      update: {},
    });
  }

  const [skills, sites, followed, offers, bookmarks, users] = await Promise.all([
    prisma.skill.count(),
    prisma.jobSite.count(),
    prisma.userJobSite.count(),
    prisma.jobOffer.count(),
    prisma.bookmark.count(),
    prisma.user.count(),
  ]);

  console.log('');
  console.log(`✅ Référentiel prêt : ${skills} compétences, ${sites} sites d’emploi.`);
  console.log(`   Compte propriétaire : ${owner.email} (profil ${profile.id.slice(0, 8)}…)`);
  console.log(`   ${followed} site(s) suivi(s) rattaché(s) à ce compte.`);
  console.log(`   Catalogue : ${offers} offre(s), ${bookmarks} suivi(s), ${users} compte(s).`);
  console.log('');
  console.log('   Aucune donnée de démonstration : le catalogue se remplit via');
  console.log('   « Actualiser les offres » (Remotive, France Travail) ou vos ajouts.');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Seed en échec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
