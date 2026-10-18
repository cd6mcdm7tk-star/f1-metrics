import { describe, expect, it } from 'vitest';
import { analyse } from '../duel/analysis';
import { qualiFacts } from './facts';
import { quali } from './fixture';
import { buildQuali, defaultNarration, type QualiNarration } from './story';

const facts = qualiFacts(quali);
const analysis = analyse(quali.duel);
const story = buildQuali(quali, facts, analysis, 'fr');

describe('defaultNarration', () => {
  it('tells the session from its facts', () => {
    const fr = defaultNarration(facts, 'fr');
    expect(fr.grid).toBe('Aaa en pole, Ccc à 50 millièmes. 3 pilotes en moins d’une demi-seconde.');
    expect(fr.sectors).toContain('Les meilleurs secteurs de Bbb font 100 millièmes de moins que la pole.');
    expect(defaultNarration(facts, 'en').teammates).toBe('Aaa beats Bbb by 300 thousandths. Ccc beats Ddd by 550 thousandths.');
  });
});

describe('buildQuali', () => {
  it('runs the scenes back to back, the mascot first and last', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['cover', 'grid', 'lap', 'sectors', 'teammates', 'verdict']);
    story.scenes.slice(1).forEach((scene, i) => expect(scene.from).toBe(story.scenes[i].to));
    expect(story.frames).toBe(story.scenes.at(-1)!.to);
    expect(story.outro).toBe(story.voice.at(-1)!.from - 10);
  });

  it('fills the grid from the back, pole last', () => {
    expect(story.grid).toHaveLength(facts.gaps.length);
    expect(Math.max(...story.grid)).toBe(story.grid[0]);
    for (let i = 2; i < story.grid.length; i++) expect(story.grid[i]).toBeLessThan(story.grid[i - 1]);
  });

  it('tells the pole lap on the page inside its scene, its corner zoomed onto', () => {
    const lap = story.scenes.find(s => s.kind === 'lap')!;
    expect(story.page.zooms.map(z => z.label)).toEqual(['T1']);
    expect(story.page.beats.every(b => b.from >= lap.from && b.to <= lap.to)).toBe(true);
    expect(story.page.chapters).toEqual([expect.objectContaining({ label: 'Virage 1', index: 1, total: 1 })]);
  });

  it('brings the ideal lap up as the voice puts the sectors together', () => {
    const narration: QualiNarration = { ...defaultNarration(facts, 'fr'), sectors: 'Le deuxième secteur est à Bbb. Mis bout à bout, ses secteurs battent la pole.' };
    const told = buildQuali(quali, facts, analysis, 'fr', narration);
    const line = told.voice.find(l => l.text.startsWith('Le deuxième'))!;
    expect(told.ideal).toBe(line.said.find(w => w.word.startsWith('bout'))!.start);
    expect(told.ideal!).toBeGreaterThan(Math.max(...told.sectors));
  });
});
