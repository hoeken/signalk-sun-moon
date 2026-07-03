import { describe, it, expect, vi, afterEach } from "vitest";
import { TimeFormatter } from "../../src/util/TimeFormatter.js";

describe("TimeFormatter.duration (static)", () => {
  it("formats hours and zero-padded minutes", () => {
    expect(TimeFormatter.duration(13 * 3600 + 30 * 60)).toBe("13h 30m");
    expect(TimeFormatter.duration(3600)).toBe("1h 00m");
    expect(TimeFormatter.duration(90 * 60)).toBe("1h 30m");
  });

  it("drops the hours part when under an hour", () => {
    expect(TimeFormatter.duration(45 * 60)).toBe("45m");
    expect(TimeFormatter.duration(0)).toBe("0m");
  });

  it("clamps negatives to zero", () => {
    expect(TimeFormatter.duration(-100)).toBe("0m");
  });

  it('renders "—" for null / non-finite input', () => {
    expect(TimeFormatter.duration(null)).toBe("—");
    expect(TimeFormatter.duration(NaN)).toBe("—");
    expect(TimeFormatter.duration(Infinity)).toBe("—");
    expect(TimeFormatter.duration("nope")).toBe("—");
  });
});

describe("TimeFormatter.toDate (static)", () => {
  it("parses ISO strings and rejects empty / invalid ones", () => {
    expect(TimeFormatter.toDate("2026-07-03T12:00:00Z")).toBeInstanceOf(Date);
    expect(TimeFormatter.toDate(null)).toBeNull();
    expect(TimeFormatter.toDate("")).toBeNull();
    expect(TimeFormatter.toDate("not-a-date")).toBeNull();
  });
});

describe("TimeFormatter — instance (pinned to UTC for determinism)", () => {
  const f = new TimeFormatter("en-GB", "UTC");

  it("formats a time in the configured zone", () => {
    expect(f.time("2026-07-03T13:30:00Z")).toMatch(/13.30/);
  });

  it("formats a date with weekday and month", () => {
    const s = f.date("2026-07-03T13:30:00Z");
    expect(s).toMatch(/Fri/);
    expect(s).toMatch(/Jul/);
    expect(s).toMatch(/3/);
  });

  it('renders "—" for missing events', () => {
    expect(f.time(null)).toBe("—");
    expect(f.date(null)).toBe("—");
    expect(f.time("")).toBe("—");
  });

  it("reports the effective time-zone name", () => {
    expect(f.timeZoneName()).toBe("UTC");
  });
});

describe("TimeFormatter — browser-local honors the runtime UTC offset (Navico MFDs)", () => {
  // Navico displays can't set a named zone (Intl stays on UTC) but do report a UTC
  // offset via getTimezoneOffset(). Simulate UTC+2 with the named zone unavailable.
  afterEach(() => vi.restoreAllMocks());

  it("shifts UTC instants by getTimezoneOffset() when no IANA zone is set", () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-120); // UTC+2
    const f = new TimeFormatter("en-GB");
    expect(f.time("2026-07-03T13:30:00Z")).toMatch(/15.30/);
  });

  it("rolls the date across midnight using the offset", () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-120); // UTC+2
    const f = new TimeFormatter("en-GB");
    const s = f.date("2026-07-03T23:30:00Z"); // +2h → 01:30 on Jul 4
    expect(s).toMatch(/Jul/);
    expect(s).toMatch(/\b4\b/);
  });

  it("handles zones behind UTC", () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(300); // UTC-5
    const f = new TimeFormatter("en-GB");
    expect(f.time("2026-07-03T13:30:00Z")).toMatch(/08.30/);
  });

  it("reports the offset as a UTC±HH:MM label", () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-120);
    expect(new TimeFormatter().timeZoneName()).toBe("UTC+02:00");
    vi.restoreAllMocks();
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(330); // UTC-5:30
    expect(new TimeFormatter().timeZoneName()).toBe("UTC-05:30");
  });
});

describe("TimeFormatter.offsetLabel (static)", () => {
  it("formats offsets with inverted sign and zero-padding", () => {
    expect(TimeFormatter.offsetLabel(0)).toBe("UTC+00:00");
    expect(TimeFormatter.offsetLabel(-60)).toBe("UTC+01:00");
    expect(TimeFormatter.offsetLabel(-330)).toBe("UTC+05:30");
    expect(TimeFormatter.offsetLabel(300)).toBe("UTC-05:00");
  });

  it("returns empty for non-finite input", () => {
    expect(TimeFormatter.offsetLabel(NaN)).toBe("");
    expect(TimeFormatter.offsetLabel("x")).toBe("");
  });
});
