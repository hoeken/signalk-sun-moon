import React, { useMemo } from 'react';
import { TimeFormatter } from '../util/TimeFormatter.js';
import { Graphic } from './Graphic.jsx';
import { Stat } from './Stat.jsx';

/**
 * Sun card (§6.6): square graphic (via the ImageProvider) + sunrise, sunset,
 * solar noon and day length. `state` drives the graphic but isn't listed as text.
 */
export function SunCard(props) {
  const { data, provider, loading, formatter } = props;
  const sun = data && data.sun;

  const node = useMemo(
    () => (sun ? provider.getSunImage(sun.state) : null),
    [sun, provider]
  );

  return (
    <section className="card card--sun">
      <Graphic node={node} loading={loading && !sun} label="Sun" />
      <div className="card__body">
        <h2 className="card__title">Sun</h2>
        <dl className="stats">
          <Stat label="Sunrise" value={sun ? formatter.time(sun.times.sunrise) : '—'}
            title={sun && !sun.times.sunrise ? sunNote(sun, 'rise') : undefined} />
          <Stat label="Sunset" value={sun ? formatter.time(sun.times.sunset) : '—'}
            title={sun && !sun.times.sunset ? sunNote(sun, 'set') : undefined} />
          <Stat label="Solar noon" value={sun ? formatter.time(sun.times.solarNoon) : '—'} />
          <Stat label="Day length" value={sun ? TimeFormatter.duration(sun.dayLengthSeconds) : '—'} />
        </dl>
      </div>
    </section>
  );
}

function sunNote(sun, which) {
  if (sun.polar && sun.polar.alwaysUp) return 'Polar day: the sun does not ' + which + ' today.';
  if (sun.polar && sun.polar.alwaysDown) return 'Polar night: the sun does not ' + which + ' today.';
  return 'The sun does not ' + which + ' today.';
}
