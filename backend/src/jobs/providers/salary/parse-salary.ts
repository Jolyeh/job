/**
 * Extrait une fourchette de salaire annuelle (brute, en euros) depuis un libellé
 * libre renvoyé par une API d'offres : « 2 500 - 3 000 € brut/mois »,
 * « 45 000 € par an », « 550 € / jour ».
 */
export function parseSalary(
  label?: string,
): { min: number | null; max: number | null } | null {
  if (!label) return null;

  const numbers = [...label.matchAll(/(\d[\d\s.]{2,})/g)]
    .map((match) => Number(match[1].replace(/[\s.]/g, '')))
    .filter((value) => Number.isFinite(value) && value >= 300);

  if (numbers.length === 0) return null;

  // Périodicité → facteur d'annualisation.
  const isDaily = /jour|day|tjm/i.test(label);
  const isMonthly = /mois|month/i.test(label);
  const factor = isDaily ? 218 : isMonthly ? 12 : 1;

  return {
    min: Math.round(numbers[0] * factor),
    max: numbers.length > 1 ? Math.round(numbers[1] * factor) : null,
  };
}
