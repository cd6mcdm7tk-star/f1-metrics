// Liste des GP avec Sprint par année
export const SPRINT_WEEKENDS: { [year: number]: number[] } = {
  2021: [10, 14, 20], // Silverstone, Monza, São Paulo
  2022: [4, 11, 16], // Imola, Red Bull Ring, São Paulo
  2023: [4, 6, 15, 16, 19, 21], // Azerbaijan, Austria, Belgium, Qatar, USA, São Paulo
  2024: [5, 6, 11, 19, 21, 23], // China, Miami, Austria, USA, Brazil, Qatar
  2025: [5, 9, 12, 19, 21, 24], // À mettre à jour quand la FIA annonce le calendrier 2025
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