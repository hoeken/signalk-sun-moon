import { describe, it, expect } from "vitest";
import DateWindow from "../../server/DateWindow.js";

const HOUR = 3600 * 1000;

describe("DateWindow.parse", () => {
  it("parses a valid date", () => {
    expect(DateWindow.parse("2026-07-03")).toEqual({ y: 2026, mo: 7, d: 3 });
  });

  it("rejects malformed strings", () => {
    expect(DateWindow.parse("bad")).toBeNull();
    expect(DateWindow.parse("2026-7-3")).toBeNull();
    expect(DateWindow.parse("07-03-2026")).toBeNull();
    expect(DateWindow.parse("")).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    expect(DateWindow.parse("2026-02-30")).toBeNull();
    expect(DateWindow.parse("2026-13-01")).toBeNull();
    expect(DateWindow.parse("2026-00-10")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(DateWindow.parse("2024-02-29")).toEqual({ y: 2024, mo: 2, d: 29 });
    expect(DateWindow.parse("2026-02-29")).toBeNull();
  });
});

describe("DateWindow.formatLocalDate", () => {
  it("formats the UTC fields as zero-padded YYYY-MM-DD", () => {
    expect(DateWindow.formatLocalDate(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
    expect(DateWindow.formatLocalDate(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12-31");
  });
});

describe("DateWindow — day window from date + longitude (§4.4)", () => {
  it("at longitude 0, the window is the plain UTC day and anchor is UTC noon", () => {
    const w = new DateWindow("2026-07-03", 0, new Date("2020-01-01T00:00:00Z"));
    expect(w.requestedDate).toBe("2026-07-03");
    expect(w.start.toISOString()).toBe("2026-07-03T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-07-04T00:00:00.000Z");
    expect(w.anchor.toISOString()).toBe("2026-07-03T12:00:00.000Z");
    expect(w.end.getTime() - w.start.getTime()).toBe(24 * HOUR);
  });

  it("shifts the window earlier in UTC for eastern (positive) longitudes", () => {
    // lon 180 => +12h offset; local midnight is 12:00 the previous UTC day.
    const w = new DateWindow("2026-07-03", 180, new Date("2020-01-01T00:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-07-02T12:00:00.000Z");
    expect(w.anchor.toISOString()).toBe("2026-07-03T00:00:00.000Z");
  });

  it("shifts the window later in UTC for western (negative) longitudes", () => {
    const w = new DateWindow("2026-07-03", -180, new Date("2020-01-01T00:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-07-03T12:00:00.000Z");
  });

  it("treats a non-numeric longitude as 0", () => {
    const w = new DateWindow("2026-07-03", "abc", new Date("2020-01-01T00:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-07-03T00:00:00.000Z");
  });

  it("throws bad_date for an invalid date string", () => {
    expect(() => new DateWindow("2026-02-30", 0, new Date())).toThrow(
      expect.objectContaining({ code: "bad_date", status: 400 }),
    );
  });
});

describe("DateWindow — evaluatedAt / isToday (§4.4)", () => {
  it('when the requested date is "today" at this longitude, evaluatedAt is now', () => {
    const now = new Date("2026-07-03T18:00:00Z");
    const w = new DateWindow("2026-07-03", 0, now);
    expect(w.isToday).toBe(true);
    expect(w.evaluatedAt.getTime()).toBe(now.getTime());
  });

  it("for any other date, evaluatedAt is the local-noon anchor", () => {
    const now = new Date("2026-07-03T18:00:00Z");
    const w = new DateWindow("2026-07-04", 0, now);
    expect(w.isToday).toBe(false);
    expect(w.evaluatedAt.toISOString()).toBe("2026-07-04T12:00:00.000Z");
    expect(w.evaluatedAt.getTime()).toBe(w.anchor.getTime());
  });

  it('defaults the date to "today" at the given longitude when none is supplied', () => {
    // 23:30Z + 12h (lon 180) lands on the next calendar day locally.
    const now = new Date("2026-07-03T23:30:00Z");
    const w = new DateWindow(undefined, 180, now);
    expect(w.requestedDate).toBe("2026-07-04");
    expect(w.isToday).toBe(true);
    expect(w.evaluatedAt.getTime()).toBe(now.getTime());
  });

  it("treats an empty-string date the same as an absent one", () => {
    const now = new Date("2026-07-03T12:00:00Z");
    const w = new DateWindow("", 0, now);
    expect(w.requestedDate).toBe("2026-07-03");
  });
});
