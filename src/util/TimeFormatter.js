/**
 * Formats ISO-UTC instants to browser-local strings via `Intl.DateTimeFormat`,
 * and renders missing events as "—" (§6.6). Framework-independent.
 *
 * Runtime-API note (§2.1): `Intl.DateTimeFormat` (incl. the `timeZone` option)
 * exists in Chromium 69. We use explicit `hour`/`minute` rather than the newer
 * `timeStyle` shortcut (Chrome 76).
 */
const DASH = "—";

export class TimeFormatter {
  /**
   * @param {string} [locale]   BCP-47 tag; undefined = browser default
   * @param {string} [timeZone] IANA zone; undefined = browser local
   */
  constructor(locale, timeZone) {
    const base = timeZone ? { timeZone } : {};
    this._locale = locale;
    this._timeFmt = new Intl.DateTimeFormat(locale || undefined,
      Object.assign({ hour: "2-digit", minute: "2-digit" }, base));
    this._dateFmt = new Intl.DateTimeFormat(locale || undefined,
      Object.assign({ weekday: "short", month: "short", day: "numeric" }, base));
  }

  /** ISO string (or null) → "HH:MM" local, or "—". */
  time(iso) {
    const d = TimeFormatter.toDate(iso);
    return d ? this._timeFmt.format(d) : DASH;
  }

  /** ISO string (or null) → "Fri, Jul 3" local, or "—". */
  date(iso) {
    const d = TimeFormatter.toDate(iso);
    return d ? this._dateFmt.format(d) : DASH;
  }

  /** The IANA time-zone name actually in effect, for labeling. */
  timeZoneName() {
    try {
      return this._timeFmt.resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }

  // ---- statics ----

  static toDate(iso) {
    if (!iso)
      return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
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
