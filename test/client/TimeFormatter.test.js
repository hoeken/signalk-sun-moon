import { describe, it, expect } from "vitest";
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
