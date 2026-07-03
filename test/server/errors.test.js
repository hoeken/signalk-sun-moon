import { describe, it, expect } from "vitest";
import errors from "../../server/errors.js";

describe("errors", () => {
  it("apiError carries code, status, message and is a real Error", () => {
    const err = errors.apiError("teapot", 418, "I am a teapot");
    expect(err).toBeInstanceOf(Error);
    expect(err.isApiError).toBe(true);
    expect(err.code).toBe("teapot");
    expect(err.status).toBe(418);
    expect(err.message).toBe("I am a teapot");
  });

  it("badRequest defaults to HTTP 400 with the given code", () => {
    const err = errors.badRequest("bad_position", "nope");
    expect(err.isApiError).toBe(true);
    expect(err.status).toBe(400);
    expect(err.code).toBe("bad_position");
    expect(err.message).toBe("nope");
  });

  it('serverError is HTTP 500 with the "internal" code', () => {
    const err = errors.serverError("boom");
    expect(err.status).toBe(500);
    expect(err.code).toBe("internal");
    expect(err.message).toBe("boom");
  });
});
