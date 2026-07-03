import React, { useMemo } from 'react';
import { TimeFormatter } from '../util/TimeFormatter.js';
import { Graphic } from './Graphic.jsx';
import { Stat } from './Stat.jsx';

/** Human-readable labels for the §4.6 sun states, used as the card title. */
const STATE_LABEL = {
  polarNight: 'Polar Night',
  astronomicalDawn: 'Astronomical Dawn',
  nauticalDawn: 'Nautical Dawn',
  dawn: 'Dawn',
  sunrise: 'Sunrise',
  day: 'Day',
  polarDay: 'Polar Day',
  sunset: 'Sunset',
  dusk: 'Dusk',
  nauticalDusk: 'Nautical Dusk',
  astronomicalDusk: 'Astronomical Dusk',
  night: 'Night',
};

/**
 * Sun card (§6.6): 4:3 graphic (via the ImageProvider) + sunrise, sunset,
 * solar noon and day length. `state` drives the graphic and the title (the
 * current phase of day).
 */
export function SunCard(props) {
  const { data, provider, loading, formatter } = props;
  const sun = data && data.sun;

  const node = useMemo(
    () => (sun ? provider.getSunImage(sun.state) : null),
    [sun, provider]
  );

  const title = sun ? (STATE_LABEL[sun.state] || 'Sun') : 'Sun';

  return (
    <section className="card card--sun">
      <Graphic node={node} loading={loading && !sun} label="Sun" />
      <div className="card__body">
        <h2 className="card__title">{title}</h2>
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
