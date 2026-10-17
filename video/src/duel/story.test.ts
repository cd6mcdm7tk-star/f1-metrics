import { describe, expect, it } from 'vitest';
import { placeList } from '../i18n';
import { analyse } from './analysis';
import { testDuel } from './fixture';
import type { Narration } from '../voice';
import { buildStory, dominance, momentBeats, pickMoments, replayDistance } from './story';

const duel = testDuel();
const analysis = analyse(duel);

describe('pickMoments', () => {
  it('stops at the corner where the time goes, zoomed around it', () => {
    const [moment, ...rest] = pickMoments(analysis, 2000);
    expect(rest).toHaveLength(0);
    expect(moment).toMatchObject({ label: 'T1', winner: 0 });
    expect(moment.window[0]).toBeLessThan(575);
    expect(moment.window[1]).toBeGreaterThan(870);
  });
});

describe('momentBeats', () => {
  it('tells the corner in the order it happens, merging what goes together', () => {
    const beats = momentBeats(pickMoments(analysis, 2000)[0], duel, 'en');
    expect(beats.map(b => b.title)).toEqual([
      'Norris brakes 25 m later',
      'Norris is 8 km/h faster at the apex',
      'Piastri lifts on the way out',
      'Norris exits 10 km/h faster',
    ]);
    expect(beats[1].detail).toBe('Norris in 4th gear, Piastri in 3rd');
    expect(beats[2].detail).toBe('A sign of a slide: +10 km/h vs +24 for Norris');
  });

  it('speaks French', () => {
    const beats = momentBeats(pickMoments(analysis, 2000)[0], duel, 'fr');
    expect(beats.map(b => b.title)).toContain('Piastri relâche l’accélérateur en sortie');
    expect(beats[1].detail).toBe('Norris en 4e, Piastri en 3e');
  });
});

describe('buildStory', () => {
  const story = buildStory(duel, analysis, 'en');

  it('keeps every beat no longer than its line, with no dead time', () => {
    for (const beat of story.beats) {
      const line = story.voice.find(v => v.text === beat.voice || v.text.endsWith(beat.voice));
      if (line) expect(beat.to - line.to).toBeLessThanOrEqual(90);
    }
  });

  it('shows one caption at a time, in order', () => {
    for (let i = 1; i < story.beats.length; i++) expect(story.beats[i].from).toBeGreaterThanOrEqual(story.beats[i - 1].to);
    expect(story.beats.at(-1)!.to).toBeLessThanOrEqual(story.outro);
  });

  it('replays the lap forwards, to the line', () => {
    let last = 0;
    for (let frame = 0; frame < story.frames; frame += 10) {
      const d = replayDistance(duel, story, frame);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
    expect(last).toBe(2000);
  });

  it('gives every line of the voiceover the time to be said, one at a time', () => {
    for (const beat of story.beats) {
      const line = story.voice.find(v => v.text === beat.voice || v.text.endsWith(beat.voice))!;
      expect(line.to).toBeLessThanOrEqual(beat.to);
    }
    for (let i = 1; i < story.voice.length; i++) expect(story.voice[i].from).toBeGreaterThanOrEqual(story.voice[i - 1].to);
  });

  it('opens each corner with its name', () => {
    expect(story.voice.some(v => v.text.startsWith('Turn 1. '))).toBe(true);
  });

  it('zooms onto each moment while its beats play', () => {
    expect(story.zooms).toHaveLength(1);
    const zoom = story.zooms[0];
    const zoomed = story.beats.filter(b => b.window);
    expect(zoomed.every(b => b.from >= zoom.from && b.to <= zoom.out)).toBe(true);
  });
});

describe('dominance', () => {
  it('shares the lap between the two', () => {
    const [a, b] = dominance(duel);
    expect(a + b).toBeGreaterThanOrEqual(99);
    expect(a + b).toBeLessThanOrEqual(101);
  });
});

describe('placeList', () => {
  it('joins places with each language’s words', () => {
    expect(placeList(['T1', 'T6', 'T13'], 'en')).toBe('at T1, T6 and T13');
    expect(placeList(['T1', 'straight'], 'en')).toBe('at T1 and on the straight');
    expect(placeList(['T1', 'straight'], 'fr')).toBe('au T1 et en ligne droite');
  });
});

describe('a written narration', () => {
  const narration: Narration = {
    hook: 'Seven tenths.',
    laps: 'Melbourne.',
    sectors: 'Sectors.',
    moments: { T1: ['First line.', 'Second line.', 'Third.', 'Fourth.', 'Fifth.', 'Sixth.'] },
    summary: 'So.',
    epilogue: { kicker: 'The next day', title: 'Norris wins', voice: 'It rains.' },
    end: 'See you.',
  };
  const story = buildStory(duel, analysis, 'en', narration);

  it('is what the voice says, in order', () => {
    expect(story.voice.map(v => v.text)).toEqual([
      'Seven tenths.', 'Melbourne.', 'Sectors.',
      // Four findings and the time gained: the extra line joins the last
      'First line.', 'Second line.', 'Third.', 'Fourth.', 'Fifth. Sixth.',
      'So.', 'It rains.', 'See you.',
    ]);
  });

  it('cuts the beats it says nothing over, and ends on its epilogue', () => {
    expect(story.beats.map(b => b.kicker)).not.toContain('Track dominance');
    expect(story.beats.map(b => b.kicker)).not.toContain('Top speed');
    expect(story.beats.at(-1)).toMatchObject({ kicker: 'The next day', title: 'Norris wins' });
  });

  it('tells only the corners it writes about', () => {
    expect(story.moments.map(m => m.label)).toEqual(['T1']);
    expect(buildStory(duel, analysis, 'en', { ...narration, moments: {} }).moments).toHaveLength(0);
  });
});

describe('the video following the voice', () => {
  const narration: Narration = {
    hook: 'Half a second.',
    laps: 'Melbourne.',
    sectors: 'Sectors.',
    moments: { T1: ['Turn 1. Norris brakes later.', 'Look at the apex here, fourth gear.', 'A slide.', 'Out faster.', 'Half a second gained.'] },
    summary: 'So.',
    end: 'See you.',
  };
  const story = buildStory(duel, analysis, 'en', narration);
  const apexBeat = story.beats.find(b => b.marks.some(m => m.kind === 'finding' && m.finding.kind === 'apexSpeed'))!;
  const apexLine = story.voice.find(v => v.text.startsWith('Look at the apex'))!;

  it('brings each mark in as the voice names it', () => {
    const apex = apexBeat.marks.find(m => m.kind === 'finding' && m.finding.kind === 'apexSpeed')!;
    const gear = apexBeat.marks.find(m => m.kind === 'finding' && m.finding.kind === 'gear')!;
    expect(apex.cue).toBe(apexLine.said.find(w => w.word.startsWith('apex'))!.start);
    // "fourth" says the gear
    expect(gear.cue).toBe(apexLine.said.find(w => w.word.startsWith('fourth'))!.start);
    expect(gear.cue!).toBeGreaterThan(apex.cue!);
  });

  it('moves the camera there', () => {
    const apex = apexBeat.marks.find(m => m.kind === 'finding' && m.finding.kind === 'apexSpeed')!;
    expect(story.shots.some(shot => shot.from === apex.cue)).toBe(true);
  });

  it('gives the hook, the verdict and the closing line to the mascot, the rest to the page', () => {
    const [hook, closing] = story.mascot;
    expect(hook).toEqual({ from: 0, to: story.hookExit + 20 });
    expect(story.beats[0].from).toBe(hook.to);
    expect(closing.from).toBe(story.beats.at(-1)!.from);
    expect(closing.to).toBe(story.frames);
    expect(story.voice.at(-1)!.from).toBeGreaterThanOrEqual(story.outro);
  });

  it('explains a term the first time it is said, and announces each corner', () => {
    expect(story.explainers.map(e => e.text)).toContain('The apex: the slowest point of the corner');
    expect(story.chapters).toEqual([expect.objectContaining({ label: 'Turn 1', index: 1, total: 1 })]);
  });

  it('shows the words as said, figures as figures', () => {
    expect(story.voice[0].words.map(w => w.text)).toEqual(['Half', 'a', 'second.']);
    expect(story.voice.every(line => line.words.every(w => w.from >= line.from && w.to <= line.to))).toBe(true);
  });
});
