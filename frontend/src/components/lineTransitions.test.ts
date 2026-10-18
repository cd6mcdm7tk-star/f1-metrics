import { describe, expect, it } from 'vitest';
import { initialLines, lineColors, nextLines, settleEntering, settleLeaving } from './lineTransitions';

describe('lap chart line transitions', () => {
  it('draws in the lines whose laps are there', () => {
    const state = initialLines(['VER', 'LEC'], ['VER']);
    expect(state.lines).toEqual(['VER', 'LEC']);
    expect(state.entering).toEqual(['VER']);
  });

  it('draws a selected line in once its laps arrive, not before', () => {
    const selected = nextLines(initialLines(['VER'], ['VER']), ['VER', 'LEC'], ['VER']);
    expect(selected.lines).toEqual(['VER', 'LEC']);
    expect(selected.entering).toEqual(['VER']);
    expect(nextLines(selected, ['VER', 'LEC'], ['VER', 'LEC']).entering).toEqual(['VER', 'LEC']);
  });

  it('keeps a deselected line in its place while it fades, then drops it', () => {
    const start = settleEntering(initialLines(['VER', 'LEC', 'HAM'], ['VER', 'LEC', 'HAM']), 'VER');
    const fading = nextLines(start, ['VER', 'HAM'], ['VER', 'HAM']);
    expect(fading.lines).toEqual(['VER', 'LEC', 'HAM']);
    expect(fading.leaving).toEqual(['LEC']);
    expect(fading.entering).toEqual(['HAM']);
    expect(settleLeaving(fading, 'LEC').lines).toEqual(['VER', 'HAM']);
  });

  it('lets several lines fade at once, each dropped on its own', () => {
    const start = initialLines(['VER', 'LEC', 'HAM'], ['VER', 'LEC', 'HAM']);
    const one = nextLines(start, ['VER', 'HAM'], ['VER', 'HAM']);
    const two = nextLines(one, ['HAM'], ['HAM']);
    expect(two.leaving).toEqual(['LEC', 'VER']);
    const dropped = settleLeaving(two, 'LEC');
    expect(dropped.lines).toEqual(['VER', 'HAM']);
    expect(settleLeaving(dropped, 'VER').lines).toEqual(['HAM']);
  });

  it('takes back a line reselected before it faded, without drawing it again', () => {
    const start = settleEntering(initialLines(['VER', 'LEC'], ['VER', 'LEC']), 'VER');
    const fading = nextLines(settleEntering(start, 'LEC'), ['VER'], ['VER']);
    const back = nextLines(fading, ['VER', 'LEC'], ['VER', 'LEC']);
    expect(back.lines).toEqual(['VER', 'LEC']);
    expect(back.leaving).toEqual([]);
    expect(back.entering).toEqual([]);
    // Its fade's end changes nothing once it's back
    expect(settleLeaving(back, 'LEC')).toBe(back);
  });

  it('draws a line in again once it had gone', () => {
    const gone = settleLeaving(nextLines(initialLines(['VER'], ['VER']), [], []), 'VER');
    expect(gone.lines).toEqual([]);
    expect(nextLines(settleEntering(gone, 'VER'), ['VER'], ['VER']).entering).toEqual(['VER']);
  });
});

describe('lap chart line colours', () => {
  const teams: Record<string, string> = { NOR: 'McLaren', PIA: 'McLaren', VER: 'Red Bull' };
  const areTeammates = (a: string, b: string) => teams[a] === teams[b];

  it('gives the second teammate drawn a colour of their own', () => {
    expect(lineColors(['NOR', 'PIA', 'VER'], [], {}, areTeammates).colors).toEqual({ PIA: '#000000' });
  });

  it('keeps a fading line in the colour it had, as its teammate goes', () => {
    // NOR fading first, then PIA: PIA was the second colour and stays it
    const first = lineColors(['NOR', 'PIA', 'VER'], ['NOR', 'PIA'], {}, areTeammates);
    expect(first.frozen).toEqual({ NOR: null, PIA: '#000000' });
    const later = lineColors(['PIA', 'VER'], ['PIA'], first.frozen, areTeammates);
    expect(later.colors).toEqual({ PIA: '#000000' });
  });

  it('gives a selected driver the team colour back once the teammate has gone', () => {
    expect(lineColors(['NOR', 'PIA'], ['NOR'], {}, areTeammates).colors).toEqual({ NOR: null, PIA: '#000000' });
    expect(lineColors(['PIA'], [], {}, areTeammates).colors).toEqual({});
  });
});
