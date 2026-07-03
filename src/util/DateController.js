/**
 * Holds the currently-selected calendar day as a `YYYY-MM-DD` string and offers
 * prev/next/set/today plus the value the native `<input type="date">` wants
 * (§6.3). Framework-independent.
 *
 * The "day" here is the browser's local calendar day (what the date picker
 * shows). The server independently anchors that date to the position's longitude
 * (§4.4); the two agree in the common case and the response always echoes
 * `requestedDate` so the UI can stay authoritative.
 */
export class DateController {
  constructor(initial) {
    this.date = DateController.isValid(initial) ? initial : DateController.today();
  }

  /** The value for `<input type="date">` and for the API `date` param. */
  get value() {
    return this.date;
  }

  set(str) {
    if (DateController.isValid(str)) this.date = str;
    return this.date;
  }

  setToday() {
    this.date = DateController.today();
    return this.date;
  }

  prev() {
    this.date = DateController.shift(this.date, -1);
    return this.date;
  }

  next() {
    this.date = DateController.shift(this.date, 1);
    return this.date;
  }

  isToday() {
    return this.date === DateController.today();
  }

  // ---- statics ----

  static today() {
    return DateController.format(new Date());
  }

  /** Local-calendar YYYY-MM-DD for a Date. */
  static format(d) {
    const y = d.getFullYear();
    let mo = String(d.getMonth() + 1);
    let da = String(d.getDate());
    if (mo.length < 2) mo = '0' + mo;
    if (da.length < 2) da = '0' + da;
    return y + '-' + mo + '-' + da;
  }

  /** Shift a YYYY-MM-DD string by whole days, staying in the calendar sense. */
  static shift(str, days) {
    const p = DateController.parts(str);
    if (!p) return str;
    // Use UTC arithmetic to avoid DST hour drift, then read back UTC fields.
    const d = new Date(Date.UTC(p.y, p.mo - 1, p.d));
    d.setUTCDate(d.getUTCDate() + days);
    let mo = String(d.getUTCMonth() + 1);
    let da = String(d.getUTCDate());
    if (mo.length < 2) mo = '0' + mo;
    if (da.length < 2) da = '0' + da;
    return d.getUTCFullYear() + '-' + mo + '-' + da;
  }

  static isValid(str) {
    return DateController.parts(str) !== null;
  }

  static parts(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      return null;
    }
    return { y, mo, d };
  }
}
