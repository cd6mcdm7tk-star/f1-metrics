import { describe, expect, it } from 'vitest';
import { recap } from './fixture';
import { raceFacts } from './race';
import { buildRecap, defaultNarration, raceLapAt, type RecapNarration } from './story';

const facts = raceFacts(recap);
const story = buildRecap(recap, facts, 'fr');

describe('defaultNarration', () => {
  it('tells the race in both languages from its facts', () => {
    const fr = defaultNarration(recap, facts, 'fr');
    expect(fr.hook).toBe('12 tours, 12 en tête : Alpha n’a rien laissé.');
    expect(fr.podium).toContain('Bravo termine à');
    expect(fr.figures).toEqual(['Bravo gagne 3 places.', '1 abandon.']);
    expect(defaultNarration(recap, facts, 'en').verdict).toBe('Verdict: Alpha ahead of Bravo.');
    // One race in: the winner leads the championship by the gap between 25 and 18 points
    expect(fr.championship).toBe('Au championnat, Alpha compte 7 points d’avance sur Bravo.');
  });
});

describe('buildRecap', () => {
  it('runs the scenes back to back, the mascot first and last', () => {
    expect(story.scenes.map(s => s.kind)).toEqual(['cover', 'podium', 'race', 'strategy', 'pace', 'figures', 'championship', 'verdict']);
    expect(story.scenes[0].from).toBe(0);
    story.scenes.slice(1).forEach((scene, i) => expect(scene.from).toBe(story.scenes[i].to));
    expect(story.scenes.at(-1)!.to).toBe(story.frames);
  });

  it('keeps every line inside its scene, one after the other', () => {
    for (let i = 1; i < story.voice.length; i++) expect(story.voice[i].from).toBeGreaterThan(story.voice[i - 1].to);
    const verdict = story.scenes.at(-1)!;
    expect(story.voice.at(-1)!.from).toBeGreaterThanOrEqual(verdict.from);
    expect(story.outro).toBe(story.voice.at(-1)!.from - 10);
  });

  it('brings each podium place up as its driver is named', () => {
    const podiumLine = story.voice[1];
    const named = (name: string) => podiumLine.said.find(w => w.word.startsWith(name))!.start;
    expect(story.podium).toEqual([named('Alpha'), named('Bravo'), named('Charlie')]);
  });

  it('gives each figure a card of its own, inside the figures scene', () => {
    const figures = story.scenes.find(s => s.kind === 'figures')!;
    expect(story.cards.map(c => [c.sign + c.value, c.ghost])).toEqual([['+3', 'BBB'], ['1', 'DNF']]);
    expect(story.cards[0].from).toBe(figures.from);
    expect(story.cards.at(-1)!.to).toBe(figures.to);
  });
});

describe('raceLapAt', () => {
  it('draws the whole race over the scene, from lap 1 to the last', () => {
    const race = story.scenes.find(s => s.kind === 'race')!;
    expect(raceLapAt(story, race.from)).toBe(1);
    expect(raceLapAt(story, race.to)).toBe(facts.totalLaps);
    for (let f = race.from; f < race.to; f += 5) expect(raceLapAt(story, f + 5)).toBeGreaterThanOrEqual(raceLapAt(story, f));
  });

  it('reaches a neutralised lap as the voice names it, unless it is named too soon to draw', () => {
    const slow = { ...recap, drivers: recap.drivers.map(d => (d.laps ? { ...d, laps: d.laps.map((t, k) => (k === 7 ? t + 40 : t)) } : d)) };
    const slowFacts = raceFacts(slow);
    expect(slowFacts.neutralised).toEqual([{ from: 8, to: 8 }]);
    const narration: RecapNarration = { ...defaultNarration(slow, slowFacts, 'fr'), race: 'Alpha s’échappe, tour après tour, sans jamais trembler. Puis, tour huit : la course est neutralisée.' };
    const told = buildRecap(slow, slowFacts, 'fr', narration);
    const line = told.voice[2];
    const eight = line.said.find(w => w.word.startsWith('huit'))!.start;
    expect(told.raceLaps).toContainEqual({ frame: eight, lap: 8 });
    const early = buildRecap(slow, slowFacts, 'fr', { ...narration, race: 'Huit : la course est neutralisée.' });
    expect(early.raceLaps.map(k => k.lap)).toEqual([1, slowFacts.totalLaps]);
  });
});

describe('the pace scene', () => {
  // A neutralised lap 8: the pace splits from lap 9
  const slow = { ...recap, drivers: recap.drivers.map(d => (d.laps ? { ...d, laps: d.laps.map((t, k) => (k === 7 ? t + 40 : t)) } : d)) };
  const slowFacts = raceFacts(slow);

  it('compares the top two from the restart', () => {
    expect(slowFacts.restart).toBe(9);
    expect(defaultNarration(slow, slowFacts, 'fr').pace).toMatch(/^Le rythme, tour par tour\. Après le tour 8, (Alpha|Bravo) tourne /);
  });

  it('closes in on the restart as the voice names it, once the chart has had time to draw', () => {
    const narration: RecapNarration = {
      ...defaultNarration(slow, slowFacts, 'fr'),
      pace: 'Le rythme, tour par tour : chaque point est un tour, plus il est bas, plus c’est rapide. Après le tour huit, tout change.',
    };
    const told = buildRecap(slow, slowFacts, 'fr', narration);
    const line = told.voice.find(l => l.text.startsWith('Le rythme'))!;
    expect(told.pace.at).toBe(line.said.find(w => w.word.startsWith('huit'))!.start);
    expect(told.pace.late).not.toBeNull();
    const rushed = buildRecap(slow, slowFacts, 'fr', { ...narration, pace: 'Huit tours plus tard, tout change.' });
    expect(rushed.pace.at).toBeNull();
  });
});

describe('the telemetry scene', () => {
  const withLaps = { ...recap, duel: { ...recap.duel, drivers: [{ name: 'Bravo', lapTime: 90.2 }, { name: 'Alpha', lapTime: 91.2 }] } as typeof recap.duel };

  it('shows the top two\'s best laps between the race chart and the strategy', () => {
    const told = buildRecap(withLaps, facts, 'fr');
    expect(told.scenes.map(s => s.kind).slice(2, 5)).toEqual(['race', 'telemetry', 'strategy']);
    expect(defaultNarration(withLaps, facts, 'fr').telemetry).toBe('Sur un tour, Bravo est 1,00 seconde plus rapide que Alpha.');
  });

  it('is left out without the laps\' telemetry', () => {
    expect(story.scenes.map(s => s.kind)).not.toContain('telemetry');
  });
});

describe('a race told without its strategy', () => {
  it('leaves the strategy scene out when the script has no line for it', () => {
    const narration: RecapNarration = { ...defaultNarration(recap, facts, 'fr'), strategy: '' };
    expect(buildRecap(recap, facts, 'fr', narration).scenes.map(s => s.kind)).not.toContain('strategy');
  });
});

describe('the race chart\'s cues', () => {
  it('follows the voice\'s order, the faller named before a neutralised lap', () => {
    // CCC slower over the first two laps takes second when BBB stops, holds it
    // from lap 3 to 7, then loses it; everyone is neutralised on lap 10
    const charlie = [93.5, 93.5, 90.5, ...Array<number>(9).fill(94)];
    const slow = {
      ...recap,
      drivers: recap.drivers.map(d => (d.laps ? { ...d, laps: (d.code === 'CCC' ? charlie : d.laps).map((t, k) => (k === 9 ? t + 40 : t)) } : d)),
    };
    const slowFacts = raceFacts(slow);
    expect(slowFacts.faller).toMatchObject({ lap: 3, best: 2 });
    const narration: RecapNarration = {
      ...defaultNarration(slow, slowFacts, 'fr'),
      race: 'Au départ, tout est calme, chacun reste à sa place. Charlie tient la deuxième place longtemps. Puis, tour dix : la course est neutralisée.',
    };
    const told = buildRecap(slow, slowFacts, 'fr', narration);
    expect(told.raceLaps.map(k => k.lap)).toEqual([1, 3, 10, slowFacts.totalLaps]);
  });
});
