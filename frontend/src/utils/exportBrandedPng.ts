// PNG export with a branded footer band (wordmark, session context, URL)
// drawn under the captured element — so an exported chart shared on social
// media stays self-explanatory and credits the site, without that band
// cluttering the live page.

const SCALE = 2; // export at 2x for a crisp image, not the display's raw pixel size
const FOOTER_H = 44; // CSS px, before SCALE

const BRAND = {
  bg: '#5e1018',
  text: '#f2e6d8',
  textSub: 'rgba(242,230,216,0.62)',
};

// Canvas letterSpacing isn't supported everywhere yet (older Safari), so
// tracking is done by hand, one glyph at a time.
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): number {
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  return x - spacing;
}

function fitToWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number, maxWidth: number): string {
  if (spacedWidth(ctx, text, spacing) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && spacedWidth(ctx, `${t}…`, spacing) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

// html2canvas renders each inline <svg> (every Recharts chart) by
// serializing it into a standalone SVG image — and an SVG image can't see
// the page's webfonts, so chart text (axis ticks, corner labels) silently
// fell back to a serif default in exports. An @font-face with the font
// inlined as a data: URI does work inside an SVG image, so the brand fonts
// get embedded into each cloned chart before capture. Latin subset only,
// fetched once per page load.
const EXPORT_FONTS_CSS_URL = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@600;700&display=swap';
let embeddedFontCss: Promise<string> | null = null;

function toDataUri(buf: ArrayBuffer): string {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:font/woff2;base64,${btoa(bin)}`;
}

function loadEmbeddedFontCss(): Promise<string> {
  if (!embeddedFontCss) {
    embeddedFontCss = (async () => {
      const css = await (await fetch(EXPORT_FONTS_CSS_URL)).text();
      // Google Fonts labels each subset's block with a comment (`/* latin */`)
      const latinBlocks = css.split('/*').filter(b => b.startsWith(' latin */')).map(b => b.slice(b.indexOf('*/') + 2));
      const urls = [...new Set(latinBlocks.flatMap(b => [...b.matchAll(/url\(([^)]+)\)/g)].map(m => m[1])))];
      const dataUris = new Map(await Promise.all(
        urls.map(async u => [u, toDataUri(await (await fetch(u)).arrayBuffer())] as const),
      ));
      return latinBlocks.join('\n').replace(/url\(([^)]+)\)/g, (_, u) => `url(${dataUris.get(u) ?? u})`);
    })().catch(err => {
      embeddedFontCss = null; // allow a retry on the next export
      console.warn('Export font embedding unavailable:', err);
      return '';
    });
  }
  return embeddedFontCss;
}

export async function exportBrandedPng(target: HTMLElement, opts: { filename: string; context: string }): Promise<void> {
  // Dynamic import — html2canvas is ~200KB and only ever needed once the
  // user actually exports, not on every page load.
  const [{ default: html2canvas }, fontCss] = await Promise.all([
    import('html2canvas'),
    loadEmbeddedFontCss(),
  ]);
  const bg = getComputedStyle(target).getPropertyValue('--bg').trim() || '#ede5d5';

  const shot = await html2canvas(target, {
    onclone: doc => {
      if (!fontCss) return;
      doc.querySelectorAll('svg').forEach(svg => {
        const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = fontCss;
        svg.insertBefore(style, svg.firstChild);
      });
    },
    backgroundColor: bg,
    scale: SCALE,
    useCORS: true,
    // A scrolling target (overflowY: auto) otherwise only captures what fits
    // in the visible viewport and silently crops the rest.
    height: target.scrollHeight,
    windowHeight: target.scrollHeight,
    // On-screen-only chrome: the corner watermark (the footer replaces it)
    // and interactive toggles that mean nothing in a static image.
    ignoreElements: el => el.hasAttribute('data-export-hide'),
  });

  // Canvas text only renders with a webfont that's already loaded.
  await Promise.all([
    document.fonts.load(`700 ${15 * SCALE}px Rajdhani`),
    document.fonts.load(`400 ${10 * SCALE}px "JetBrains Mono"`),
  ]).catch(() => {});

  const out = document.createElement('canvas');
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const pad = 16 * SCALE;
  const gap = 14 * SCALE;
  const monoFont = `400 ${10 * SCALE}px "JetBrains Mono", monospace`;
  const wordFont = `700 ${15 * SCALE}px Rajdhani, sans-serif`;
  const monoSpacing = 0.08 * 10 * SCALE;
  const wordSpacing = 0.16 * 15 * SCALE;
  const url = 'metrikdelta.com';
  const context = opts.context.toUpperCase();

  // Measure first: a narrow capture (mobile) can't fit wordmark + context +
  // URL on one line, so the context drops to its own second line instead of
  // being truncated down to just the year and GP.
  ctx.font = monoFont;
  const urlW = spacedWidth(ctx, url, monoSpacing);
  const contextW = spacedWidth(ctx, context, monoSpacing);
  ctx.font = wordFont;
  const wordW = spacedWidth(ctx, 'METRIK DELTA', wordSpacing);
  const twoLines = !!context && pad + wordW + gap + contextW + gap + urlW + pad > shot.width;

  const footerH = (twoLines ? 64 : FOOTER_H) * SCALE;
  out.width = shot.width;
  out.height = shot.height + footerH;

  ctx.drawImage(shot, 0, 0);
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, shot.height, out.width, footerH);
  ctx.textBaseline = 'middle';

  const row1Y = shot.height + (twoLines ? 22 * SCALE : footerH / 2);

  // Wordmark (left) and URL (right)
  ctx.font = wordFont;
  ctx.fillStyle = BRAND.text;
  drawSpaced(ctx, 'METRIK DELTA', pad, row1Y, wordSpacing);
  ctx.font = monoFont;
  drawSpaced(ctx, url, out.width - pad - urlW, row1Y, monoSpacing);

  // Session context — between the two on one line, or full-width below
  if (context) {
    ctx.fillStyle = BRAND.textSub;
    if (twoLines) {
      // Shrink a little (down to 8px) to keep the whole line — the drivers
      // come last and are the part most worth keeping — before truncating.
      const avail = out.width - 2 * pad;
      const size = Math.max(8, Math.min(10, (10 * avail) / contextW));
      ctx.font = `400 ${size * SCALE}px "JetBrains Mono", monospace`;
      const spacing = 0.08 * size * SCALE;
      drawSpaced(ctx, fitToWidth(ctx, context, spacing, avail), pad, shot.height + 46 * SCALE, spacing);
    } else {
      drawSpaced(ctx, context, pad + wordW + gap, row1Y, monoSpacing);
    }
  }

  const link = document.createElement('a');
  link.download = opts.filename;
  link.href = out.toDataURL('image/png');
  link.click();
}
