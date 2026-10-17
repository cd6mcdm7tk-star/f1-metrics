export type Lang = 'en' | 'fr';

export const LANGS: Lang[] = ['en', 'fr'];

const SESSIONS: Record<Lang, Record<string, string>> = {
  en: { Q: 'Qualifying', R: 'Race', S: 'Sprint', SQ: 'Sprint Qualifying', FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3' },
  fr: { Q: 'Qualifications', R: 'Course', S: 'Sprint', SQ: 'Qualifs sprint', FP1: 'Essais libres 1', FP2: 'Essais libres 2', FP3: 'Essais libres 3' },
};

const ordinalEn = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const ordinalFr = (n: number) => `${n}${n === 1 ? 're' : 'e'}`;

export const STRINGS = {
  en: {
    kicker: 'Telemetry analysis',
    /** `{gap}` marks where the time gap goes */
    hook: (loser: string, winner: string) => `Where ${loser} lost {gap} to ${winner}`,
    laps: (a: string, timeA: string, b: string, gap: string) => `${a} ${timeA} · ${b} +${gap}`,
    sectors: 'Sectors',
    sectorWinners: (names: string[]) => names.map((n, i) => `S${i + 1} ${n}`).join(' · '),
    corner: (label: string) => `Turn ${label.replace('T', '')}`,
    straight: 'Straight',
    braking: (who: string, by: number) => `${who} brakes ${by} m later`,
    lifting: (who: string, by: number) => `${who} lifts ${by} m later`,
    entrySpeed: (who: string, by: number) => `${who} carries ${by} km/h more into the corner`,
    entryDetail: (by: number) => `${by} km/h more through the braking zone`,
    liftOnly: (who: string, other: string) => `${who} doesn’t brake, ${other} does`,
    apexSpeed: (who: string, by: number) => `${who} is ${by} km/h faster at the apex`,
    speeds: (a: number, b: number) => `${a} vs ${b} km/h`,
    gear: (a: string, ga: number, b: string, gb: number) => `${a} in ${ordinalEn(ga)} gear, ${b} in ${ordinalEn(gb)}`,
    throttle: (who: string, by: number) => `${who} is back on full throttle ${by} m earlier`,
    lift: (who: string) => `${who} lifts on the way out`,
    liftDetail: (gain: number, other: string, otherGain: number) => `A sign of a slide: +${gain} km/h vs +${otherGain} for ${other}`,
    exitSpeed: (who: string, by: number) => `${who} exits ${by} km/h faster`,
    exitDetail: (by: number) => `and exits ${by} km/h faster`,
    cornerSpeed: (who: string, by: number) => `${who} is quicker through the whole corner: +${by} km/h on average`,
    straightSpeed: (who: string, by: number) => `${who} is ${by} km/h quicker on the straight`,
    topSpeeds: (a: number, b: number) => `Top speed ${a} vs ${b} km/h`,
    gains: (who: string, gap: string) => `${who} gains ${gap} here`,
    even: 'It evens out',
    but: (text: string) => `But ${text}`,
    summary: 'Summary',
    winsAt: (who: string, places: string) => `${who} makes the difference ${places}`,
    clawsAt: (who: string, places: string) => `${who} claws time back ${places}`,
    dominance: 'Track dominance',
    dominanceShare: (who: string, pct: number) => `${who} is quicker over ${pct}% of the lap`,
    topSpeed: 'Top speed',
    fullThrottle: (a: number, b: number) => `Full throttle: ${a}% vs ${b}% of the lap`,
    verdict: 'Verdict',
    ahead: (who: string, gap: string) => `${who} ahead by ${gap}`,
    and: 'and',
    cta: 'Full telemetry, every session',
    series: 'The duel',
    signature: 'F1 telemetry',
    tagline: 'Speed, throttle, braking — any driver, any lap.',
  },
  fr: {
    kicker: 'Analyse télémétrie',
    hook: (loser: string, winner: string) => `Où ${loser} a perdu {gap} face à ${winner}`,
    laps: (a: string, timeA: string, b: string, gap: string) => `${a} ${timeA} · ${b} +${gap}`,
    sectors: 'Secteurs',
    sectorWinners: (names: string[]) => names.map((n, i) => `S${i + 1} ${n}`).join(' · '),
    corner: (label: string) => `Virage ${label.replace('T', '')}`,
    straight: 'Ligne droite',
    braking: (who: string, by: number) => `${who} freine ${by} m plus tard`,
    lifting: (who: string, by: number) => `${who} lève le pied ${by} m plus tard`,
    entrySpeed: (who: string, by: number) => `${who} entre avec ${by} km/h de plus`,
    entryDetail: (by: number) => `${by} km/h de plus dans la zone de freinage`,
    liftOnly: (who: string, other: string) => `${who} passe sans freiner, ${other} freine`,
    apexSpeed: (who: string, by: number) => `${who} passe ${by} km/h plus vite à la corde`,
    speeds: (a: number, b: number) => `${a} contre ${b} km/h`,
    gear: (a: string, ga: number, b: string, gb: number) => `${a} en ${ordinalFr(ga)}, ${b} en ${ordinalFr(gb)}`,
    throttle: (who: string, by: number) => `${who} remet plein gaz ${by} m plus tôt`,
    lift: (who: string) => `${who} relâche l’accélérateur en sortie`,
    liftDetail: (gain: number, other: string, otherGain: number) => `Signe d’une glisse : +${gain} km/h contre +${otherGain} pour ${other}`,
    exitSpeed: (who: string, by: number) => `${who} sort ${by} km/h plus vite`,
    exitDetail: (by: number) => `et sort ${by} km/h plus vite`,
    cornerSpeed: (who: string, by: number) => `${who} plus rapide sur tout le virage : +${by} km/h en moyenne`,
    straightSpeed: (who: string, by: number) => `${who} va ${by} km/h plus vite en ligne droite`,
    topSpeeds: (a: number, b: number) => `Vitesse de pointe : ${a} contre ${b} km/h`,
    gains: (who: string, gap: string) => `${who} y gagne ${gap}`,
    even: 'Ça s’équilibre',
    but: (text: string) => `Mais ${text}`,
    summary: 'Bilan',
    winsAt: (who: string, places: string) => `${who} fait la différence ${places}`,
    clawsAt: (who: string, places: string) => `${who} reprend du temps ${places}`,
    dominance: 'Domination du circuit',
    dominanceShare: (who: string, pct: number) => `${who} plus rapide sur ${pct} % du tour`,
    topSpeed: 'Vitesse de pointe',
    fullThrottle: (a: number, b: number) => `Plein gaz : ${a} % contre ${b} % du tour`,
    verdict: 'Verdict',
    ahead: (who: string, gap: string) => `${who} devant de ${gap}`,
    and: 'et',
    cta: 'Toute la télémétrie, chaque session',
    series: 'Le duel',
    signature: 'Télémétrie F1',
    tagline: 'Vitesse, accélérateur, freinage — chaque pilote, chaque tour.',
  },
} satisfies Record<Lang, unknown>;

/** Where things happen, with the language's prepositions: "at T1 and T13" / "au T1 et au T13" */
export function placeList(labels: string[], lang: Lang): string {
  const corners = labels.filter(l => l !== 'straight');
  const straight = labels.length > corners.length;
  const join = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} ${STRINGS[lang].and} ${items[items.length - 1]}` : items[0]);
  if (lang === 'fr') return join([...corners.map(c => `au ${c}`), ...(straight ? ['en ligne droite'] : [])]);
  const parts = [...(corners.length ? [`at ${join(corners)}`] : []), ...(straight ? ['on the straight'] : [])];
  return parts.join(' and ');
}

export const sessionName = (session: string, lang: Lang): string => SESSIONS[lang][session] ?? session;

/** 1 → "1st" / "1re", 6 → "6th" / "6e" */
export const ordinal = (n: number, lang: Lang): string => (lang === 'fr' ? ordinalFr(n) : ordinalEn(n));

const decimal = (value: string, lang: Lang) => (lang === 'fr' ? value.replace('.', ',') : value);

/** 0.084 → "0.084s" / "0,084 s" */
export const formatGap = (seconds: number, lang: Lang, digits = 3): string =>
  `${decimal(Math.abs(seconds).toFixed(digits), lang)}${lang === 'fr' ? ' s' : 's'}`;

/** 75.096 → "1:15.096" / "1:15,096" */
export function formatLapTime(seconds: number, lang: Lang): string {
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${decimal(rest, lang)}`;
}
