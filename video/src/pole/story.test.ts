import { describe, expect, it } from 'vitest';
import narration from '../../narration/2026-austin-pole.fr.json';
import type { PoleDriver } from './data';
import { buildPole, POLE_BEATS } from './story';

const names = ['Antonelli', 'Verstappen', 'Hadjar', 'Leclerc', 'Hamilton', 'Russell'];
const drivers = names.map((name, i): PoleDriver => ({
  code: name.slice(0, 3).toUpperCase(), name, team: '', color: '#fff', position: i + 1, segments: [null, null, 94 + i / 10], lap: 1, time: 94 + i / 10, sectors: [null, null, null],
}));

describe('the qualifying video', () => {
  const story = buildPole(narration, drivers, 'fr', null);

  it('says every beat in order and lasts 60 to 80 seconds', () => {
    expect(story.voice).toHaveLength(POLE_BEATS.length);
    story.voice.slice(1).forEach((line, i) => expect(line.from).toBeGreaterThan(story.voice[i].to));
    expect(story.frames / 60).toBeGreaterThanOrEqual(60);
    expect(story.frames / 60).toBeLessThanOrEqual(85);
  });

  it('names the grid from sixth to pole, inside its line', () => {
    const { from, to } = story.beats.grid;
    expect(story.named.every(frame => frame >= from && frame <= to)).toBe(true);
    expect([...story.named].reverse()).toEqual([...story.named].sort((a, b) => a - b));
  });

  it('cuts its scenes back to back', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['hook', 'grid', 'lap', 'proof', 'details', 'sectors', 'verdict']);
    story.scenes.slice(1).forEach((scene, i) => expect(scene.from).toBe(story.scenes[i].to));
  });
});
