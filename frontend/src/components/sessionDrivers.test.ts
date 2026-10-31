import { describe, expect, it } from 'vitest';
import type { SessionDriver } from '../types/session';
import { inSession, pairInSession } from './sessionDrivers';

const field = (...codes: string[]): SessionDriver[] => codes.map(code => ({ abbreviation: code, number: '', team: '', fullName: code }));
const bahrain2023 = field('VER', 'PER', 'LEC', 'SAI', 'ALO');

describe('a selection carried into another session', () => {
  it('drops the drivers who were not in it and keeps the others in order', () => {
    expect(inSession(['ANT', 'VER', 'PER'], bahrain2023)).toEqual(['VER', 'PER']);
    expect(inSession(['ANT'], bahrain2023)).toEqual([]);
  });

  it('keeps each default driver who took part, and fills in for the others', () => {
    expect(pairInSession(['ANT', 'VER'], bahrain2023)).toEqual(['PER', 'VER']);
    expect(pairInSession(['VER', 'LEC'], bahrain2023)).toEqual(['VER', 'LEC']);
    expect(pairInSession(['', ''], bahrain2023)).toEqual(['VER', 'PER']);
    expect(pairInSession(['ANT', 'COL'], field('VER'))).toEqual(['VER', '']);
  });
});
