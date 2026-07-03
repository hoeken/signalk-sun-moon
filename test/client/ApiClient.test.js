import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiClient } from "../../src/api/ApiClient.js";

// Build a fake fetch Response.
function response({ ok = true, status = 200, body = {}, jsonThrows = false } = {}) {
  return {
    ok,
    status,
    json: async () => {
      if (jsonThrows)
        throw new Error("not json");
      return body;
    },
  };
}

const goodBody = { sun: {}, moon: {}, version: 1 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiClient — URL construction", () => {
  it("hits the bare base when no params are given", async () => {
    const fetchMock = vi.fn(async () => response({ body: goodBody }));
    vi.stubGlobal("fetch", fetchMock);
    await new ApiClient("/base").fetch();
    expect(fetchMock).toHaveBeenCalledWith("/base", expect.objectContaining({
      headers: { Accept: "application/json" },
    }));
  });

  it("adds the date param", async () => {
    const fetchMock = vi.fn(async () => response({ body: goodBody }));
    vi.stubGlobal("fetch", fetchMock);
    await new ApiClient("/base").fetch({ date: "2026-07-03" });
    expect(fetchMock.mock.calls[0][0]).toBe("/base?date=2026-07-03");
  });

  it("includes lat/lon only when both are present", async () => {
    const fetchMock = vi.fn(async () => response({ body: goodBody }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient("/base");

    await client.fetch({ lat: 40.71, lon: -74.006 });
    const withBoth = fetchMock.mock.calls[0][0];
    expect(withBoth).toContain("lat=40.71");
    expect(withBoth).toContain("lon=-74.006");

    await client.fetch({ lat: 40.71 }); // lon missing → both dropped
    const latOnly = fetchMock.mock.calls[1][0];
    expect(latOnly).not.toContain("lat=");
  });
});

describe("ApiClient — responses", () => {
  it("returns the parsed body on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ body: goodBody })));
    const body = await new ApiClient("/base").fetch();
    expect(body).toEqual(goodBody);
  });

  it('throws a "network" error when fetch rejects', async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    await expect(new ApiClient("/base").fetch()).rejects.toMatchObject({ code: "network" });
  });

  it("surfaces the server error code/status/message on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      response({ ok: false, status: 400, body: { error: "bad_position", message: "nope" } }),
    ));
    await expect(new ApiClient("/base").fetch()).rejects.toMatchObject({
      code: "bad_position",
      status: 400,
      message: "nope",
    });
  });

  it("falls back to a generic message when an error body is unparseable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      response({ ok: false, status: 500, jsonThrows: true }),
    ));
    await expect(new ApiClient("/base").fetch()).rejects.toMatchObject({
      code: "http_500",
      status: 500,
    });
  });

  it('rejects a 200 body that is missing sun/moon as "bad_response"', async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ body: { version: 1 } })));
    await expect(new ApiClient("/base").fetch()).rejects.toMatchObject({ code: "bad_response" });
  });
});
