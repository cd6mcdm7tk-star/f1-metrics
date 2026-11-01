import { Fragment, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LegalLinks from '../components/LegalLinks';
import SEO from '../components/SEO';
import { sitePages } from '../seo/pages';
import { useIsMobile } from '../hooks/useIsMobile';
import { getApiBase } from '../config';
import { CURRENT_SEASON_YEAR } from '../utils/season';

// ── Palette (Marlboro) ────────────────────────────────────────────────────────

// textSub passes WCAG AA for small text on `bg`; textGhost (2:1) is for
// decoration only (borders, gradient, the countdown ":"), never for copy.
const P = {
  bg:        '#5e1018',
  text:      '#f2e6d8',
  textSub:   'rgba(242,230,216,0.62)',
  textGhost: 'rgba(242,230,216,0.28)',
  accent:    '#f2e6d8',
  glow:      'rgba(120,10,20,0.35)',
};

// ── Ready-made comparisons ────────────────────────────────────────────────────

interface Featured {
  /** Above the title: the season, the event and the session, shortened on phones */
  year: number;
  event: string;
  session: string;
  short: string;
  title: string;
  line: string;
  /** Which page it opens */
  page: 'Telemetry' | 'Statistics';
  to: string;
}

/** The latest qualifying session that's final and its front row, from /latest-qualifying */
interface LatestQualifying {
  year: number;
  round: number;
  location: string;
  drivers: { code: string; name: string }[];
  gap: number | null;
}

/** The last answer, so a returning visitor sees the card at once */
const LATEST_KEY = 'landing:latest-qualifying';
/** Shown until the first answer arrives: the latest qualifying when this was written */
const LAST_KNOWN_QUALIFYING: LatestQualifying = {
  year: 2026, round: 19, location: 'Mexico City',
  drivers: [{ code: 'HAM', name: 'Hamilton' }, { code: 'RUS', name: 'Russell' }], gap: 0.009,
};

function storedLatest(): LatestQualifying | null {
  try {
    const raw = localStorage.getItem(LATEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function latestCard({ year, round, location, drivers: [p1, p2], gap }: LatestQualifying): Featured {
  return {
    year,
    event: location,
    session: 'Qualifying',
    short: 'Quali',
    title: `${p1.name} vs ${p2.name}`,
    line: gap != null ? `Pole by ${gap.toFixed(3)} s.` : 'The front row, lap against lap.',
    page: 'Telemetry',
    to: `/app?y=${year}&v=trace&gp=${round}&s=Q&d1=${p1.code}&d2=${p2.code}&cmp=${p1.code},${p2.code}`,
  };
}

/** The cards after the latest qualifying's, picked by hand */
const FEATURED: Featured[] = [
  {
    year: 2026,
    event: 'Season',
    session: 'Head to head',
    short: 'H2H',
    title: 'Hamilton vs Leclerc',
    line: "Ferrari's two drivers, race by race.",
    page: 'Statistics',
    to: '/stats?y=2026&d1=HAM&d2=LEC',
  },
  {
    year: 2021,
    event: 'Abu Dhabi',
    session: 'Qualifying',
    short: 'Quali',
    title: 'Verstappen vs Hamilton',
    line: 'The pole laps before the title decider.',
    page: 'Telemetry',
    to: '/app?y=2021&v=trace&gp=22&s=Q&d1=VER&d2=HAM&cmp=VER,HAM',
  },
];

const MONO = { fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' as const };

/** One card; `compact` on phones, where the three sit side by side in a third of the width each */
function FeaturedCard({ item, compact }: { item: Featured; compact: boolean }) {
  return (
    <Link
      to={item.to}
      style={{
        display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6, textAlign: 'left', textDecoration: 'none',
        padding: compact ? '12px 8px' : '16px 18px', border: `1px solid ${P.textGhost}`, color: P.text,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = P.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = P.textGhost; }}
    >
      <span style={{ ...MONO, fontSize: compact ? 'var(--fs-7)' : 'var(--fs-8)', letterSpacing: compact ? '0.02em' : '0.16em', lineHeight: 1.5, color: P.textSub }}>
        {compact ? <>{item.event}<br />{item.year} · {item.short}</> : `${item.year} ${item.event} · ${item.session}`}
      </span>
      <span style={{ fontWeight: 700, fontSize: compact ? 15 : 20, letterSpacing: compact ? '0.02em' : '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}>
        {item.title}
      </span>
      {!compact && <span style={{ fontSize: 15, color: P.textSub, lineHeight: 1.3 }}>{item.line}</span>}
      <span style={{ ...MONO, fontSize: compact ? 'var(--fs-7)' : 'var(--fs-8)', letterSpacing: compact ? '0.02em' : '0.2em', whiteSpace: 'nowrap', marginTop: 'auto', paddingTop: 6 }}>
        {item.page} →
      </span>
    </Link>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

interface CalendarRace { round: number; location: string; country: string; date_start: string; }

const CALENDAR_YEAR = CURRENT_SEASON_YEAR;
/** The last calendar fetched, so a returning visitor sees the next race at once */
const CALENDAR_KEY = `landing:calendar:${CALENDAR_YEAR}`;

function storedCalendar(): CalendarRace[] | null {
  try {
    const stored = localStorage.getItem(CALENDAR_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getNextRace(calendar: CalendarRace[]): CalendarRace | null {
  const now = new Date();
  const upcoming = calendar.find(r => new Date(r.date_start) > now);
  return upcoming ?? calendar[calendar.length - 1] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface Countdown { days: number; hours: number; minutes: number; seconds: number; }

function computeCountdown(targetDate: string): Countdown {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  / 60_000),
    seconds: Math.floor((diff % 60_000)     / 1000),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [calendar, setCalendar] = useState<CalendarRace[] | null>(storedCalendar);
  const [latest, setLatest] = useState<LatestQualifying>(() => storedLatest() ?? LAST_KNOWN_QUALIFYING);
  const [cd, setCd] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetch(`${getApiBase()}/calendar/${CALENDAR_YEAR}`)
      .then(r => r.json())
      .then(d => {
        setCalendar(d.calendar || []);
        try { localStorage.setItem(CALENDAR_KEY, JSON.stringify(d.calendar || [])); } catch { /* private mode */ }
      })
      .catch(() => setCalendar(current => current ?? []));
  }, []);

  useEffect(() => {
    fetch(`${getApiBase()}/latest-qualifying`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((q: LatestQualifying) => {
        setLatest(q);
        try { localStorage.setItem(LATEST_KEY, JSON.stringify(q)); } catch { /* private mode */ }
      })
      .catch(() => { /* the stored or last known card stays */ });
  }, []);

  const race = calendar ? getNextRace(calendar) : null;

  useEffect(() => {
    if (!race) return;
    setCd(computeCountdown(race.date_start));
    const id = setInterval(() => setCd(computeCountdown(race.date_start)), 1000);
    return () => clearInterval(id);
  }, [race]);

  const units = [
    { value: cd.days,    label: 'DAYS' },
    { value: cd.hours,   label: 'HRS'  },
    { value: cd.minutes, label: 'MIN'  },
    { value: cd.seconds, label: 'SEC'  },
  ];

  // The page is drawn at once; the race's name and countdown fill their
  // reserved places when the calendar arrives
  const blank = '\u00a0';

  return (
    <>
    <SEO page={sitePages(CURRENT_SEASON_YEAR).home} />
    <main style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflowX: 'hidden',
      width: '100%',
      background: P.bg,
      position: 'relative',
      fontFamily: "'Rajdhani', sans-serif",
    }}>

      {/* ── Ambient glow ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '45%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 500,
        background: `radial-gradient(ellipse at center, ${P.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: isMobile ? '18px 16px' : '28px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700, fontSize: 13,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: P.text,
        }}>
          METRIK DELTA
        </span>
        {!isMobile && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'var(--fs-9)', letterSpacing: '0.18em',
            color: P.textSub, textTransform: 'uppercase',
          }}>
            Race Telemetry Platform
          </span>
        )}
      </div>

      {/* ── Center content ──────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: isMobile ? '72px 16px 32px' : '96px 24px 36px',
      }}>

        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'var(--fs-8)', letterSpacing: '0.30em', textTransform: 'uppercase',
          color: P.accent,
        }}>
          Next Grand Prix
        </span>

        <h1 style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 600, fontSize: 'clamp(20px, 2.4vw, 28px)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: P.text, margin: '12px 0 0', lineHeight: 1,
        }}>
          {race ? `${race.location} Grand Prix` : blank}
        </h1>

        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'var(--fs-9)', letterSpacing: '0.12em',
          color: P.textSub,
          margin: '8px 0 0', textTransform: 'uppercase',
        }}>
          {race?.country ?? blank}
        </p>

        <p style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 400, fontSize: 'clamp(13px, 1.2vw, 15px)',
          letterSpacing: '0.04em', lineHeight: 1,
          color: P.textSub,
          margin: '20px 0 0',
        }}>
          Speed, throttle, braking — any driver, any lap.
        </p>

        <div style={{
          width: 1, height: 36,
          background: `linear-gradient(to bottom, transparent, ${P.textGhost}, transparent)`,
          margin: '32px 0',
        }} />

        {/* Countdown */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '10px' : 'clamp(12px, 2vw, 28px)' }}>
          {units.map(({ value, label }, i) => (
            <Fragment key={label}>
              {i > 0 && (
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 48px)',
                  color: P.textGhost,
                  lineHeight: 1, alignSelf: 'flex-start', marginTop: 2,
                }}>:</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700, fontSize: 'clamp(32px, 4.5vw, 60px)',
                  color: P.text, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.01em',
                }}>
                  {race ? pad(value) : '--'}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'var(--fs-7)', letterSpacing: '0.20em',
                  color: P.textSub, textTransform: 'uppercase',
                }}>
                  {label}
                </span>
              </div>
            </Fragment>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/app')}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 400, fontSize: 'var(--fs-10)',
            letterSpacing: '0.26em', textTransform: 'uppercase',
            color: P.textSub,
            background: 'transparent',
            border: `1px solid ${P.textGhost}`,
            padding: '12px 40px',
            marginTop: 40,
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
            outline: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = P.text;
            e.currentTarget.style.color = P.text;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = P.textGhost;
            e.currentTarget.style.color = P.textSub;
          }}
        >
          Enter
        </button>
      </div>

      {/* ── Ready-made comparisons ──────────────────────────────────────────── */}
      <section style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: isMobile ? '0 12px 32px' : '0 24px 40px', boxSizing: 'border-box', position: 'relative' }}>
        <h2 style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 400,
          fontSize: 'var(--fs-8)', letterSpacing: '0.30em', textTransform: 'uppercase',
          color: P.accent, textAlign: 'center', margin: '0 0 16px',
        }}>
          Start with
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 12 }}>
          {[latestCard(latest), ...FEATURED].map(item => <FeaturedCard key={item.to} item={item} compact={isMobile} />)}
        </div>
      </section>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        padding: isMobile ? '16px 16px 20px' : '20px 36px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between',
        gap: isMobile ? 10 : 0,
      }}>
        {!isMobile && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'var(--fs-8)', letterSpacing: '0.16em', textTransform: 'uppercase',
            color: P.textSub,
          }}>
            Powered by OpenF1 API
          </span>
        )}
        <LegalLinks color={P.textSub} hoverColor={P.text} fontSize="var(--fs-8)" />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'var(--fs-8)', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: P.textSub,
        }}>
          R{race ? String(race.round).padStart(2, '0') : '--'} / {calendar?.length || '--'} · {CALENDAR_YEAR} Season
        </span>
      </div>

    </main>
    </>
  );
}
