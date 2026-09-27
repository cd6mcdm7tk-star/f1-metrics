// Prerenders the SPA's real routes into static HTML at build time.
//
// Why: this is a pure client-rendered app (createRoot, not hydrateRoot), so
// crawlers/bots that don't execute JS — most link-preview unfurlers (Slack,
// Discord, iMessage, LinkedIn) and any search engine other than Google —
// only ever see the bare index.html shell. This script spins up the built
// app locally, drives a real headless browser through each route so all
// client-side data fetching/rendering (and react-helmet-async's per-page
// <title>/<meta>) actually runs, then saves the resulting DOM as that
// route's static HTML file. A real browser loading these files still gets
// the exact same JS bundle and re-renders over the static markup normally —
// there's no hydration to mismatch since the app never called hydrateRoot.
//
// Never fails the build: if a route can't be captured (e.g. the backend API
// is briefly unreachable), we fall back to the plain SPA shell for that
// route instead of blocking deployment.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  { path: '/', out: 'index.html' },
  { path: '/app', out: 'app/index.html' },
  { path: '/stats', out: 'stats/index.html' },
];

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`vite preview never became ready at ${url}`);
}

async function main() {
  if (!existsSync(distDir)) {
    console.error('[prerender] dist/ not found — run `vite build` first.');
    process.exit(1);
  }

  // Seed each non-root route with a plain copy of the SPA shell first, so
  // if its prerender capture fails below, the deploy still serves a working
  // (just not pre-rendered) page instead of a 404.
  const shellHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
  for (const { out } of ROUTES) {
    if (out === 'index.html') continue;
    const outPath = join(distDir, out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, shellHtml);
  }

  console.log('[prerender] starting `vite preview`...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });

  const cleanup = () => {
    preview.kill('SIGTERM');
  };
  process.on('exit', cleanup);

  try {
    await waitForServer(BASE_URL);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const { path, out } of ROUTES) {
      const url = `${BASE_URL}${path}`;
      console.log(`[prerender] capturing ${path} ...`);
      try {
        const page = await browser.newPage();
        // Explicit desktop viewport — the app picks mobile vs desktop layout
        // via matchMedia (see useIsMobile), and we always want to prerender
        // the desktop version regardless of Puppeteer's own default size.
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
        // small settle buffer for any post-networkidle re-render (Helmet
        // effects, chart mount animations, etc.)
        await new Promise(r => setTimeout(r, 500));
        const html = await page.content();
        await page.close();

        const outPath = join(distDir, out);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, html);
        console.log(`[prerender] ✓ ${path} -> dist/${out}`);
      } catch (err) {
        console.warn(`[prerender] ✗ ${path} failed, keeping plain SPA shell:`, err.message);
      }
    }

    await browser.close();
  } catch (err) {
    console.warn('[prerender] skipped entirely, keeping plain SPA shell for all routes:', err.message);
  } finally {
    cleanup();
  }
}

main();
