// Liste des GP avec Sprint par année
export const SPRINT_WEEKENDS: { [year: number]: number[] } = {
  2021: [11, 15, 21], // Silverstone, Monza, São Paulo
  2022: [4, 11, 22], // Imola, Red Bull Ring, São Paulo
  2023: [4, 10, 13, 18, 19, 21], // Azerbaijan, Austria, Belgium, Qatar, USA, São Paulo
  2024: [5, 6, 11, 19, 21, 23], // China, Miami, Austria, USA, Brazil, Qatar
  2025: [2, 6, 13, 19, 21, 23], // China, Miami, Belgium, USA, Brazil, Qatar
  2026: [2, 6, 7, 11, 14, 18], // China, Miami, Canada, Britain, Netherlands, Singapore
};

// Fonction helper pour vérifier si un GP a un Sprint
export const hasSprintWeekend = (year: number, round: number): boolean => {
  return SPRINT_WEEKENDS[year]?.includes(round) || false;
};

// Noms des sessions Sprint
export const SPRINT_SESSIONS = [
  { value: 'SQ', label: 'Sprint Shootout', icon: '🏁' },
  { value: 'S', label: 'Sprint', icon: '⚡' }
];