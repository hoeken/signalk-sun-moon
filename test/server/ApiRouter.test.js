import { describe, it, expect, vi } from "vitest";
import ApiRouter from "../../server/ApiRouter.js";

// Minimal Express-style response double: records the status/body/content-type and
// stays chainable like the real thing.
function mockRes() {
  const res = { statusCode: null, body: null, contentType: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.type = (t) => ((res.contentType = t), res);
  return res;
}

describe("ApiRouter.register", () => {
  it("wires up GET /api", () => {
    const router = { get: vi.fn() };
    new ApiRouter({}).register(router);
    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toBe("/api");
    expect(typeof router.get.mock.calls[0][1]).toBe("function");
  });

  it("the registered handler delegates to handle()", () => {
    const api = new ApiRouter({});
    const spy = vi.spyOn(api, "handle");
    let registered;
    api.register({ get: (_p, fn) => (registered = fn) });
    const req = { query: { lat: "40", lon: "-74" } };
    const res = mockRes();
    registered(req, res);
    expect(spy).toHaveBeenCalledWith(req, res);
  });
});

describe("ApiRouter.handle — success", () => {
  it("returns 200 with a JSON astro body when position resolves", () => {
    const api = new ApiRouter({});
    const res = mockRes();
    api.handle({ query: { lat: "40.71", lon: "-74.0", date: "2026-07-03" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.contentType).toBe("application/json");
    expect(res.body.sun).toBeDefined();
    expect(res.body.moon).toBeDefined();
    expect(res.body.position.source).toBe("query");
    expect(res.body.requestedDate).toBe("2026-07-03");
  });

  it("uses the vessel fix when no lat/lon is supplied", () => {
    const app = {
      getSelfPath: (p) =>
        p === "navigation.position" ? { value: { latitude: 51.5, longitude: -0.12 } } : undefined,
    };
    const api = new ApiRouter(app);
    const res = mockRes();
    api.handle({ query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.position.source).toBe("vessel");
  });
});

describe("ApiRouter.handle — typed errors map to §4.8 bodies", () => {
  const cases = [
    { name: "bad_position", query: { lat: "40" } },
    { name: "no_position", query: {} },
    { name: "bad_date", query: { lat: "40", lon: "-74", date: "2026-02-30" } },
  ];

  cases.forEach(({ name, query }) => {
    it(`returns 400 { error: "${name}" }`, () => {
      const api = new ApiRouter({}); // no getSelfPath => no vessel fix
      const res = mockRes();
      api.handle({ query }, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(name);
      expect(typeof res.body.message).toBe("string");
    });
  });
});

describe("ApiRouter.handle — unexpected errors", () => {
  it("maps a non-API error to 500 internal and logs via app.error", () => {
    const app = { error: vi.fn() };
    const api = new ApiRouter(app);
    // Force an unexpected (non-typed) failure deep in the pipeline.
    api.astro.compute = () => {
      throw new Error("kaboom");
    };
    const res = mockRes();
    api.handle({ query: { lat: "40", lon: "-74" } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "internal",
      message: "Unexpected error computing sun/moon data.",
    });
    expect(app.error).toHaveBeenCalledTimes(1);
  });

  it("does not throw when app has no error() logger", () => {
    const api = new ApiRouter(null);
    api.astro.compute = () => {
      throw new Error("kaboom");
    };
    const res = mockRes();
    expect(() => api.handle({ query: { lat: "40", lon: "-74" } }, res)).not.toThrow();
    expect(res.statusCode).toBe(500);
  });
});
