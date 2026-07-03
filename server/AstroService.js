"use strict";

var SunCalc = require("suncalc");

// Cardinal-phase tolerance (~half a day) so the four cardinal phases get named
// exactly (§4.7).
var PHASE_EPS = 0.0167;

/**
 * Wraps suncalc (v2) and assembles the full §4.5 response body. Stateless: one
 * `compute()` call per request. All angles are already degrees / north-based in
 * suncalc v2, so no rad↔deg or azimuth conversion is needed (§8).
 */
function AstroService() {}

AstroService.prototype.compute = function (input) {
  var lat = input.lat;
  var lon = input.lon;
  var source = input.source;
  var win = input.dateWindow;

  var anchor = win.anchor;         // defines *which* calendar day (local noon)
  var evalAt = win.evaluatedAt;    // instant for all point-in-time values (§4.4)

  // ---- Sun ----------------------------------------------------------------
  var sunTimes = SunCalc.getTimes(anchor, lat, lon);
  var sunPolar = { alwaysUp: sunTimes.alwaysUp === true, alwaysDown: sunTimes.alwaysDown === true };
  var sunPos = SunCalc.getPosition(evalAt, lat, lon);
  var sunState = resolveSunState(evalAt.getTime(), sunTimes, sunPolar, sunPos.altitude);
  var dayLengthSeconds = computeDayLength(sunTimes, sunPolar);

  // ---- Moon ---------------------------------------------------------------
  var moonTimes = SunCalc.getMoonTimes(anchor, lat, lon);
  var moonPolar = { alwaysUp: moonTimes.alwaysUp === true, alwaysDown: moonTimes.alwaysDown === true };
  var moonPos = SunCalc.getMoonPosition(evalAt, lat, lon);
  var illum = SunCalc.getMoonIllumination(evalAt);

  // Which cardinal phase (if any) actually occurs *during this calendar day*,
  // regardless of where the noon sample falls (§4.7). Lets the UI show the
  // new/full/quarter graphic on the day the event happens.
  var cardinalToday = cardinalOnDay(
    SunCalc.getMoonIllumination(win.start).phase,
    SunCalc.getMoonIllumination(win.end).phase,
  );

  // Zenith angle of the bright limb (anticlockwise), per the suncalc docs:
  //   zenithAngle = illumination.angle - moonPosition.parallacticAngle  (§8)
  var zenithAngleDeg = illum.angle - moonPos.parallacticAngle;

  return {
    requestedDate: win.requestedDate,
    position: {
      latitude: round(lat, 5),
      longitude: round(lon, 5),
      source: source,
    },
    dayWindowUtc: {
      start: toIso(win.start),
      end: toIso(win.end),
    },
    evaluatedAt: toIso(evalAt),
    sun: {
      times: {
        nadir: toIso(sunTimes.nadir),
        nightEnd: toIso(sunTimes.nightEnd),
        nauticalDawn: toIso(sunTimes.nauticalDawn),
        dawn: toIso(sunTimes.dawn),
        sunrise: toIso(sunTimes.sunrise),
        sunriseEnd: toIso(sunTimes.sunriseEnd),
        goldenHourEnd: toIso(sunTimes.goldenHourEnd),
        solarNoon: toIso(sunTimes.solarNoon),
        goldenHour: toIso(sunTimes.goldenHour),
        sunsetStart: toIso(sunTimes.sunsetStart),
        sunset: toIso(sunTimes.sunset),
        dusk: toIso(sunTimes.dusk),
        nauticalDusk: toIso(sunTimes.nauticalDusk),
        night: toIso(sunTimes.night),
      },
      polar: sunPolar,
      now: {
        altitudeDeg: round(sunPos.altitude, 2),
        azimuthDeg: round(sunPos.azimuth, 2),
      },
      state: sunState,
      dayLengthSeconds: dayLengthSeconds,
    },
    moon: {
      times: {
        rise: toIso(moonTimes.rise),
        set: toIso(moonTimes.set),
      },
      polar: moonPolar,
      now: {
        altitudeDeg: round(moonPos.altitude, 2),
        azimuthDeg: round(moonPos.azimuth, 2),
        distanceKm: round(moonPos.distance, 0),
        parallacticAngleDeg: round(moonPos.parallacticAngle, 2),
      },
      illumination: {
        fraction: round(illum.fraction, 4),
        phase: round(illum.phase, 4),
        phaseName: phaseName(illum.phase),
        cardinalToday: cardinalToday,
        angleDeg: round(illum.angle, 2),
        waxing: illum.waxing === true,
      },
      brightLimb: {
        zenithAngleDeg: round(zenithAngleDeg, 2),
      },
    },
    generatedAt: toIso(new Date()),
    version: 1,
  };
};

// Exposed for unit testing / reuse.
AstroService.resolveSunState = resolveSunState;
AstroService.phaseName = phaseName;
AstroService.cardinalOnDay = cardinalOnDay;

// The four cardinal phases and the exact illumination.phase at which each occurs.
var CARDINALS = [
  { phase: 0.0, name: "New Moon" },
  { phase: 0.25, name: "First Quarter" },
  { phase: 0.5, name: "Full Moon" },
  { phase: 0.75, name: "Last Quarter" },
];

/**
 * Name the cardinal phase whose instant falls within the local day, given the
 * moon phase at the day's start and end; else null (§4.7). The moon advances
 * ~1/29.5 of a cycle per day — far less than the 0.25 between cardinals — so at
 * most one cardinal can occur in a day. A cardinal at `c` is inside the day when
 * the forward distance from `phaseStart` to `c` is within the day's total
 * forward advance (both taken mod 1 to handle the wrap through new moon).
 */
function cardinalOnDay(phaseStart, phaseEnd) {
  if (typeof phaseStart !== "number" || typeof phaseEnd !== "number")
    return null;
  var advance = mod1(phaseEnd - phaseStart);
  for (var i = 0; i < CARDINALS.length; i++) {
    if (mod1(CARDINALS[i].phase - phaseStart) <= advance)
      return CARDINALS[i].name;
  }
  return null;
}

function mod1(x) {
  return ((x % 1) + 1) % 1;
}

/**
 * Derive `sun.state` from `evaluatedAt` relative to the day's getTimes() events
 * (§4.6). Falls back to altitude when the twilight events are null (polar-ish).
 */
function resolveSunState(t, times, polar, altitudeDeg) {
  if (polar.alwaysUp)
    return "polarDay";
  if (polar.alwaysDown)
    return "polarNight";

  var nightEnd = ms(times.nightEnd);
  var nauticalDawn = ms(times.nauticalDawn);
  var dawn = ms(times.dawn);
  var sunrise = ms(times.sunrise);
  var sunriseEnd = ms(times.sunriseEnd);
  var sunsetStart = ms(times.sunsetStart);
  var sunset = ms(times.sunset);
  var dusk = ms(times.dusk);
  var nauticalDusk = ms(times.nauticalDusk);
  var night = ms(times.night);

  if (inRange(t, sunrise, sunriseEnd))
    return "sunrise";
  if (inRange(t, sunriseEnd, sunsetStart))
    return "day";
  if (inRange(t, sunsetStart, sunset))
    return "sunset";
  if (inRange(t, dawn, sunrise))
    return "dawn";
  if (inRange(t, sunset, dusk))
    return "dusk";
  if (inRange(t, nauticalDawn, dawn))
    return "nauticalDawn";
  if (inRange(t, dusk, nauticalDusk))
    return "nauticalDusk";
  if (inRange(t, nightEnd, nauticalDawn))
    return "astronomicalDawn";
  if (inRange(t, nauticalDusk, night))
    return "astronomicalDusk";

  // No interval matched. If we have a clean day (sunrise & sunset known), t is
  // in deep night; otherwise fall back to the instantaneous altitude.
  if (sunrise !== null && sunset !== null)
    return "night";
  return altitudeDeg >= 0 ? "day" : "night";
}

function computeDayLength(times, polar) {
  if (polar.alwaysUp)
    return 86400;
  if (polar.alwaysDown)
    return 0;
  var sunrise = ms(times.sunrise);
  var sunset = ms(times.sunset);
  if (sunrise !== null && sunset !== null) {
    return Math.round((sunset - sunrise) / 1000);
  }
  return null;
}

/** Map illumination.phase (0..1 cyclical) to a human phase name (§4.7). */
function phaseName(phase) {
  var e = PHASE_EPS;
  if (phase < e || phase > 1 - e)
    return "New Moon";
  if (Math.abs(phase - 0.25) <= e)
    return "First Quarter";
  if (Math.abs(phase - 0.5) <= e)
    return "Full Moon";
  if (Math.abs(phase - 0.75) <= e)
    return "Last Quarter";
  if (phase < 0.25)
    return "Waxing Crescent";
  if (phase < 0.5)
    return "Waxing Gibbous";
  if (phase < 0.75)
    return "Waning Gibbous";
  return "Waning Crescent";
}

// ---- helpers --------------------------------------------------------------

function ms(d) {
  if (d === null || d === undefined)
    return null;
  var t = d.getTime();
  return isNaN(t) ? null : t;
}

function inRange(t, a, b) {
  return a !== null && b !== null && t >= a && t < b;
}

function toIso(d) {
  if (d === null || d === undefined)
    return null;
  var t = d.getTime();
  if (isNaN(t))
    return null;
  return d.toISOString();
}

function round(x, decimals) {
  if (typeof x !== "number" || !isFinite(x))
    return null;
  var f = Math.pow(10, decimals);
  return Math.round(x * f) / f;
}

module.exports = AstroService;
