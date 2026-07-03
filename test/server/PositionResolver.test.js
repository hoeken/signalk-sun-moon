import { describe, it, expect } from "vitest";
import PositionResolver from "../../server/PositionResolver.js";

const resolver = new PositionResolver();

// A stub Signal K `app` whose getSelfPath returns the given navigation.position.
function appWithPosition(pos) {
  return {
    getSelfPath(path) {
      return path === "navigation.position" ? pos : undefined;
    },
  };
}

describe("PositionResolver — query params (§4.3 step 1)", () => {
  it('uses lat/lon when both are valid and reports source "query"', () => {
    const r = resolver.resolve({ lat: "40.7128", lon: "-74.006" }, null);
    expect(r).toEqual({ latitude: 40.7128, longitude: -74.006, source: "query" });
  });

  it('accepts 0/0 (zero is a valid coordinate, not "missing")', () => {
    const r = resolver.resolve({ lat: "0", lon: "0" }, null);
    expect(r).toEqual({ latitude: 0, longitude: 0, source: "query" });
  });

  it("takes precedence over an available vessel fix", () => {
    const app = appWithPosition({ value: { latitude: 1, longitude: 2 } });
    const r = resolver.resolve({ lat: "10", lon: "20" }, app);
    expect(r.source).toBe("query");
    expect(r.latitude).toBe(10);
  });

  it("throws bad_position when only one of lat/lon is supplied", () => {
    expect(() => resolver.resolve({ lat: "40" }, null)).toThrow(
      expect.objectContaining({ code: "bad_position", status: 400 }),
    );
    expect(() => resolver.resolve({ lon: "20" }, null)).toThrow(
      expect.objectContaining({ code: "bad_position" }),
    );
  });

  it("throws bad_position for non-numeric coordinates", () => {
    expect(() => resolver.resolve({ lat: "abc", lon: "20" }, null)).toThrow(
      expect.objectContaining({ code: "bad_position" }),
    );
  });

  it("throws bad_position for out-of-range coordinates", () => {
    expect(() => resolver.resolve({ lat: "91", lon: "0" }, null)).toThrow(
      expect.objectContaining({ code: "bad_position" }),
    );
    expect(() => resolver.resolve({ lat: "0", lon: "181" }, null)).toThrow(
      expect.objectContaining({ code: "bad_position" }),
    );
  });
});

describe("PositionResolver — vessel fix (§4.3 step 2)", () => {
  it('falls back to navigation.position and reports source "vessel"', () => {
    const app = appWithPosition({ value: { latitude: 12.5, longitude: -8.25 } });
    const r = resolver.resolve({}, app);
    expect(r).toEqual({ latitude: 12.5, longitude: -8.25, source: "vessel" });
  });

  it("treats empty-string lat/lon as absent and uses the vessel fix", () => {
    const app = appWithPosition({ value: { latitude: 5, longitude: 6 } });
    const r = resolver.resolve({ lat: "", lon: "" }, app);
    expect(r.source).toBe("vessel");
  });
});

describe("PositionResolver — no position (§4.3 step 3)", () => {
  it("throws no_position when there is no query and no app", () => {
    expect(() => resolver.resolve({}, null)).toThrow(
      expect.objectContaining({ code: "no_position", status: 400 }),
    );
  });

  it("throws no_position when the vessel fix is missing or malformed", () => {
    expect(() => resolver.resolve({}, appWithPosition(null))).toThrow(
      expect.objectContaining({ code: "no_position" }),
    );
    expect(() => resolver.resolve({}, appWithPosition({ value: null }))).toThrow(
      expect.objectContaining({ code: "no_position" }),
    );
    expect(() =>
      resolver.resolve({}, appWithPosition({ value: { latitude: "x", longitude: 2 } })),
    ).toThrow(expect.objectContaining({ code: "no_position" }));
    expect(() =>
      resolver.resolve({}, appWithPosition({ value: { latitude: NaN, longitude: 2 } })),
    ).toThrow(expect.objectContaining({ code: "no_position" }));
  });

  it("tolerates being called with no query object at all", () => {
    expect(() => resolver.resolve(undefined, null)).toThrow(
      expect.objectContaining({ code: "no_position" }),
    );
  });
});
