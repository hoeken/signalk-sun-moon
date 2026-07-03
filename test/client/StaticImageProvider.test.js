// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { StaticImageProvider } from "../../src/graphics/StaticImageProvider.js";

// Always construct with an explicit base so the test never depends on
// import.meta.env.BASE_URL.
const make = (base = "/p/") => new StaticImageProvider(base);

describe("StaticImageProvider — base handling", () => {
  it("appends a trailing slash to a base that lacks one", () => {
    const p = make("/p");
    expect(p.getSunImage("day").getAttribute("src")).toBe("/p/sun/day.webp");
  });
});

describe("StaticImageProvider.getSunImage", () => {
  it("returns an <img> mapped from sun state to file", () => {
    const el = make().getSunImage("day");
    expect(el.nodeName).toBe("IMG");
    expect(el.getAttribute("src")).toBe("/p/sun/day.webp");
    expect(el.getAttribute("alt")).toBe("Sun graphic: day");
    expect(el.getAttribute("decoding")).toBe("async");
  });

  it("collapses related states onto shared artwork", () => {
    const p = make();
    expect(p.getSunImage("polarNight").getAttribute("src")).toBe("/p/sun/night.webp");
    expect(p.getSunImage("nauticalDawn").getAttribute("src")).toBe("/p/sun/dawn.webp");
    expect(p.getSunImage("astronomicalDusk").getAttribute("src")).toBe("/p/sun/dusk.webp");
  });

  it("falls back to the day graphic for an unknown state", () => {
    expect(make().getSunImage("bogus").getAttribute("src")).toBe("/p/sun/day.webp");
  });
});

describe("StaticImageProvider.getMoonImage", () => {
  it("returns null without illumination data", () => {
    expect(make().getMoonImage(null)).toBeNull();
    expect(make().getMoonImage({})).toBeNull();
  });

  it("maps illumination.phase to a zero-padded frame file", () => {
    const p = make();
    // 28 frames: phase*28 rounded, wrapped. 0->00, .25->07, .5->14, .75->21.
    expect(p.getMoonImage({ illumination: { phase: 0 } }).getAttribute("src")).toBe("/p/moon/moon-00.webp");
    expect(p.getMoonImage({ illumination: { phase: 0.25 } }).getAttribute("src")).toBe("/p/moon/moon-07.webp");
    expect(p.getMoonImage({ illumination: { phase: 0.5 } }).getAttribute("src")).toBe("/p/moon/moon-14.webp");
    expect(p.getMoonImage({ illumination: { phase: 0.75 } }).getAttribute("src")).toBe("/p/moon/moon-21.webp");
  });

  it("wraps phases near 1.0 back to frame 0", () => {
    expect(make().getMoonImage({ illumination: { phase: 0.999 } }).getAttribute("src")).toBe(
      "/p/moon/moon-00.webp",
    );
  });

  it("snaps to the exact cardinal frame when a cardinal event happens that day", () => {
    // phase 0.02 alone would round to frame 1, but cardinalToday forces frame 0.
    const el = make().getMoonImage({
      illumination: { phase: 0.02, cardinalToday: "New Moon", fraction: 0.001 },
    });
    expect(el.getAttribute("src")).toBe("/p/moon/moon-00.webp");
    expect(el.getAttribute("alt")).toBe("Moon: New Moon, 0% illuminated");
  });

  it("builds the alt text from cardinal/phase name and illuminated percentage", () => {
    const el = make().getMoonImage({
      illumination: { phase: 0.5, fraction: 1, phaseName: "Full Moon" },
    });
    expect(el.getAttribute("alt")).toBe("Moon: Full Moon, 100% illuminated");
  });

  it("omits the percentage when fraction is missing", () => {
    const el = make().getMoonImage({ illumination: { phase: 0.1 } });
    expect(el.getAttribute("alt")).toBe("Moon: phase");
  });
});

describe("StaticImageProvider.preloadMoon", () => {
  it("warms the previous and next frames (not the current one) and dedupes", () => {
    const p = make();
    p.preloadMoon({ illumination: { phase: 0.5 } }); // frame 14 => preload 13 and 15
    expect(p._preloaded.has("/p/moon/moon-13.webp")).toBe(true);
    expect(p._preloaded.has("/p/moon/moon-15.webp")).toBe(true);
    expect(p._preloaded.has("/p/moon/moon-14.webp")).toBe(false);
    expect(p._preloaded.size).toBe(2);

    p.preloadMoon({ illumination: { phase: 0.5 } }); // idempotent
    expect(p._preloaded.size).toBe(2);
  });

  it("wraps frame indices around the 28-frame cycle", () => {
    const p = make();
    p.preloadMoon({ illumination: { phase: 0 } }); // frame 0 => preload 27 and 1
    expect(p._preloaded.has("/p/moon/moon-27.webp")).toBe(true);
    expect(p._preloaded.has("/p/moon/moon-01.webp")).toBe(true);
  });

  it("is a safe no-op without illumination data", () => {
    const p = make();
    expect(() => p.preloadMoon(null)).not.toThrow();
    expect(p._preloaded.size).toBe(0);
  });
});
