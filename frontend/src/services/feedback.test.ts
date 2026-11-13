import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendFeedback } from './feedback';

const form = { message: 'T1 looks off', email: '  ', page: '/app?y=2026', website: '' };
const answer = (status: number) => vi.fn(() => Promise.resolve(new Response(null, { status })));

describe('sendFeedback', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the message, the page, and no address when none was given', async () => {
    const fetch = answer(204);
    vi.stubGlobal('fetch', fetch);
    expect(await sendFeedback(form)).toBe('sent');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/feedback$/);
    expect(JSON.parse(init.body as string)).toEqual({ message: 'T1 looks off', email: null, page: '/app?y=2026', website: '' });
  });

  it('tells a visitor who sent too many from one who could not send at all', async () => {
    vi.stubGlobal('fetch', answer(429));
    expect(await sendFeedback(form)).toBe('limited');
    vi.stubGlobal('fetch', answer(503));
    expect(await sendFeedback(form)).toBe('failed');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    expect(await sendFeedback(form)).toBe('failed');
  });
});
