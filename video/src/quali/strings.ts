// The qualifying recap's words on screen, in each language
import type { Lang } from '../i18n';

export const QUALI_STRINGS = {
  fr: {
    series: 'Les qualifs',
    meta: (round: number) => `Manche ${round} · Qualifications`,
    grid: 'La grille',
    gridTitle: 'Le top 10, en écart à la pole',
    pole: 'Pole',
    within: (count: number, gap: string) => `${count} pilotes en moins de ${gap}`,
    sectors: 'Les secteurs',
    sectorsTitle: 'Le plus rapide de chaque secteur',
    sector: (k: number) => `Secteur ${k}`,
    ideal: 'Tour idéal',
    idealDetail: (gap: string) => `${gap} sous la pole`,
    teammates: 'Les duels internes',
    teammatesTitle: 'Même voiture, même séance',
  },
  en: {
    series: 'Qualifying',
    meta: (round: number) => `Round ${round} · Qualifying`,
    grid: 'The grid',
    gridTitle: 'The top 10, by gap to pole',
    pole: 'Pole',
    within: (count: number, gap: string) => `${count} drivers within ${gap}`,
    sectors: 'The sectors',
    sectorsTitle: 'The quickest in each sector',
    sector: (k: number) => `Sector ${k}`,
    ideal: 'Ideal lap',
    idealDetail: (gap: string) => `${gap} under pole`,
    teammates: 'Teammates',
    teammatesTitle: 'Same car, same session',
  },
} satisfies Record<Lang, unknown>;
