import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { sitePages, STATISTICS_SINCE } from '../seo/pages';
import PageHeader from '../components/PageHeader';
import UpgradeModal from '../components/UpgradeModal';
import LegalLinks from '../components/LegalLinks';
import ComparisonCard from '../components/stats/ComparisonCard';
import DetailCard from '../components/stats/DetailCard';
import RaceLog from '../components/stats/RaceLog';
import { ConstructorStandings, DriverStandings } from '../components/stats/Standings';
import { MONO, pairColors } from '../components/stats/shared';
import { useSubscription, CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { useIsMobile } from '../hooks/useIsMobile';
import { useRememberPageUrl } from '../hooks/usePageMemory';
import {
  constructorStandings, driverCode, driverStandings, fetchEntryList, fetchSeason, headToHead,
  raceClassifications, seasonDrivers,
} from '../stats/season';
import type { HoveredMetric, SeasonBundle, SeasonDriver } from '../stats/types';
import { inkOn, teamColor } from '../utils/teamColors';

const labelStyle = {
  fontFamily: MONO, fontSize: 'var(--fs-7)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)',
} as const;

/** Places held for the drivers and the detail card while a season loads on
 * mobile, where they sit above the comparison: without them it jumps down by
 * their height when they arrive. Most seasons have 21 to 24 drivers (6 rows). */
const DRIVER_PLACES = 24;
const DETAIL_PLACE = 71;

export default function StatisticsPage() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  useRememberPageUrl();
  const { canAccessYear, isReady: subscriptionReady } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Restored from the URL, so a refresh or a shared link shows the same comparison
  const [year, setYear] = useState(() => parseInt(searchParams.get('y') || String(CURRENT_SEASON_YEAR - 1)));
  const [driver1, setDriver1] = useState(() => searchParams.get('d1') || '');
  const [driver2, setDriver2] = useState(() => searchParams.get('d2') || '');

  const [season, setSeason] = useState<SeasonBundle | null>(null);
  const [drivers, setDrivers] = useState<SeasonDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoveredMetric>(null);

  // Everything below comes from the loaded season: switching drivers makes no request
  const h2h = useMemo(
    () => (season && driver1 && driver2 && driver1 !== driver2 ? headToHead(season, driver1, driver2) : null),
    [season, driver1, driver2],
  );
  const standings = useMemo(() => (season ? driverStandings(season) : []), [season]);
  const constructors = useMemo(() => (season ? constructorStandings(season) : []), [season]);
  const classifications = useMemo(() => (season ? raceClassifications(season) : {}), [season]);
  const [color1, color2] = h2h ? pairColors(h2h.driver1.team, h2h.driver2.team) : ['', ''];

  const toggleDriver = (code: string) => {
    if (driver1 === code) setDriver1('');
    else if (driver2 === code) setDriver2('');
    else if (!driver1) setDriver1(code);
    else if (!driver2) setDriver2(code);
    else setDriver1(code);
  };

  const urlSyncReady = useRef(false);
  useEffect(() => {
    if (!urlSyncReady.current) { urlSyncReady.current = true; return; }
    const p: Record<string, string> = { y: String(year) };
    if (driver1) p.d1 = driver1;
    if (driver2) p.d2 = driver2;
    setSearchParams(p, { replace: true });
  }, [year, driver1, driver2]); // eslint-disable-line react-hooks/exhaustive-deps

  // A current-season link loads before the subscription is known: once it
  // is, a viewer without PRO goes back to the last free season.
  useEffect(() => {
    if (subscriptionReady && !canAccessYear(year)) {
      setYear(CURRENT_SEASON_YEAR - 1);
      setShowUpgradeModal(true);
    }
  }, [subscriptionReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compared with the previous year rather than a first-run flag, which
  // StrictMode's double effect run would flip and wipe a deep-linked pair.
  const prevYearRef = useRef(year);
  useEffect(() => {
    const isYearChange = prevYearRef.current !== year;
    prevYearRef.current = year;
    loadSeason(year, isYearChange);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSeason(requestedYear: number, resetSelection: boolean) {
    setDrivers([]);
    setSeason(null);
    setError(null);
    setLoading(true);
    if (resetSelection) {
      setDriver1('');
      setDriver2('');
    }
    try {
      const bundle = await fetchSeason(requestedYear);
      if (prevYearRef.current !== requestedYear) return; // another season was picked meanwhile

      let list = seasonDrivers(bundle);
      if (list.length === 0) {
        // Not started yet: the entry list, with teams from the standings if any
        const teams = new Map(bundle.driverStandings.map(s => [s.Driver.driverId, s.Constructors?.[0]?.name || 'Unknown']));
        const entries = await fetchEntryList(requestedYear);
        if (prevYearRef.current !== requestedYear) return;
        list = [...new Map(entries.map(d => [driverCode(d), { code: driverCode(d), team: teams.get(d.driverId) || 'Unknown' }])).values()]
          .sort((a, b) => a.code.localeCompare(b.code));
        if (list.length === 0) {
          setError(`No driver data available for ${requestedYear}`);
          return;
        }
      }

      setDrivers(list);
      setSeason(bundle);
      // A default pair only when nothing was picked (or deep-linked) before this load
      if (driver1 || driver2) return;
      setDriver1(list[0].code);
      setDriver2(list[1]?.code || '');
    } catch (err) {
      console.error('Error loading season:', err);
      setError('Failed to load drivers for this season.');
    } finally {
      if (prevYearRef.current === requestedYear) setLoading(false);
    }
  }

  const changeYear = (newYear: number) => {
    if (!canAccessYear(newYear)) {
      setShowUpgradeModal(true);
      return;
    }
    setYear(newYear);
  };

  const placeholder = loading ? 'Loading H2H...' : driver1 && driver2 ? 'Loading...' : 'Select two drivers';

  return (
    <>
    <SEO page={sitePages(CURRENT_SEASON_YEAR).statistics} />
    <div className="data-zone" style={{
      ...(isMobile ? { minHeight: '100vh', height: 'auto' } : { height: '100vh', overflow: 'hidden' }),
      display: 'grid', gridTemplateRows: isMobile ? 'auto 1fr' : '44px 1fr', gridTemplateColumns: 'minmax(0, 1fr)',
    }}>
      <PageHeader page="statistics" />

      <main style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'visible' : 'hidden',
      }}>

        {/* ── Left panel: season, drivers, detail card ─────────────────────── */}
        <div style={{
          width: isMobile ? '100%' : 256, flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          overflowY: isMobile ? 'visible' : 'auto',
        }}>
          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 5 }}>Season</span>
              <select
                value={year}
                aria-label="Season"
                onChange={e => changeYear(Number(e.target.value))}
                style={{
                  width: '100%', padding: '7px 28px 7px 10px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  color: 'var(--text)',
                  fontFamily: MONO, fontSize: 'var(--fs-10)',
                  outline: 'none', cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {Array.from({ length: CURRENT_SEASON_YEAR - STATISTICS_SINCE + 1 }, (_, i) => CURRENT_SEASON_YEAR - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />

          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={labelStyle}>Drivers</span>
              {(driver1 || driver2) && (
                <button
                  onClick={() => { setDriver1(''); setDriver2(''); }}
                  style={{
                    fontFamily: MONO, fontSize: 'var(--fs-7)', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--accent)', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {isMobile && loading && drivers.length === 0 && Array.from({ length: DRIVER_PLACES }, (_, i) => (
                <span key={i} aria-hidden style={{ ...driverBox(isMobile), border: '1px solid var(--border)', opacity: 0.4 }}>{'\u00a0'}</span>
              ))}
              {drivers.map(driver => {
                const isFirst = driver1 === driver.code;
                const isSecond = driver2 === driver.code;
                const isSelected = isFirst || isSecond;
                const team1 = drivers.find(d => d.code === driver1)?.team;
                const color = isSecond && team1 ? pairColors(team1, driver.team)[1] : teamColor(driver.team);
                return (
                  <button
                    key={driver.code}
                    onClick={() => toggleDriver(driver.code)}
                    disabled={loading}
                    style={{
                      ...driverBox(isMobile), position: 'relative',
                      border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                      background: isSelected ? color : 'transparent',
                      color: isSelected ? inkOn(color) : 'var(--text-2)',
                      cursor: loading ? 'not-allowed' : 'pointer', outline: 'none',
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.12s',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: -6, right: -4, width: 14, height: 14, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--fs-8)', fontWeight: 700, background: inkOn(color), color,
                      }}>
                        {isFirst ? '1' : '2'}
                      </div>
                    )}
                    {driver.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ margin: '0 14px', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 'var(--fs-10)', lineHeight: 1.6, color: 'var(--text-3)', letterSpacing: '0.02em' }}>
              Select two drivers to compare their head-to-head record for the season.
            </p>
          </div>

          {isMobile && loading && !h2h && <div aria-hidden style={{ height: DETAIL_PLACE }} />}
          {h2h && (
            <div style={{ margin: '0 14px', paddingBottom: 12 }}>
              <DetailCard h2h={h2h} hovered={hovered} classifications={classifications} color1={color1} color2={color2} />
            </div>
          )}

          {/* Pinned to the bottom of the sidebar, whatever the detail card's height */}
          <div style={{ margin: isMobile ? '0 14px 14px' : 'auto 14px 14px', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize="var(--fs-8)" />
          </div>
        </div>

        {/* ── Right: comparison, standings, race log ───────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          overflowY: isMobile ? 'visible' : 'auto', overflowX: 'hidden',
          padding: 12, display: 'flex', flexDirection: 'column', background: 'var(--bg)',
        }}>
          {error && (
            <div style={{ marginBottom: 12, flexShrink: 0, background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
              <p style={{ color: '#ff6b6b', fontFamily: MONO, fontSize: 'var(--fs-11)', textAlign: 'center', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ flex: isMobile ? undefined : 1, minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: isMobile ? undefined : 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: isMobile ? '100%' : 460 }}>
              <ComparisonCard h2h={h2h} placeholder={placeholder} color1={color1} color2={color2} hovered={hovered} onHover={setHovered} />
            </div>
            {standings.length > 0 && (
              <DriverStandings standings={standings} selected={[driver1, driver2]} disabled={loading} isMobile={isMobile} onSelect={toggleDriver} />
            )}
            {constructors.length > 0 && <ConstructorStandings standings={constructors} isMobile={isMobile} />}
          </div>

          {h2h && h2h.raceLog.length > 0 && (
            <RaceLog h2h={h2h} color1={color1} color2={color2} hovered={hovered} onHover={setHovered} isMobile={isMobile} />
          )}
        </div>
      </main>
    </div>

    <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="current_season" />
    </>
  );
}

/** A driver button's box, shared with the places held while a season loads */
function driverBox(isMobile: boolean): CSSProperties {
  return {
    padding: isMobile ? '11px 2px' : '6px 2px', borderRadius: 'var(--r)',
    fontFamily: MONO, fontWeight: 600, fontSize: 'var(--fs-9)', textAlign: 'center',
  };
}
