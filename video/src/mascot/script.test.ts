import { describe, expect, it } from 'vitest';
import { moodFrames, parseMoods } from './script';

describe('parseMoods', () => {
  it('takes the tags out of the line and notes the word each one starts on', () => {
    const { text, moods } = parseMoods('[focused] Quatre-vingt-quatre millièmes. [ironic] Assez pour perdre… chez soi.');
    expect(text).toBe('Quatre-vingt-quatre millièmes. Assez pour perdre… chez soi.');
    expect(moods).toEqual([{ word: 0, expression: 'focused' }, { word: 2, expression: 'ironic' }]);
  });

  it('counts words as the timing does, with lone punctuation joined to the word before', () => {
    expect(parseMoods('Au virage 10 : [surprised] rien.').moods).toEqual([{ word: 3, expression: 'surprised' }]);
  });

  it('accepts a tag stuck to a word', () => {
    expect(parseMoods('Et[pleased]voilà').text).toBe('Et voilà');
  });

  it('rejects an expression the mascot does not have', () => {
    expect(() => parseMoods('[angry] Non.')).toThrow('Unknown expression [angry]');
  });

  it('leaves a line without tags as it is', () => {
    expect(parseMoods('Verdict : Norris devant.')).toEqual({ text: 'Verdict : Norris devant.', moods: [] });
  });
});

describe('moodFrames', () => {
  const said = [{ word: 'Au', start: 100 }, { word: 'virage', start: 112 }, { word: 'dix', start: 130 }];

  it('starts each expression a little before its word', () => {
    expect(moodFrames([{ word: 1, expression: 'surprised' }], said, 100)).toEqual([{ from: 106, expression: 'surprised' }]);
  });

  it('keeps a tag after the last word on the last word', () => {
    expect(moodFrames([{ word: 9, expression: 'pleased' }], said, 100, 0)).toEqual([{ from: 130, expression: 'pleased' }]);
  });

  it('starts at the line without words', () => {
    expect(moodFrames([{ word: 0, expression: 'ironic' }], [], 40, 0)).toEqual([{ from: 40, expression: 'ironic' }]);
  });
});
