// PNG export of a chart area: re-laid out at a fixed size (so every export
// has the same format whatever the screen), captured at high resolution, with
// a faint brand watermark behind the curves.

const OUTPUT_WIDTH = 3600; // px — stays sharp after social feeds downscale it

const WATERMARK = {
  color: '#5e1018',
  opacity: 0.11,
  widthRatio: 0.36, // wordmark width as a share of the host's width
};

interface ExportLayout {
  width: number;   // CSS px the target is laid out at for the capture
  height?: number; // CSS px; omitted = the content's natural height
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Recharts' ResponsiveContainer re-renders from a ResizeObserver, a frame or
// two after the size change — wait until every chart matches its container.
async function chartsSettled(root: HTMLElement): Promise<void> {
  const deadline = performance.now() + 1500;
  await nextFrame();
  while (performance.now() < deadline) {
    const settled = [...root.querySelectorAll<HTMLElement>('.recharts-responsive-container')].every(c => {
      const svg = c.querySelector('svg.recharts-surface');
      return !svg
        || (Math.abs(Number(svg.getAttribute('width')) - c.clientWidth) <= 1
          && Math.abs(Number(svg.getAttribute('height')) - c.clientHeight) <= 1);
    });
    if (settled) break;
    await nextFrame();
  }
  await nextFrame();
}

// Moves the live target offscreen at the export size, leaving a static copy
// in its place so the page doesn't visibly change. Returns the undo.
async function layOutForExport(target: HTMLElement, layout: ExportLayout): Promise<() => Promise<void>> {
  const standIn = target.cloneNode(true) as HTMLElement;
  standIn.removeAttribute('id');
  standIn.setAttribute('aria-hidden', 'true');
  standIn.style.pointerEvents = 'none';
  target.before(standIn);
  standIn.scrollTop = target.scrollTop;

  const savedStyle = target.style.cssText;
  Object.assign(target.style, {
    position: 'fixed', left: '-100000px', top: '0',
    width: `${layout.width}px`,
    height: layout.height ? `${layout.height}px` : 'auto',
    maxHeight: 'none', flex: 'none', overflow: 'visible', border: 'none',
  });
  await chartsSettled(target);

  return async () => {
    target.style.cssText = savedStyle;
    await chartsSettled(target);
    standIn.remove();
  };
}

interface TextStamp {
  left: number; top: number; lineHeight: number;
  text: string; color: string;
  fontFamily: string; fontSize: number; fontWeight: string; letterSpacing: number;
}

// html2canvas draws each <svg> as a standalone image, which can't use the
// page's webfonts (Safari fell back to a serif). Chart text is re-drawn as
// HTML instead, which html2canvas renders with the fonts already loaded.
function stampSvgTexts(target: HTMLElement): TextStamp[] {
  const origin = target.getBoundingClientRect();
  const stamps: TextStamp[] = [];
  target.querySelectorAll<SVGTextElement>('svg text').forEach(el => {
    const ctm = el.getScreenCTM();
    const text = el.textContent ?? '';
    // Rotated or multi-line text keeps its SVG rendering
    if (!ctm || Math.abs(ctm.b) > 1e-3 || Math.abs(ctm.c) > 1e-3) return;
    if (!text.trim() || el.querySelectorAll('tspan').length > 1) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(el);
    el.setAttribute('data-export-text', String(stamps.length));
    stamps.push({
      left: r.left - origin.left, top: r.top - origin.top, lineHeight: r.height,
      text, color: cs.fill,
      fontFamily: cs.fontFamily, fontSize: parseFloat(cs.fontSize) * ctm.a,
      fontWeight: cs.fontWeight, letterSpacing: (parseFloat(cs.letterSpacing) || 0) * ctm.a,
    });
  });
  return stamps;
}

function applyTextStamps(clone: HTMLElement, stamps: TextStamp[]) {
  const doc = clone.ownerDocument;
  clone.querySelectorAll('[data-export-text]').forEach(el => {
    const s = stamps[Number(el.getAttribute('data-export-text'))];
    el.remove();
    if (!s) return;
    const span = doc.createElement('span');
    span.textContent = s.text;
    Object.assign(span.style, {
      position: 'absolute', left: `${s.left}px`, top: `${s.top}px`, zIndex: '20',
      lineHeight: `${s.lineHeight}px`, whiteSpace: 'pre',
      color: s.color, fontFamily: s.fontFamily, fontSize: `${s.fontSize}px`,
      fontWeight: s.fontWeight, letterSpacing: `${s.letterSpacing}px`,
    });
    clone.appendChild(span);
  });
}

// Tailwind's preflight makes every <img> a block, which breaks the 1px probe
// image html2canvas uses (in the live page) to find the text baseline: all
// text came out ~5px low. Returns the undo.
function fixBaselineProbe(): () => void {
  const style = document.createElement('style');
  style.textContent = 'img[src^="data:image/gif"] { display: inline !important; }';
  document.head.appendChild(style);
  return () => style.remove();
}

// Wordmark + URL, centred on the host ([data-export-watermark], else the
// whole target) and stacked under its content, so the curves stay on top.
function applyWatermark(clone: HTMLElement, hostWidth: number) {
  const doc = clone.ownerDocument;
  const host = clone.querySelector<HTMLElement>('[data-export-watermark]') ?? clone;
  if (host.style.position === '' || host.style.position === 'static') host.style.position = 'relative';
  host.style.zIndex = '0';

  // Rajdhani bold caps run ~0.55em wide, +0.16em tracking: 12 glyphs ≈ 8.5em
  const size = (hostWidth * WATERMARK.widthRatio) / 8.5;
  const mark = doc.createElement('div');
  Object.assign(mark.style, {
    position: 'absolute', top: '0', right: '0', bottom: '0', left: '0', zIndex: '-1',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: WATERMARK.color, opacity: String(WATERMARK.opacity), pointerEvents: 'none',
  });
  const word = doc.createElement('div');
  word.textContent = 'METRIK DELTA';
  Object.assign(word.style, {
    fontFamily: 'Rajdhani, sans-serif', fontWeight: '700', fontSize: `${size}px`,
    lineHeight: '1', letterSpacing: '0.16em', paddingLeft: '0.16em', whiteSpace: 'nowrap',
  });
  const url = doc.createElement('div');
  url.textContent = 'metrikdelta.com';
  Object.assign(url.style, {
    fontFamily: '"JetBrains Mono", monospace', fontWeight: '700', fontSize: `${size * 0.27}px`,
    lineHeight: '1', letterSpacing: '0.3em', paddingLeft: '0.3em', marginTop: `${size * 0.12}px`,
    whiteSpace: 'nowrap',
  });
  mark.append(word, url);
  host.appendChild(mark);
}

export async function exportBrandedPng(target: HTMLElement, opts: { filename: string; layout: ExportLayout }): Promise<void> {
  // Dynamic import — html2canvas is ~200KB and only needed once the user exports
  const [{ default: html2canvas }] = await Promise.all([
    import('html2canvas'),
    document.fonts.ready,
  ]);
  const bg = getComputedStyle(target).getPropertyValue('--bg').trim() || '#ede5d5';

  const restore = await layOutForExport(target, opts.layout);
  const undoProbeFix = fixBaselineProbe();
  let shot: HTMLCanvasElement;
  try {
    const stamps = stampSvgTexts(target);
    const watermarkHost = target.querySelector<HTMLElement>('[data-export-watermark]') ?? target;
    const hostWidth = watermarkHost.clientWidth;
    const height = target.offsetHeight;
    shot = await html2canvas(target, {
      onclone: (_doc, clone) => {
        applyTextStamps(clone, stamps);
        applyWatermark(clone, hostWidth);
      },
      backgroundColor: bg,
      scale: OUTPUT_WIDTH / opts.layout.width,
      useCORS: true,
      windowHeight: Math.max(window.innerHeight, height),
      // On-screen-only chrome: corner watermark, interactive toggles
      ignoreElements: el => el.hasAttribute('data-export-hide'),
    });
  } finally {
    undoProbeFix();
    target.querySelectorAll('[data-export-text]').forEach(el => el.removeAttribute('data-export-text'));
    await restore();
  }

  const blob = await new Promise<Blob | null>(resolve => shot.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG encoding failed');
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = opts.filename;
  link.href = href;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
