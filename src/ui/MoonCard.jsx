import React, { useEffect, useMemo } from 'react';
import { Graphic } from './Graphic.jsx';
import { Stat } from './Stat.jsx';

/**
 * Moon card (§6.6): observer-oriented graphic (via the ImageProvider) + phase
 * name, % illuminated, moonrise/moonset and waxing/waning. Missing rise/set
 * render as "—" with an explanatory tooltip.
 */
export function MoonCard(props) {
  const { data, provider, loading, formatter } = props;
  const moon = data && data.moon;

  const node = useMemo(
    () => (moon ? provider.getMoonImage(moon) : null),
    [moon, provider]
  );

  // Warm the cache for the adjacent days' moon frames so paging is smooth.
  useEffect(() => {
    if (moon) provider.preloadMoon(moon);
  }, [moon, provider]);

  const illum = moon && moon.illumination;
  const pct = illum && typeof illum.fraction === 'number'
    ? Math.round(illum.fraction * 100) + '%' : '—';
  const title = illum ? illum.phaseName : 'Moon';
  const phase = illum ? (illum.waxing ? 'Waxing' : 'Waning') : '—';

  return (
    <section className="card card--moon">
      <Graphic node={node} loading={loading && !moon} label="Moon" />
      <div className="card__body">
        <h2 className="card__title">{title}</h2>
        <dl className="stats">
          <Stat label="Moonrise" value={moon ? formatter.time(moon.times.rise) : '—'}
            title={moon && !moon.times.rise ? moonNote(moon, 'rise') : undefined} />
          <Stat label="Moonset" value={moon ? formatter.time(moon.times.set) : '—'}
            title={moon && !moon.times.set ? moonNote(moon, 'set') : undefined} />
          <Stat label="Phase" value={phase} />
          <Stat label="Illuminated" value={pct} />
        </dl>
      </div>
    </section>
  );
}

function moonNote(moon, which) {
  if (moon.polar && moon.polar.alwaysUp) return 'The moon is above the horizon all day.';
  if (moon.polar && moon.polar.alwaysDown) return 'The moon is below the horizon all day.';
  return 'The moon does not ' + which + ' today.';
}
