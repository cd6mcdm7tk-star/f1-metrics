import { describe, expect, it } from 'vitest';
import { teamColor, teammateColors } from './teamColors';

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
