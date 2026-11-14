import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { APP_ICONS } from '../shared/ui/lucide-icons';
import { AppShellComponent } from './app-shell.component';

/**
 * Vérifie les deux points corrigés dans le shell :
 *  1. la barre latérale est **fixe** en desktop (`lg:sticky` + `lg:h-dvh`,
 *     et plus de `lg:static` qui la faisait défiler avec le contenu) ;
 *  2. l'ordre de navigation place le **tableau de bord avant les offres**.
 */
describe('AppShellComponent', () => {
  beforeEach(async () => {
    localStorage.setItem('jobradar.lang', 'fr');
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
      ],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('colle la barre latérale (sticky, hauteur d’écran, plus de static)', () => {
    const aside = render().querySelector('aside');
    expect(aside).toBeTruthy();

    const classes = aside!.className;
    expect(classes).toContain('lg:sticky');
    expect(classes).toContain('lg:top-0');
    expect(classes).toContain('lg:h-dvh');
    // Régression : `lg:static` faisait « bouger » la barre au défilement.
    expect(classes).not.toContain('lg:static');
  });

  it('place le tableau de bord avant les offres dans la navigation', () => {
    const links = Array.from(render().querySelectorAll('nav a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(links[0]).toBe('/app/dashboard');
    expect(links[1]).toBe('/app/jobs');
    expect(links).toContain('/app/sites');
  });

  it('expose la navigation en français puis bascule en anglais', () => {
    const element = render();
    const labels = () =>
      Array.from(element.querySelectorAll('nav a')).map((link) =>
        (link.textContent ?? '').trim(),
      );

    expect(labels()[0]).toContain('Tableau de bord');

    const englishButton = Array.from(element.querySelectorAll('button')).find(
      (button) => (button.textContent ?? '').trim() === 'EN',
    );
    expect(englishButton).toBeTruthy();
    englishButton!.click();
    TestBed.tick();

    expect(labels()[0]).toContain('Dashboard');
  });
});
