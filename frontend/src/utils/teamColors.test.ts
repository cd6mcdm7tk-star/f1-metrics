import { describe, expect, it } from 'vitest';
import { contrastRatio, inkOn, teamColor, teammateColors } from './teamColors';

describe('teamColor', () => {
  it('matches team names as the data sources spell them', () => {
    expect(teamColor('Red Bull Racing')).toBe('#3671C6');
    expect(teamColor('RB F1 Team')).toBe('#527AFF');
    expect(teamColor('Haas F1 Team')).toBe('#555555');
    expect(teamColor('Kick Sauber')).toBe('#008D00');
  });

  it('knows the 2018-2020 teams', () => {
    expect(teamColor('Racing Point')).toBe('#c40086');
    expect(teamColor('Force India')).toBe('#c40086');
    expect(teamColor('Renault')).toBe('#796600');
    expect(teamColor('Toro Rosso')).toBe('#527AFF');
  });

  it('falls back to a visible grey', () => {
    expect(teamColor('Unknown')).toBe('#555555');
  });
});

describe('text on a team colour', () => {
  const teams = ['Red Bull', 'Racing Bulls', 'Ferrari', 'Mercedes', 'McLaren', 'Alpine', 'Aston Martin', 'Haas', 'Sauber',
    'Alfa Romeo', 'Williams', 'Cadillac', 'Audi', 'Racing Point', 'Renault', 'Unknown'];
  const seconds = Object.values(teammateColors(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2'], (a, b) => a[0] === b[0]));

  it('reads at 4.5:1 or more on every team and teammate colour', () => {
    for (const color of [...teams.map(teamColor), ...seconds]) expect(contrastRatio(color, inkOn(color))).toBeGreaterThanOrEqual(4.5);
  });

  it('measures contrast as WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  });
});

describe('teammateColors', () => {
  const teams: Record<string, string> = { NOR: 'McLaren', PIA: 'McLaren', LEC: 'Ferrari', HAM: 'Ferrari', VER: 'Red Bull' };
  const areTeammates = (a: string, b: string) => teams[a] === teams[b];

  it('gives each team that needs one its own second colour', () => {
    expect(teammateColors(['NOR', 'PIA', 'VER', 'LEC', 'HAM'], areTeammates)).toEqual({ PIA: '#000000', HAM: '#6B2D8E' });
  });

  it('ignores a driver listed again for another lap', () => {
    expect(teammateColors(['NOR', 'PIA', 'NOR'], areTeammates)).toEqual({ PIA: '#000000' });
  });
});
