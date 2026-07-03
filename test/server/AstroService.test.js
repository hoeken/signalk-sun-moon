import { describe, it, expect } from 'vitest';
import AstroService from '../../server/AstroService.js';
import DateWindow from '../../server/DateWindow.js';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('AstroService.phaseName (§4.7)', () => {
  it('snaps the four cardinal phases (with the ~half-day tolerance)', () => {
    expect(AstroService.phaseName(0)).toBe('New Moon');
    expect(AstroService.phaseName(0.999)).toBe('New Moon'); // wraps back toward new
    expect(AstroService.phaseName(0.25)).toBe('First Quarter');
    expect(AstroService.phaseName(0.5)).toBe('Full Moon');
    expect(AstroService.phaseName(0.75)).toBe('Last Quarter');
  });

  it('names the intermediate phases', () => {
    expect(AstroService.phaseName(0.1)).toBe('Waxing Crescent');
    expect(AstroService.phaseName(0.35)).toBe('Waxing Gibbous');
    expect(AstroService.phaseName(0.6)).toBe('Waning Gibbous');
    expect(AstroService.phaseName(0.9)).toBe('Waning Crescent');
  });
});

describe('AstroService.cardinalOnDay (§4.7)', () => {
  it('returns null for non-numeric input', () => {
    expect(AstroService.cardinalOnDay(null, 0.5)).toBeNull();
    expect(AstroService.cardinalOnDay(0.5, undefined)).toBeNull();
  });

  it('detects a cardinal crossed within the day, including the wrap through new moon', () => {
    expect(AstroService.cardinalOnDay(0.98, 0.02)).toBe('New Moon');
    expect(AstroService.cardinalOnDay(0.24, 0.26)).toBe('First Quarter');
    expect(AstroService.cardinalOnDay(0.49, 0.51)).toBe('Full Moon');
    expect(AstroService.cardinalOnDay(0.74, 0.76)).toBe('Last Quarter');
  });

  it('returns null when no cardinal instant falls inside the day', () => {
    expect(AstroService.cardinalOnDay(0.3, 0.32)).toBeNull();
    expect(AstroService.cardinalOnDay(0.6, 0.62)).toBeNull();
  });
});

describe('AstroService.resolveSunState (§4.6)', () => {
  // Synthetic set of twilight events for one UTC day.
  const at = (h, m) => new Date(Date.UTC(2026, 6, 3, h, m, 0));
  const times = {
    nightEnd: at(4, 30),
    nauticalDawn: at(5, 0),
    dawn: at(5, 30),
    sunrise: at(6, 0),
    sunriseEnd: at(6, 5),
    sunsetStart: at(20, 0),
    sunset: at(20, 5),
    dusk: at(20, 30),
    nauticalDusk: at(21, 0),
    night: at(21, 30),
  };
  const NOT_POLAR = { alwaysUp: false, alwaysDown: false };
  const state = (h, m) => AstroService.resolveSunState(at(h, m).getTime(), times, NOT_POLAR, 0);

  it('short-circuits on polar day/night before looking at events', () => {
    expect(AstroService.resolveSunState(0, times, { alwaysUp: true }, -50)).toBe('polarDay');
    expect(AstroService.resolveSunState(0, times, { alwaysDown: true }, 50)).toBe('polarNight');
  });

  it('classifies each twilight/day interval', () => {
    expect(state(6, 2)).toBe('sunrise');
    expect(state(12, 0)).toBe('day');
    expect(state(20, 2)).toBe('sunset');
    expect(state(5, 45)).toBe('dawn');
    expect(state(20, 15)).toBe('dusk');
    expect(state(5, 10)).toBe('nauticalDawn');
    expect(state(20, 45)).toBe('nauticalDusk');
    expect(state(4, 45)).toBe('astronomicalDawn');
    expect(state(21, 15)).toBe('astronomicalDusk');
  });

  it('reports deep night when the instant is outside every interval on a normal day', () => {
    expect(state(2, 0)).toBe('night');
  });

  it('falls back to altitude when twilight events are unavailable', () => {
    expect(AstroService.resolveSunState(0, {}, NOT_POLAR, 10)).toBe('day');
    expect(AstroService.resolveSunState(0, {}, NOT_POLAR, -3)).toBe('night');
  });
});

describe('AstroService.compute — full response body (§4.5)', () => {
  const astro = new AstroService();
  // A fixed past "now" so the requested day is never "today": evaluatedAt is the
  // deterministic local-noon anchor, making the whole response reproducible.
  const past = new Date('2020-01-01T00:00:00Z');

  it('assembles a well-formed body for a mid-latitude summer day', () => {
    const win = new DateWindow('2026-07-03', -74.006, past);
    const body = astro.compute({
      lat: 40.712812345,
      lon: -74.006,
      source: 'query',
      dateWindow: win,
    });

    expect(body.version).toBe(1);
    expect(body.requestedDate).toBe('2026-07-03');
    expect(body.position).toEqual({ latitude: 40.71281, longitude: -74.006, source: 'query' });
    expect(body.dayWindowUtc.start).toBe(win.start.toISOString());
    expect(body.dayWindowUtc.end).toBe(win.end.toISOString());
    expect(body.evaluatedAt).toBe(win.evaluatedAt.toISOString());
    expect(body.generatedAt).toMatch(ISO_RE);

    // Sun: a normal day has a real sunrise/sunset and a positive day length.
    expect(body.sun.times.sunrise).toMatch(ISO_RE);
    expect(body.sun.times.sunset).toMatch(ISO_RE);
    expect(body.sun.polar).toEqual({ alwaysUp: false, alwaysDown: false });
    expect(typeof body.sun.now.altitudeDeg).toBe('number');
    expect(typeof body.sun.now.azimuthDeg).toBe('number');
    expect(typeof body.sun.state).toBe('string');
    expect(body.sun.dayLengthSeconds).toBeGreaterThan(0);
    expect(body.sun.dayLengthSeconds).toBeLessThanOrEqual(86400);

    // Moon: illumination fraction/phase are normalised, names are strings.
    expect(body.moon.illumination.fraction).toBeGreaterThanOrEqual(0);
    expect(body.moon.illumination.fraction).toBeLessThanOrEqual(1);
    expect(body.moon.illumination.phase).toBeGreaterThanOrEqual(0);
    expect(body.moon.illumination.phase).toBeLessThan(1);
    expect(typeof body.moon.illumination.phaseName).toBe('string');
    expect(typeof body.moon.illumination.waxing).toBe('boolean');
    expect(
      body.moon.illumination.cardinalToday === null ||
        typeof body.moon.illumination.cardinalToday === 'string'
    ).toBe(true);
    expect(body.moon.now.distanceKm).toBeGreaterThan(0);
    expect(typeof body.moon.brightLimb.zenithAngleDeg).toBe('number');
  });

  it('reports polar day at a high latitude in local summer', () => {
    const win = new DateWindow('2026-07-03', 15, past);
    const body = astro.compute({ lat: 78, lon: 15, source: 'query', dateWindow: win });
    expect(body.sun.polar.alwaysUp).toBe(true);
    expect(body.sun.state).toBe('polarDay');
    expect(body.sun.dayLengthSeconds).toBe(86400);
    expect(body.sun.times.sunrise).toBeNull();
  });

  it('reports polar night at a high latitude in local winter', () => {
    const win = new DateWindow('2026-01-03', 15, past);
    const body = astro.compute({ lat: 78, lon: 15, source: 'query', dateWindow: win });
    expect(body.sun.polar.alwaysDown).toBe(true);
    expect(body.sun.state).toBe('polarNight');
    expect(body.sun.dayLengthSeconds).toBe(0);
  });
});
