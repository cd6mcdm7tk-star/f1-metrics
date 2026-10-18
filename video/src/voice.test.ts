import { describe, expect, it } from 'vitest';
import { speechFrames, spokenGap, spokenLapTime, spokenPlaces, toSrt, toVoiceLine, VOICE, VOICE_PACE, type Voiceover } from './voice';

describe('spokenGap', () => {
  it('says gaps the way commentators do', () => {
    expect(spokenGap(0.084, 'fr')).toBe('84 millièmes');
    expect(spokenGap(-0.09, 'en', 2)).toBe('9 hundredths');
    expect(spokenGap(0.012, 'fr', 2)).toBe('1 centième');
    expect(spokenGap(0.002, 'fr', 2)).toBe('moins d’un centième');
    expect(spokenGap(1.234, 'fr')).toBe('1,23 seconde');
    expect(spokenGap(2.5, 'en', 2)).toBe('2.5 seconds');
  });
});

describe('spokenLapTime', () => {
  it('reads a lap time aloud', () => {
    expect(spokenLapTime(75.096, 'fr')).toBe('1 minute 15 secondes 096');
    expect(spokenLapTime(125.4, 'fr')).toBe('2 minutes 5 secondes 400');
    expect(spokenLapTime(75.096, 'en')).toBe('1:15.096');
  });
});

describe('spokenPlaces', () => {
  it('names the corners in full sentences', () => {
    expect(spokenPlaces(['T1', 'T13'], 'fr')).toBe('aux virages 1 et 13');
    expect(spokenPlaces(['T6'], 'fr')).toBe('au virage 6');
    expect(spokenPlaces(['T6', 'straight'], 'fr')).toBe('au virage 6 et en ligne droite');
    expect(spokenPlaces(['T1', 'T6', 'T13'], 'en')).toBe('at turns 1, 6 and 13');
    expect(spokenPlaces(['straight'], 'en')).toBe('on the straight');
  });

  it('places unnumbered corners by distance', () => {
    expect(spokenPlaces(['@1530', 'straight'], 'fr')).toBe('à 1,5 kilomètres et en ligne droite');
    expect(spokenPlaces(['@1530'], 'en')).toBe('1.5 kilometres in');
  });
});

describe('VOICE', () => {
  it('lets a "but" lead any line, which starts with its subject', () => {
    expect(VOICE.fr.but(VOICE.fr.apexSpeed('Norris', 8, null))).toBe('Mais Norris a 8 kilomètres-heure de plus à la corde.');
    expect(VOICE.en.but(VOICE.en.exitSpeed('Norris', 9))).toBe('But Norris exits 9 kilometres an hour faster.');
  });

  it('groups the sectors by driver', () => {
    expect(VOICE.fr.sectors(['Norris', 'Piastri', 'Norris'], ['Norris', 'Piastri'], 'fr')).toBe('Norris prend les secteurs 1 et 3, Piastri le secteur 2.');
    expect(VOICE.en.sectors(['Norris', 'Norris', 'Norris'], ['Norris', 'Piastri'], 'en')).toBe('Norris takes all three sectors.');
  });
});

describe('toSrt', () => {
  it('writes numbered, timed subtitles', () => {
    expect(toSrt([{ from: 12, to: 300, text: 'Hello' }, { from: 3720, to: 3780, text: 'Again' }], 60)).toBe(
      '1\n00:00:00,200 --> 00:00:05,000\nHello\n\n2\n00:01:02,000 --> 00:01:03,000\nAgain\n',
    );
  });
});

describe('speechFrames', () => {
  it('gives a longer line more time', () => {
    expect(speechFrames('Norris y gagne 9 centièmes.')).toBeLessThan(speechFrames('Piastri freine 20 mètres plus tard et garde 9 kilomètres-heure de plus.'));
  });
});

describe('toVoiceLine', () => {
  const voiceover: Voiceover = {
    'Moins qu’un clignement.': {
      file: 'voice/fr/a.wav',
      seconds: 1.5,
      words: [{ word: 'Moins', start: 0.1, end: 0.4 }, { word: 'qu’un', start: 0.4, end: 0.6 }, { word: 'clignement.', start: 0.6, end: 1.3 }],
      mouth: [{ start: 0, end: 0.1, value: 'X' }, { start: 0.1, end: 0.5, value: 'E' }],
    },
  };

  // Seconds into the recording, as frames of the video at the voice's pace
  const at = (seconds: number) => 100 + Math.round((seconds / VOICE_PACE) * 60);

  it('finds the recording without the tags and times the line by it, sped up', () => {
    const line = toVoiceLine('[surprised] Moins qu’un clignement.', 100, 'fr', 60, voiceover);
    expect(line.text).toBe('Moins qu’un clignement.');
    expect(line.to).toBe(100 + Math.ceil((1.5 / VOICE_PACE) * 60) + 6);
    expect(line.said.map(w => w.start)).toEqual([at(0.1), at(0.4), at(0.6)]);
  });

  it('puts the mouth shapes and the expressions on the video\'s frames', () => {
    const line = toVoiceLine('Moins [ironic] qu’un clignement.', 100, 'fr', 60, voiceover);
    expect(line.mouth).toEqual([{ from: at(0), to: at(0.1), value: 'X' }, { from: at(0.1), to: at(0.5), value: 'E' }]);
    expect(line.moods).toEqual([{ from: at(0.4) - 6, expression: 'ironic' }]);
  });

  it('times a line with no recording by its length, with no mouth shapes', () => {
    const line = toVoiceLine('Verdict.', 0, 'fr', 60);
    expect(line.to).toBe(Math.ceil(speechFrames('Verdict.') / VOICE_PACE));
    expect(line.mouth).toEqual([]);
  });
});
