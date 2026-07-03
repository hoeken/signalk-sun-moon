import { API_BASE } from "../config.js";

/**
 * Builds the request URL from API_BASE + params, fetches `/api`, and parses /
 * surfaces the result. Framework-independent (no React import) so it stays
 * testable (§6.3).
 *
 * Runtime-API note (§2.1): uses only `fetch`, Promises and `URLSearchParams` —
 * all present in Chromium 69.
 */
export class ApiClient {
  constructor(base = API_BASE) {
    this.base = base;
  }

  /**
   * @param {{date?: string, lat?: number|string, lon?: number|string}} params
   * @returns {Promise<object>} the parsed AstroResponse
   * @throws {Error} with `.code` (server error code or "network") and optional `.status`
   */
  async fetch(params) {
    params = params || {};
    const qs = new URLSearchParams();
    if (params.date)
      qs.set("date", params.date);
    // lat/lon are omitted by default so the server uses the vessel fix (§6.4).
    if (params.lat !== undefined && params.lat !== null && params.lat !== "" &&
        params.lon !== undefined && params.lon !== null && params.lon !== "") {
      qs.set("lat", String(params.lat));
      qs.set("lon", String(params.lon));
    }

    const query = qs.toString();
    const url = query ? this.base + "?" + query : this.base;

    let res;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (e) {
      const err = new Error("Network error contacting the Sun & Moon plugin. Is the Signal K server running?");
      err.code = "network";
      err.cause = e;
      throw err;
    }

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      const message = (body && body.message) || ("Request failed (HTTP " + res.status + ").");
      const err = new Error(message);
      err.code = (body && body.error) || ("http_" + res.status);
      err.status = res.status;
      throw err;
    }

    if (!body || typeof body !== "object" || !body.sun || !body.moon) {
      const err = new Error("The plugin returned an unexpected response.");
      err.code = "bad_response";
      throw err;
    }

    return body;
  }
}
