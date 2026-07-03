import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient } from '../api/ApiClient.js';
import { DateController } from '../util/DateController.js';
import { TimeFormatter } from '../util/TimeFormatter.js';
import { GeneratedImageProvider } from '../graphics/GeneratedImageProvider.js';
import { StaticImageProvider } from '../graphics/StaticImageProvider.js';
import { IMAGE_STYLE_DEFAULT } from '../config.js';
import { Toolbar } from './Toolbar.jsx';
import { SunCard } from './SunCard.jsx';
import { MoonCard } from './MoonCard.jsx';

/** Pick the graphics provider by style name (§6.5). */
function makeProvider(style) {
  return style === 'static' ? new StaticImageProvider() : new GeneratedImageProvider();
}

/** Allow overriding the graphic style via ?imageStyle=static for demos/testing. */
function resolveImageStyle() {
  try {
    const q = new URLSearchParams(window.location.search).get('imageStyle');
    if (q === 'static' || q === 'generated') return q;
  } catch (e) { /* ignore */ }
  return IMAGE_STYLE_DEFAULT;
}

/**
 * Root component (§6.3): owns the selected date (via DateController), the last
 * response, and loading/error state; fetches through ApiClient in an effect;
 * renders the toolbar + sun/moon cards.
 */
export function App() {
  const controllerRef = useRef(null);
  if (!controllerRef.current) controllerRef.current = new DateController();
  const apiRef = useRef(null);
  if (!apiRef.current) apiRef.current = new ApiClient();

  const [date, setDate] = useState(controllerRef.current.value);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reqId = useRef(0);
  const formatter = useMemo(() => new TimeFormatter(), []);
  const provider = useMemo(() => makeProvider(resolveImageStyle()), []);

  const load = useCallback((d) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    apiRef.current.fetch({ date: d }).then((body) => {
      if (id !== reqId.current) return; // a newer request superseded this one
      setData(body);
      setLoading(false);
    }).catch((err) => {
      if (id !== reqId.current) return;
      setError(err);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const onPrev = useCallback(() => setDate(controllerRef.current.prev()), []);
  const onNext = useCallback(() => setDate(controllerRef.current.next()), []);
  const onToday = useCallback(() => setDate(controllerRef.current.setToday()), []);
  const onSet = useCallback((d) => setDate(controllerRef.current.set(d)), []);

  const isToday = controllerRef.current.isToday();

  return (
    <div className="app">

      {error ? (
        <div className="banner banner--error" role="alert">
          <strong>Couldn’t load data.</strong> {error.message}
        </div>
      ) : null}

      <main className="cards">
        <SunCard data={data} provider={provider} loading={loading} formatter={formatter} />
        <MoonCard data={data} provider={provider} loading={loading} formatter={formatter} />
      </main>

      <Toolbar
        date={date}
        isToday={isToday}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onSet={onSet}
        loading={loading}
        position={data && data.position}
        timeZone={formatter.timeZoneName()}
      />
      
      <footer className="app__footer">
        <span>
          Times shown in your local time zone. Astronomy by <a href="https://www.npmjs.com/package/suncalc">suncalc</a>.
        </span>
      </footer>
    </div>
  );
}
