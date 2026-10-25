import { describe, expect, it } from 'vitest';
import { chunkWords, cueTime, numberValue, ordinalValue, showWords, timeWords } from './words';

describe('timeWords', () => {
  const heard = [
    { word: 'Virage', start: 0, end: 0.58 }, { word: '1.', start: 0.58, end: 0.86 },
    { word: 'Regardez', start: 1.4, end: 1.96 }, { word: 'la', start: 1.96, end: 2.1 }, { word: 'corde.', start: 2.1, end: 2.6 },
    { word: '9', start: 3, end: 3.3 }, { word: 'km', start: 3.3, end: 3.6 }, { word: 'heure', start: 3.6, end: 4 },
  ];

  it('takes the times of the words Whisper heard as written', () => {
    const timed = timeWords('Virage 1. Regardez la corde. Neuf kilomètres-heure.', heard, 4.2);
    expect(timed.slice(0, 5).map(w => w.start)).toEqual([0, 0.58, 1.4, 1.96, 2.1]);
  });

  it('spreads the rest between their neighbours, by length', () => {
    const timed = timeWords('Virage 1. Regardez la corde. Neuf kilomètres-heure.', heard, 4.2);
    // "Neuf" and "kilomètres-heure." fill 2.6 s → 4 s, the last heard word's end
    expect(timed[5].start).toBeCloseTo(2.6, 6);
    expect(timed[6].end).toBeCloseTo(4, 6);
    expect(timed[6].start - timed[5].start).toBeCloseTo((1.4 * 4) / 21, 6);
  });

  it('keeps punctuation standing alone with the word before it', () => {
    expect(timeWords('les pointillés : Piastri', [], 1).map(w => w.word)).toEqual(['les', 'pointillés\u00a0:', 'Piastri']);
  });

  it('spreads the whole line when nothing was heard', () => {
    const timed = timeWords('ab abcd', [], 3);
    expect(timed.map(w => [w.start, w.end])).toEqual([[0, 1], [1, 3]]);
  });
});

describe('numberValue', () => {
  it('reads numbers written in words', () => {
    expect(numberValue('quatre-vingt-quatre', 'fr')).toBe(84);
    expect(numberValue('Vingt', 'fr')).toBe(20);
    expect(numberValue('soixante-dix', 'fr')).toBe(70);
    expect(numberValue('eighty-four', 'en')).toBe(84);
    expect(numberValue('corde', 'fr')).toBeNull();
  });
});

describe('showWords', () => {
  const at = (words: string[]) => words.map((word, i) => ({ word, start: i, end: i + 1 }));

  it('reads a French number said in several words as one figure', () => {
    expect(showWords(at(['cent', 'deux', 'points']), 'fr').map(w => w.text)).toEqual(['102', 'points']);
    expect(showWords(at(['deux', 'cents', 'tours.']), 'fr').map(w => w.text)).toEqual(['200', 'tours.']);
    expect(showWords(at(['cent', 'deux', 'points']), 'fr')[0]).toMatchObject({ start: 0, end: 2, figure: true });
  });

  it('keeps numbers apart across punctuation, and those without hundreds', () => {
    expect(showWords(at(['cent,', 'deux']), 'fr').map(w => w.text)).toEqual(['100,', '2']);
    expect(showWords(at(['deux', 'trois']), 'fr').map(w => w.text)).toEqual(['2', '3']);
  });

  it('shows a percentage as a figure with its sign', () => {
    expect(showWords(at(['quarante', 'pour', 'cent', 'de', 'plus.']), 'fr').map(w => w.text)).toEqual(['40 %', 'de', 'plus.']);
    expect(showWords(at(['forty', 'percent.']), 'en').map(w => w.text)).toEqual(['40 %.']);
    expect(showWords(at(['pour', 'cent']), 'fr').map(w => w.text)).toEqual(['pour', '100']);
  });

  it('shows numbers as figures and speeds as km/h', () => {
    expect(showWords(at(['Neuf', 'kilomètres-heure', 'de', 'moins.']), 'fr').map(w => w.text)).toEqual(['9', 'km/h', 'de', 'moins.']);
    expect(showWords(at(['nine', 'kilometres', 'an', 'hour', 'down.']), 'en').map(w => w.text)).toEqual(['9', 'km/h', 'down.']);
  });

  it('reads numbers said in pairs as one', () => {
    const shown = showWords(at(['three', 'twenty-nine', 'against', 'three', 'twenty-eight.']), 'en');
    expect(shown.map(w => w.text)).toEqual(['329', 'against', '328.']);
    expect([shown[0].start, shown[0].end]).toEqual([0, 2]);
  });

  it('leaves "un" and "one" as words', () => {
    expect(showWords(at(['Un', 'rapport', 'de', 'moins']), 'fr').map(w => w.text)).toEqual(['Un', 'rapport', 'de', 'moins']);
    expect(showWords(at(['in', 'one', 'go']), 'en').map(w => w.figure)).toEqual([false, false, false]);
  });
});

describe('cueTime', () => {
  it('finds the first word starting with a cue, ignoring accents and case', () => {
    const words = [{ word: 'Regardez', start: 1 }, { word: 'la', start: 2 }, { word: 'Corde.', start: 3 }];
    expect(cueTime(words, ['corde', 'apex'])).toBe(3);
    expect(cueTime(words, ['frein'])).toBeNull();
  });

  it('also finds a cue after an apostrophe, or a number said', () => {
    const words = [{ word: 'Dix', start: 1 }, { word: "l'entrée…", start: 2 }, { word: 'cinquième', start: 3 }];
    expect(cueTime(words, ['entre'])).toBe(2);
    expect(cueTime(words, ['nothing'], [10])).toBe(1);
    expect(cueTime(words, [], [5])).toBe(3);
  });
});

describe('ordinalValue', () => {
  it('reads ordinals', () => {
    expect(ordinalValue('cinquième', 'fr')).toBe(5);
    expect(ordinalValue('fourth,', 'en')).toBe(4);
    expect(ordinalValue('corde', 'fr')).toBeNull();
  });
});

describe('chunkWords', () => {
  it('cuts after punctuation and when a chunk gets long', () => {
    const words = 'Virage 1. Regardez la corde. Norris passe en cinquième, Piastri'.split(' ').map(text => ({ text }));
    expect(chunkWords(words).map(c => c.map(w => w.text).join(' '))).toEqual(['Virage 1.', 'Regardez la corde.', 'Norris passe en', 'cinquième,', 'Piastri']);
  });
});
