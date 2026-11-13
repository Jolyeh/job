import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { JobOffer } from '../../core/models/api.models';
import { APP_ICONS } from '../../shared/ui/lucide-icons';
import { JobCardComponent } from './job-card.component';

const offer: JobOffer = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  title: 'Développeur Full-Stack Angular / NestJS',
  company: 'Payflow',
  description: 'Description du poste',
  city: 'Paris',
  country: 'FR',
  contractType: 'CDI',
  workMode: 'HYBRID',
  experienceLevel: 'INTERMEDIATE',
  salaryMin: 48000,
  salaryMax: 58000,
  salaryCurrency: 'EUR',
  url: 'https://example.com/offre',
  applyUrl: 'https://example.com/apply',
  logoUrl: null,
  tags: ['fintech'],
  publishedAt: new Date('2026-11-10').toISOString(),
  source: 'catalog',
  skills: [
    { slug: 'angular', label: 'Angular', required: true },
    { slug: 'nestjs', label: 'NestJS', required: true },
    { slug: 'docker', label: 'Docker', required: false },
  ],
  match: {
    score: 92,
    breakdown: { skills: 88, title: 100, salary: 100, experience: 100, location: 100, contract: 100 },
    matchedSkills: ['Angular', 'NestJS'],
    missingSkills: ['Docker'],
    reasons: ['12 compétence(s) en commun : Angular, NestJS'],
    warnings: ['Compétences à renforcer : Docker'],
  },
};

describe('JobCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobCardComponent],
      providers: [
        provideRouter([]),
        { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
      ],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(JobCardComponent);
    fixture.componentRef.setInput('offer', offer);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche les informations clés de l’offre', () => {
    const element = render();
    const text = element.textContent ?? '';

    expect(text).toContain('Développeur Full-Stack Angular / NestJS');
    expect(text).toContain('Payflow');
    expect(text).toContain('Paris');
    expect(text).toContain('CDI');
    expect(text).toContain('Hybride');
  });

  it('affiche le score de matching et son anneau', () => {
    const element = render();
    const ring = element.querySelector('.score-ring');
    expect(ring).toBeTruthy();
    expect(ring?.getAttribute('aria-label')).toContain('92');
    expect(element.textContent).toContain('92');
  });

  it('met en avant les raisons et les points de vigilance', () => {
    const element = render();
    const text = element.textContent ?? '';
    expect(text).toContain('compétence(s) en commun');
    expect(text).toContain('Docker');
  });

  it('expose un lien de candidature externe sécurisé', () => {
    const element = render();
    const anchors = Array.from(element.querySelectorAll('a'));
    const applyLink = anchors.find((anchor) =>
      (anchor.textContent ?? '').includes('Postuler'),
    );
    expect(applyLink?.getAttribute('href')).toBe('https://example.com/apply');
    expect(applyLink?.getAttribute('rel')).toContain('noopener');
  });

  it('rend le bouton de sauvegarde accessible', () => {
    const element = render();
    const saveButton = element.querySelector('[aria-label="Sauvegarder cette offre"]');
    expect(saveButton).toBeTruthy();
    expect(saveButton?.getAttribute('aria-pressed')).toBe('false');
  });
});
