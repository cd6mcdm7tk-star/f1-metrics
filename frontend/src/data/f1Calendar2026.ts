/**
 * METRIK DELTA - F1 2026 Calendar
 * Complete calendar with all races and sessions
 */

export interface F1Session {
  name: string;
  date: Date;
  type: 'FP1' | 'FP2' | 'FP3' | 'Sprint' | 'Sprint Shootout' | 'Qualifying' | 'Race';
}

export interface F1Race {
  round: number;
  country: string;
  circuit: string;
  city: string;
  flag: string; // emoji flag
  sessions: F1Session[];
}

// Calendrier F1 2026 (dates estimées basées sur le calendrier habituel)
export const F1_2026_CALENDAR: F1Race[] = [
  {
    round: 1,
    country: 'Australia',
    circuit: 'Albert Park Circuit',
    city: 'Melbourne',
    flag: '🇦🇺',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-03-13T03:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-03-13T07:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-03-14T03:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-03-14T07:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-03-15T05:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 2,
    country: 'China',
    circuit: 'Shanghai International Circuit',
    city: 'Shanghai',
    flag: '🇨🇳',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-03-20T03:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-03-20T07:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-03-21T03:30:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-03-21T07:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-03-22T06:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 3,
    country: 'Japan',
    circuit: 'Suzuka Circuit',
    city: 'Suzuka',
    flag: '🇯🇵',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-04-03T02:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-04-03T06:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-04-04T02:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-04-04T06:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-04-05T05:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 4,
    country: 'Bahrain',
    circuit: 'Bahrain International Circuit',
    city: 'Sakhir',
    flag: '🇧🇭',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-04-17T12:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-04-17T16:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-04-18T13:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-04-18T17:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-04-19T15:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 5,
    country: 'Saudi Arabia',
    circuit: 'Jeddah Corniche Circuit',
    city: 'Jeddah',
    flag: '🇸🇦',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-04-24T14:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-04-24T18:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-04-25T14:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-04-25T18:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-04-26T17:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 6,
    country: 'Miami',
    circuit: 'Miami International Autodrome',
    city: 'Miami',
    flag: '🇺🇸',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-05-01T18:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-05-01T22:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-05-02T18:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-05-02T22:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-05-03T19:30:00Z'), type: 'Race' },
    ],
  },
  {
    round: 7,
    country: 'Italy',
    circuit: 'Autodromo Enzo e Dino Ferrari',
    city: 'Imola',
    flag: '🇮🇹',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-05-15T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-05-15T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-05-16T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-05-16T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-05-17T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 8,
    country: 'Monaco',
    circuit: 'Circuit de Monaco',
    city: 'Monte Carlo',
    flag: '🇲🇨',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-05-22T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-05-22T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-05-23T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-05-23T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-05-24T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 9,
    country: 'Spain',
    circuit: 'Circuit de Barcelona-Catalunya',
    city: 'Barcelona',
    flag: '🇪🇸',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-05-29T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-05-29T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-05-30T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-05-30T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-05-31T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 10,
    country: 'Canada',
    circuit: 'Circuit Gilles Villeneuve',
    city: 'Montreal',
    flag: '🇨🇦',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-06-12T17:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-06-12T21:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-06-13T16:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-06-13T20:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-06-14T18:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 11,
    country: 'Austria',
    circuit: 'Red Bull Ring',
    city: 'Spielberg',
    flag: '🇦🇹',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-06-26T10:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-06-26T14:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-06-27T10:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-06-27T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-06-28T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 12,
    country: 'Great Britain',
    circuit: 'Silverstone Circuit',
    city: 'Silverstone',
    flag: '🇬🇧',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-07-03T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-07-03T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-07-04T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-07-04T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-07-05T14:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 13,
    country: 'Belgium',
    circuit: 'Circuit de Spa-Francorchamps',
    city: 'Spa',
    flag: '🇧🇪',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-07-24T11:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-07-24T15:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-07-25T11:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-07-25T15:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-07-26T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 14,
    country: 'Hungary',
    circuit: 'Hungaroring',
    city: 'Budapest',
    flag: '🇭🇺',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-07-31T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-07-31T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-08-01T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-08-01T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-08-02T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 15,
    country: 'Netherlands',
    circuit: 'Circuit Zandvoort',
    city: 'Zandvoort',
    flag: '🇳🇱',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-08-28T10:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-08-28T14:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-08-29T09:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-08-29T13:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-08-30T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 16,
    country: 'Italy',
    circuit: 'Autodromo Nazionale di Monza',
    city: 'Monza',
    flag: '🇮🇹',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-09-04T11:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-09-04T15:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-09-05T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-09-05T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-09-06T13:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 17,
    country: 'Azerbaijan',
    circuit: 'Baku City Circuit',
    city: 'Baku',
    flag: '🇦🇿',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-09-11T10:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-09-11T14:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-09-12T09:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-09-12T13:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-09-13T11:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 18,
    country: 'Singapore',
    circuit: 'Marina Bay Street Circuit',
    city: 'Singapore',
    flag: '🇸🇬',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-09-18T10:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-09-18T14:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-09-19T10:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-09-19T14:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-09-20T12:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 19,
    country: 'USA',
    circuit: 'Circuit of the Americas',
    city: 'Austin',
    flag: '🇺🇸',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-10-16T18:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-10-16T22:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-10-17T19:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-10-17T23:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-10-18T19:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 20,
    country: 'Mexico',
    circuit: 'Autódromo Hermanos Rodríguez',
    city: 'Mexico City',
    flag: '🇲🇽',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-10-23T19:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-10-23T23:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-10-24T18:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-10-24T22:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-10-25T20:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 21,
    country: 'Brazil',
    circuit: 'Autódromo José Carlos Pace',
    city: 'São Paulo',
    flag: '🇧🇷',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-11-06T14:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-11-06T18:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-11-07T15:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-11-07T19:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-11-08T17:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 22,
    country: 'USA',
    circuit: 'Las Vegas Street Circuit',
    city: 'Las Vegas',
    flag: '🇺🇸',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-11-20T06:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-11-20T10:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-11-21T06:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-11-21T10:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-11-22T06:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 23,
    country: 'Qatar',
    circuit: 'Losail International Circuit',
    city: 'Lusail',
    flag: '🇶🇦',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-11-27T13:30:00Z'), type: 'FP1' },
      { name: 'Sprint Shootout', date: new Date('2026-11-27T17:30:00Z'), type: 'Sprint Shootout' },
      { name: 'Sprint', date: new Date('2026-11-28T13:00:00Z'), type: 'Sprint' },
      { name: 'Qualifying', date: new Date('2026-11-28T17:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-11-29T15:00:00Z'), type: 'Race' },
    ],
  },
  {
    round: 24,
    country: 'UAE',
    circuit: 'Yas Marina Circuit',
    city: 'Abu Dhabi',
    flag: '🇦🇪',
    sessions: [
      { name: 'Free Practice 1', date: new Date('2026-12-04T10:30:00Z'), type: 'FP1' },
      { name: 'Free Practice 2', date: new Date('2026-12-04T14:00:00Z'), type: 'FP2' },
      { name: 'Free Practice 3', date: new Date('2026-12-05T11:30:00Z'), type: 'FP3' },
      { name: 'Qualifying', date: new Date('2026-12-05T15:00:00Z'), type: 'Qualifying' },
      { name: 'Race', date: new Date('2026-12-06T13:00:00Z'), type: 'Race' },
    ],
  },
];

/**
 * Get next upcoming session
 */
export function getNextSession(): { race: F1Race; session: F1Session } | null {
  const now = new Date();

  for (const race of F1_2026_CALENDAR) {
    for (const session of race.sessions) {
      if (session.date > now) {
        return { race, session };
      }
    }
  }

  return null; // Season finished
}

/**
 * Get all upcoming sessions for a race
 */
export function getUpcomingSessions(race: F1Race): F1Session[] {
  const now = new Date();
  return race.sessions.filter(session => session.date > now);
}

/**
 * Calculate time remaining until session
 */
export function getTimeRemaining(targetDate: Date) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}