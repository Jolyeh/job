import { detectLanguage } from './skill-extractor';

describe('detectLanguage', () => {
  it('reconnaît le français', () => {
    expect(
      detectLanguage(
        "Nous recherchons un développeur pour rejoindre notre équipe. Vous serez en charge des missions suivantes : concevoir et maintenir l'application. Votre profil : expérience de 3 ans, compétences en Angular. Le poste est basé à Paris, avec un contrat en CDI et un salaire attractif.",
      ),
    ).toBe('FR');
  });

  it('reconnaît l’anglais', () => {
    expect(
      detectLanguage(
        'We are looking for a developer to join our team. You will be responsible for building and maintaining the application. Requirements: 3 years of experience with Angular. The role is based in Paris, with a full time contract and a competitive salary.',
      ),
    ).toBe('EN');
  });

  it('retombe sur le français quand le texte est vide', () => {
    expect(detectLanguage('')).toBe('FR');
  });
});
