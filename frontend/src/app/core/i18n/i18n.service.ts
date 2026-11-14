import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'jobradar.lang';

/**
 * Internationalisation FR / EN.
 *
 * Choix de la langue, par ordre de priorité :
 *  1. préférence enregistrée (l'utilisateur a cliqué sur le sélecteur) ;
 *  2. langue du navigateur (`navigator.languages`) ;
 *  3. français.
 *
 * La traduction est réactive : `t()` lit un signal, donc tout template qui
 * l'appelle se rafraîchit au changement de langue. Pas de `| translate` :
 * un simple appel de méthode suffit, et le compilateur reste strict.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  private readonly langState = signal<Lang>(this.resolveInitialLang());

  /** Langue courante (signal en lecture seule). */
  readonly lang = this.langState.asReadonly();
  readonly isFrench = computed(() => this.langState() === 'fr');
  readonly otherLang = computed<Lang>(() => (this.langState() === 'fr' ? 'en' : 'fr'));

  constructor() {
    this.applyDocumentLang(this.langState());
  }

  /**
   * Traduit une clé. `params` remplace les jetons `{nom}` du gabarit.
   * Une clé inconnue est renvoyée telle quelle : plus facile à repérer qu'un
   * texte vide, et sans risque de plantage.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const dictionary = TRANSLATIONS[this.langState()];
    let value = dictionary[key] ?? TRANSLATIONS.fr[key] ?? key;

    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.split(`{${name}}`).join(String(replacement));
      }
    }
    return value;
  }

  /** Change la langue et la mémorise. */
  setLang(lang: Lang): void {
    if (lang === this.langState()) return;
    this.langState.set(lang);
    this.applyDocumentLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Mode navigation privée : la préférence ne survivra pas, sans gravité.
    }
  }

  toggle(): void {
    this.setLang(this.otherLang());
  }

  /** Étiquette courte à afficher dans le sélecteur (« FR » / « EN »). */
  label(lang: Lang): string {
    return lang.toUpperCase();
  }

  /**
   * Formate une date selon la langue courante.
   * `Intl` est utilisé directement : la locale Angular restant `fr-FR` pour
   * les pipes numériques, on garde ici le contrôle total.
   */
  formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options,
    }).format(date);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value);
  }

  locale(): string {
    return this.langState() === 'fr' ? 'fr-FR' : 'en-GB';
  }

  /**
   * Langue initiale : préférence enregistrée, puis navigateur, puis français.
   * Le sandbox et les navigateurs sans `navigator.language` retombent sur FR.
   */
  private resolveInitialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    } catch {
      /* localStorage indisponible */
    }

    const candidates =
      typeof navigator !== 'undefined'
        ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
        : [];

    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase();
      if (normalized.startsWith('fr')) return 'fr';
      if (normalized.startsWith('en')) return 'en';
    }
    return 'fr';
  }

  /** `<html lang>` + classe pour les styles dépendants de la langue. */
  private applyDocumentLang(lang: Lang): void {
    this.document.documentElement.lang = lang;
    this.document.documentElement.dataset['lang'] = lang;
  }
}
