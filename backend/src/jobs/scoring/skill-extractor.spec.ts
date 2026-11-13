import {
  extractSkills,
  resolveSkill,
  stripHtml,
  toSkillDefinition,
} from './skill-extractor';

describe('skill-extractor', () => {
  it('résout les alias vers la compétence canonique', () => {
    expect(resolveSkill('Nest.JS')?.slug).toBe('nestjs');
    expect(resolveSkill('postgres')?.slug).toBe('postgresql');
    expect(resolveSkill('TS')?.slug).toBe('typescript');
  });

  it('conserve une compétence hors référentiel', () => {
    const custom = toSkillDefinition('Rust');
    expect(custom.slug).toBe('rust');
    expect(custom.category).toBe('custom');
  });

  it('extrait les compétences d’une description HTML', () => {
    const html = `<p>Nous cherchons un profil <b>Angular</b> maîtrisant
      <em>TypeScript</em>, RxJS et PostgreSQL.</p><ul><li>Docker</li><li>Git</li></ul>`;
    const skills = extractSkills(html).map((skill) => skill.slug);
    expect(skills).toEqual(
      expect.arrayContaining(['angular', 'typescript', 'rxjs', 'postgresql', 'docker', 'git']),
    );
  });

  it('ne matche pas les sous-chaînes', () => {
    const skills = extractSkills('Algorithmique avancée et gouvernance des données');
    expect(skills.map((skill) => skill.slug)).not.toContain('go');
  });

  it('marque les compétences explicitement requises', () => {
    const skills = extractSkills('Angular et Node.js', ['angular']);
    const angular = skills.find((skill) => skill.slug === 'angular');
    const node = skills.find((skill) => skill.slug === 'nodejs');
    expect(angular?.required).toBe(true);
    expect(node?.required).toBe(false);
  });

  it('nettoie le HTML en texte lisible', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b></p><br/>')).toBe('Hello world');
  });
});
