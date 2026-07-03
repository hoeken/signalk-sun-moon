"use strict";

var errors = require("./errors");

var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var HOUR_MS = 3600 * 1000;
var DAY_MS = 24 * HOUR_MS;

/**
 * Turns a `YYYY-MM-DD` (or a default) + a longitude into everything the astronomy
 * layer needs to describe a *local* calendar day (§4.4):
 *
 *   - `anchor`       local noon of the date, as a UTC instant (drives suncalc's
 *                    getTimes / getMoonTimes so they land on the intended day)
 *   - `start`/`end`  the UTC instants bounding the local day (`dayWindowUtc`)
 *   - `evaluatedAt`  the instant used for point-in-time values: *now* when the
 *                    requested date is "today" at this longitude, else the anchor
 *
 * "Local" here means longitude-based (`lonOffset = lon / 15` hours), not
 * time-zone-based — deliberately, so the day anchoring is deterministic and free
 * of a tz database (§4.4).
 */
function DateWindow(dateStr, lon, now) {
  now = now || new Date();
  var lonNum = Number(lon);
  if (!isFinite(lonNum))
    lonNum = 0;
  this.lonOffsetMs = (lonNum / 15) * HOUR_MS;

  // No date supplied → use the date it currently is at this longitude, so the
  // response naturally reflects "now" (§4.2 default = today).
  if (dateStr === undefined || dateStr === null || dateStr === "") {
    dateStr = DateWindow.formatLocalDate(new Date(now.getTime() + this.lonOffsetMs));
  }

  var parts = DateWindow.parse(dateStr);
  if (!parts) {
    throw errors.badRequest("bad_date", 'Invalid "date" "' + dateStr + '"; expected a real calendar date as YYYY-MM-DD.');
  }

  this.requestedDate = dateStr;

  var midnightUtc = Date.UTC(parts.y, parts.mo - 1, parts.d, 0, 0, 0, 0);
  this.start = new Date(midnightUtc - this.lonOffsetMs);
  this.end = new Date(this.start.getTime() + DAY_MS);
  this.anchor = new Date(Date.UTC(parts.y, parts.mo - 1, parts.d, 12, 0, 0, 0) - this.lonOffsetMs);

  var localNow = DateWindow.formatLocalDate(new Date(now.getTime() + this.lonOffsetMs));
  this.isToday = localNow === dateStr;
  this.evaluatedAt = this.isToday ? new Date(now.getTime()) : new Date(this.anchor.getTime());
}

/** Parse & fully validate a YYYY-MM-DD string (rejects e.g. 2026-02-30). */
DateWindow.parse = function (str) {
  var m = DATE_RE.exec(String(str));
  if (!m)
    return null;
  var y = Number(m[1]);
  var mo = Number(m[2]);
  var d = Number(m[3]);
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return { y: y, mo: mo, d: d };
};

/** Format a Date's UTC fields as YYYY-MM-DD (the Date's UTC clock represents local time here). */
DateWindow.formatLocalDate = function (d) {
  var mo = String(d.getUTCMonth() + 1);
  var da = String(d.getUTCDate());
  if (mo.length < 2)
    mo = "0" + mo;
  if (da.length < 2)
    da = "0" + da;
  return d.getUTCFullYear() + "-" + mo + "-" + da;
};

module.exports = DateWindow;
