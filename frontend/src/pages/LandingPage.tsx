import { Fragment, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      ...(isMobile ? { minHeight: '100dvh', height: 'auto', overflowX: 'hidden', overflowY: 'visible' }
                   : { height: '100dvh', overflow: 'hidden' }),
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
        height: isMobile ? 'auto' : '100%',
        minHeight: isMobile ? '100dvh' : undefined,
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: isMobile ? '64px 16px 140px' : '80px 24px',
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

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: isMobile ? '16px 16px 20px' : '24px 36px',
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
