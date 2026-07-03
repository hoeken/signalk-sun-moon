/**
 * Formats ISO-UTC instants to local strings via `Intl.DateTimeFormat`, and
 * renders missing events as "—" (§6.6). Framework-independent.
 *
 * Runtime-API note (§2.1): `Intl.DateTimeFormat` (incl. the `timeZone` option)
 * exists in Chromium 69. We use explicit `hour`/`minute` rather than the newer
 * `timeStyle` shortcut (Chrome 76).
 *
 * Navico-MFD note (§4.4): those displays can't set a named (IANA) time zone — it
 * stays at `UTC` — but a plain **UTC offset** can be set, and that offset shows up
 * in `Date#getTimezoneOffset()` (not in the ICU zone `Intl` uses). So for the
 * browser-local case we shift the instant by `getTimezoneOffset()` and format the
 * result pinned to UTC. On a normal browser this yields exactly the same wall-clock
 * as formatting with the named zone (the offset is DST-aware and instant-specific);
 * on Navico it honors the configured offset that `Intl` alone would drop. When an
 * explicit IANA zone is supplied, we let `Intl` do the conversion directly.
 */
const DASH = "—";

export class TimeFormatter {
  /**
   * @param {string} [locale]   BCP-47 tag; undefined = browser default
   * @param {string} [timeZone] IANA zone; undefined = browser local (offset-based)
   */
  constructor(locale, timeZone) {
    this._locale = locale;
    this._timeZone = timeZone || null;
    // Explicit zone → hand it to Intl. Browser-local → pin Intl to UTC and pre-shift
    // the instant in _localDate(), so a bare UTC offset is honored (see file header).
    const zone = this._timeZone || "UTC";
    this._timeFmt = new Intl.DateTimeFormat(locale || undefined,
      { hour: "2-digit", minute: "2-digit", timeZone: zone });
    this._dateFmt = new Intl.DateTimeFormat(locale || undefined,
      { weekday: "short", month: "short", day: "numeric", timeZone: zone });
  }

  /** ISO string (or null) → "HH:MM" local, or "—". */
  time(iso) {
    const d = this._localDate(iso);
    return d ? this._timeFmt.format(d) : DASH;
  }

  /** ISO string (or null) → "Fri, Jul 3" local, or "—". */
  date(iso) {
    const d = this._localDate(iso);
    return d ? this._dateFmt.format(d) : DASH;
  }

  /**
   * The Date to hand the (UTC-pinned) formatters. In explicit-zone mode the instant
   * is passed through unchanged (Intl converts it); in browser-local mode it's shifted
   * by the runtime's UTC offset so its UTC fields equal the local wall-clock time.
   */
  _localDate(iso) {
    const d = TimeFormatter.toDate(iso);
    if (!d || this._timeZone)
      return d;
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  }

  /** A label for the zone actually in effect: the IANA name, or "UTC±HH:MM". */
  timeZoneName() {
    if (this._timeZone) {
      try {
        return this._timeFmt.resolvedOptions().timeZone || "";
      } catch {
        return "";
      }
    }
    return TimeFormatter.offsetLabel(new Date().getTimezoneOffset());
  }

  // ---- statics ----

  static toDate(iso) {
    if (!iso)
      return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * `Date#getTimezoneOffset()` minutes → "UTC±HH:MM". Note the offset is inverted
   * (zones ahead of UTC report negative), so we flip the sign for display.
   */
  static offsetLabel(offsetMinutes) {
    if (typeof offsetMinutes !== "number" || !isFinite(offsetMinutes))
      return "";
    const sign = offsetMinutes <= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return "UTC" + sign + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
  }

  /** Seconds → "13h 30m" (or "—" for null / non-finite). */
  static duration(seconds) {
    if (typeof seconds !== "number" || !isFinite(seconds))
      return DASH;
    const total = Math.max(0, Math.round(seconds / 60));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0)
      return m + "m";
    return h + "h " + (m < 10 ? "0" + m : m) + "m";
  }
}
