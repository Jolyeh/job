/**
 * Extraction et normalisation des compétences à partir d'un texte libre.
 * ---------------------------------------------------------------------------
 * Utilisé par tous les providers pour transformer la description d'une offre
 * (souvent du HTML d'API) en compétences structurées, référentiel unique
 * partagé avec les profils utilisateurs (`skills.slug`).
 */

export interface SkillDefinition {
  slug: string;
  label: string;
  category: string;
  /** Variantes acceptées dans les libellés/descriptions. */
  aliases: string[];
}

export const SKILL_CATALOG: SkillDefinition[] = [
  // Frontend
  { slug: 'angular', label: 'Angular', category: 'frontend', aliases: ['angularjs', 'angular 2+', 'ng'] },
  { slug: 'react', label: 'React', category: 'frontend', aliases: ['reactjs', 'react.js'] },
  { slug: 'vue', label: 'Vue.js', category: 'frontend', aliases: ['vuejs', 'vue.js', 'nuxt'] },
  { slug: 'typescript', label: 'TypeScript', category: 'frontend', aliases: ['ts'] },
  { slug: 'javascript', label: 'JavaScript', category: 'frontend', aliases: ['js', 'es6'] },
  { slug: 'html', label: 'HTML', category: 'frontend', aliases: ['html5'] },
  { slug: 'css', label: 'CSS', category: 'frontend', aliases: ['css3', 'scss', 'sass'] },
  { slug: 'tailwind', label: 'Tailwind CSS', category: 'frontend', aliases: ['tailwindcss', 'tailwind css'] },
  { slug: 'rxjs', label: 'RxJS', category: 'frontend', aliases: ['reactivex'] },
  { slug: 'nextjs', label: 'Next.js', category: 'frontend', aliases: ['nextjs', 'next.js'] },

  // Backend
  { slug: 'nestjs', label: 'NestJS', category: 'backend', aliases: ['nest', 'nest.js'] },
  { slug: 'nodejs', label: 'Node.js', category: 'backend', aliases: ['node', 'node.js', 'nodejs'] },
  { slug: 'express', label: 'Express', category: 'backend', aliases: ['expressjs', 'express.js'] },
  { slug: 'java', label: 'Java', category: 'backend', aliases: ['java 17', 'jdk'] },
  { slug: 'spring-boot', label: 'Spring Boot', category: 'backend', aliases: ['spring', 'springboot'] },
  { slug: 'python', label: 'Python', category: 'backend', aliases: ['py'] },
  { slug: 'django', label: 'Django', category: 'backend', aliases: [] },
  { slug: 'fastapi', label: 'FastAPI', category: 'backend', aliases: [] },
  { slug: 'csharp', label: 'C#', category: 'backend', aliases: ['csharp', '.net', 'dotnet', 'asp.net'] },
  { slug: 'php', label: 'PHP', category: 'backend', aliases: ['symfony', 'laravel'] },
  { slug: 'go', label: 'Go', category: 'backend', aliases: ['golang'] },
  { slug: 'graphql', label: 'GraphQL', category: 'backend', aliases: ['apollo'] },

  // Données
  { slug: 'postgresql', label: 'PostgreSQL', category: 'data', aliases: ['postgres', 'psql'] },
  { slug: 'mysql', label: 'MySQL', category: 'data', aliases: ['mariadb'] },
  { slug: 'mongodb', label: 'MongoDB', category: 'data', aliases: ['mongo'] },
  { slug: 'redis', label: 'Redis', category: 'data', aliases: [] },
  { slug: 'prisma', label: 'Prisma', category: 'data', aliases: ['prisma orm'] },
  { slug: 'sql', label: 'SQL', category: 'data', aliases: [] },
  { slug: 'elasticsearch', label: 'Elasticsearch', category: 'data', aliases: ['opensearch', 'elk'] },
  { slug: 'kafka', label: 'Kafka', category: 'data', aliases: [] },
  { slug: 'spark', label: 'Spark', category: 'data', aliases: ['pyspark'] },
  { slug: 'dbt', label: 'dbt', category: 'data', aliases: [] },

  // Cloud / DevOps
  { slug: 'docker', label: 'Docker', category: 'devops', aliases: ['containers'] },
  { slug: 'kubernetes', label: 'Kubernetes', category: 'devops', aliases: ['k8s'] },
  { slug: 'aws', label: 'AWS', category: 'devops', aliases: ['amazon web services', 'ec2'] },
  { slug: 'azure', label: 'Azure', category: 'devops', aliases: [] },
  { slug: 'gcp', label: 'Google Cloud', category: 'devops', aliases: ['gcp', 'google cloud platform'] },
  { slug: 'terraform', label: 'Terraform', category: 'devops', aliases: ['iac'] },
  { slug: 'ci-cd', label: 'CI/CD', category: 'devops', aliases: ['gitlab ci', 'github actions', 'jenkins', 'circleci'] },
  { slug: 'linux', label: 'Linux', category: 'devops', aliases: ['unix'] },
  { slug: 'git', label: 'Git', category: 'devops', aliases: ['github', 'gitlab'] },

  // Data science / IA
  { slug: 'machine-learning', label: 'Machine Learning', category: 'ia', aliases: ['ml', 'apprentissage automatique'] },
  { slug: 'pytorch', label: 'PyTorch', category: 'ia', aliases: [] },
  { slug: 'tensorflow', label: 'TensorFlow', category: 'ia', aliases: [] },
  { slug: 'nlp', label: 'NLP', category: 'ia', aliases: ['traitement du langage'] },
  { slug: 'llm', label: 'LLM', category: 'ia', aliases: ['ia générative', 'openai', 'rag'] },

  // Méthodes & soft skills
  { slug: 'agile', label: 'Agile / Scrum', category: 'methodo', aliases: ['scrum', 'kanban', 'safe'] },
  { slug: 'tdd', label: 'TDD', category: 'methodo', aliases: ['test driven development', 'jest', 'vitest', 'junit'] },
  { slug: 'microservices', label: 'Microservices', category: 'methodo', aliases: ['micro-services'] },
  { slug: 'rest-api', label: 'API REST', category: 'methodo', aliases: ['rest', 'api rest', 'openapi', 'swagger'] },
  { slug: 'architecture', label: 'Architecture logicielle', category: 'methodo', aliases: ['architecte', 'ddd', 'hexagonale', 'clean architecture'] },
  { slug: 'accessibilite', label: 'Accessibilité (a11y)', category: 'methodo', aliases: ['a11y', 'rgaa', 'wcag'] },

  // Métier
  { slug: 'product-management', label: 'Product Management', category: 'metier', aliases: ['product owner', 'po'] },
  { slug: 'ux-design', label: 'UX Design', category: 'metier', aliases: ['figma', 'ux', 'ui design'] },
  { slug: 'data-analysis', label: 'Analyse de données', category: 'metier', aliases: ['data analyst', 'power bi', 'tableau'] },
  { slug: 'cybersecurite', label: 'Cybersécurité', category: 'metier', aliases: ['sécurité', 'pentest', 'owasp', 'soc'] },
];

const CATALOG_BY_SLUG = new Map(SKILL_CATALOG.map((skill) => [skill.slug, skill]));

/** Résout une saisie libre ("Nest.JS", "postgres") vers une compétence du référentiel. */
export function resolveSkill(raw: string): SkillDefinition | null {
  const normalized = normalizeSkillInput(raw);
  if (!normalized) return null;

  const direct = CATALOG_BY_SLUG.get(normalized);
  if (direct) return direct;

  for (const skill of SKILL_CATALOG) {
    if (skill.label.toLowerCase() === raw.trim().toLowerCase()) return skill;
    if (skill.aliases.some((alias) => normalizeSkillInput(alias) === normalized)) {
      return skill;
    }
  }
  return null;
}

/** Compétence hors référentiel : on la conserve en "custom" plutôt que la perdre. */
export function toSkillDefinition(raw: string): SkillDefinition {
  const resolved = resolveSkill(raw);
  if (resolved) return resolved;

  const label = raw.trim().replace(/\s+/g, ' ');
  return {
    slug: normalizeSkillInput(label).replace(/\s+/g, '-'),
    label,
    category: 'custom',
    aliases: [],
  };
}

function normalizeSkillInput(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Détecte les compétences présentes dans un texte.
 * `requiredSlugs` permet de marquer comme obligatoires les compétences listées
 * explicitement par la source (tags, "compétences requises"…).
 */
export function extractSkills(
  text: string,
  requiredSlugs: string[] = [],
): Array<{ slug: string; label: string; required: boolean }> {
  const haystack = ` ${normalizeSkillInput(stripHtml(text))} `;
  const found = new Map<string, { slug: string; label: string; required: boolean }>();

  for (const skill of SKILL_CATALOG) {
    const needles = [skill.label, ...skill.aliases].map(normalizeSkillInput);
    const isPresent = needles.some((needle) => {
      if (!needle) return false;
      // Recherche sur mot entier : "go" ne doit pas matcher "algorithmique".
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i').test(haystack);
    });

    const explicitlyRequired = requiredSlugs.includes(skill.slug);
    if (isPresent || explicitlyRequired) {
      found.set(skill.slug, {
        slug: skill.slug,
        label: skill.label,
        required: explicitlyRequired,
      });
    }
  }

  return [...found.values()];
}
