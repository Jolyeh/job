import { parseSalary } from '../providers/salary/parse-salary';

describe('parseSalary', () => {
  it('annualise un salaire mensuel', () => {
    expect(parseSalary('2 500 - 3 000 € brut/mois')).toEqual({ min: 30000, max: 36000 });
  });

  it('lit un salaire annuel simple', () => {
    expect(parseSalary('45 000 € par an')).toEqual({ min: 45000, max: null });
  });

  it('annualise un TJM', () => {
    expect(parseSalary('550 € / jour')).toEqual({ min: 119900, max: null });
  });

  it('renvoie null sans montant exploitable', () => {
    expect(parseSalary('Selon profil')).toBeNull();
    expect(parseSalary(undefined)).toBeNull();
  });
});
