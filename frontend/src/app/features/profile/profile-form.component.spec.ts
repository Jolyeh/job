import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { Profile } from '../../core/models/api.models';
import { APP_ICONS } from '../../shared/ui/lucide-icons';
import { ProfileFormComponent } from './profile-form.component';

const profile: Profile = {
  id: 'p1',
  headline: 'Développeuse Full-Stack Angular',
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
  bio: 'Profil de test.',
  isPublished: true,
  lastSearchAt: null,
  skills: [
    { slug: 'angular', label: 'Angular', category: 'frontend', weight: 5, years: 4 },
    { slug: 'nestjs', label: 'NestJS', category: 'backend', weight: 4, years: 3 },
    { slug: 'typescript', label: 'TypeScript', category: 'frontend', weight: 5, years: 4 },
  ],
  completeness: 85,
  updatedAt: new Date().toISOString(),
};

describe('ProfileFormComponent', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function render(initial: Profile | null) {
    const fixture = TestBed.createComponent(ProfileFormComponent);
    fixture.componentRef.setInput('profile', initial);
    fixture.detectChanges();

    // Le composant charge le référentiel de compétences au montage.
    const request = httpTesting.expectOne('/api/skills');
    request.flush([
      { slug: 'angular', label: 'Angular', category: 'frontend', usage: 12 },
      { slug: 'docker', label: 'Docker', category: 'devops', usage: 8 },
    ]);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('préremplit le formulaire depuis le profil existant', () => {
    const { element } = render(profile);
    const headline = element.querySelector<HTMLInputElement>('#headline');
    const city = element.querySelector<HTMLInputElement>('#locationCity');

    expect(headline?.value).toBe('Développeuse Full-Stack Angular');
    expect(city?.value).toBe('Paris');
    expect(element.textContent).toContain('Angular');
    expect(element.textContent).toContain('NestJS');
  });

  it('affiche une erreur quand un champ obligatoire est vidé', () => {
    const { fixture, element } = render(profile);

    const headline = element.querySelector<HTMLInputElement>('#headline')!;
    headline.value = '';
    headline.dispatchEvent(new Event('input', { bubbles: true }));
    headline.dispatchEvent(new Event('blur', { bubbles: true }));
    headline.dispatchEvent(new Event('focusout', { bubbles: true }));
    fixture.detectChanges();

    expect(element.textContent).toContain("L'intitulé de poste est requis");
  });

  it('ajoute une compétence depuis les suggestions', () => {
    const { element } = render(profile);

    const addButton = Array.from(element.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').trim().startsWith('Docker'),
    );
    expect(addButton).toBeTruthy();
    addButton?.click();
    TestBed.tick();

    const weights = element.textContent ?? '';
    expect(weights).toContain('Docker');
  });
});
