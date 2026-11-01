// Ergast's free-text race status, bucketed into readable retirement causes.
// From 2023, Jolpica mostly just says "Retired" — a gap in the source, shown
// as its own bucket rather than mixed into "Other".

const MECHANICAL_KEYWORDS = [
  'engine', 'gearbox', 'transmission', 'hydraulics', 'electrical', 'suspension',
  'brakes', 'clutch', 'power unit', 'turbo', 'fuel', 'oil', 'water', 'wheel',
  'puncture', 'tyre', 'steering', 'exhaust', 'battery', 'differential', 'driveshaft',
  'radiator', 'throttle', 'wing', 'mechanical', 'vibrations', 'overheating', 'cooling',
];

export type DnfCause = 'Accident' | 'Mechanical' | 'Disqualified' | 'Withdrew' | 'Retired (unspecified)' | 'Other';

export function categorizeDnf(status: string): DnfCause {
  if (/accident|collision|spun off/i.test(status)) return 'Accident';
  if (/disqualified/i.test(status)) return 'Disqualified';
  if (/did not start|withdrew|did not qualify/i.test(status)) return 'Withdrew';
  if (MECHANICAL_KEYWORDS.some(kw => status.toLowerCase().includes(kw))) return 'Mechanical';
  if (/^retired$/i.test(status.trim())) return 'Retired (unspecified)';
  return 'Other';
}

export function summarizeDnfCauses(causes: string[]): Record<DnfCause, number> {
  const counts: Record<DnfCause, number> = {
    Accident: 0, Mechanical: 0, Disqualified: 0, Withdrew: 0, 'Retired (unspecified)': 0, Other: 0,
  };
  causes.forEach(c => { counts[categorizeDnf(c)] += 1; });
  return counts;
}
