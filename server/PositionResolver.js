"use strict";

var errors = require("./errors");

/**
 * Applies the §4.3 position-resolution order and reports which source won:
 *   1. `lat` + `lon` query params (must be supplied together and in range)
 *   2. the vessel's `navigation.position` from the server
 *   3. otherwise → 400 `no_position`
 */
function PositionResolver() {}

PositionResolver.prototype.resolve = function (query, app) {
  query = query || {};

  var hasLat = query.lat !== undefined && query.lat !== "";
  var hasLon = query.lon !== undefined && query.lon !== "";

  // 1. Query params. lat/lon must come as a pair (§4.2).
  if (hasLat || hasLon) {
    if (!(hasLat && hasLon)) {
      throw errors.badRequest("bad_position", 'Both "lat" and "lon" must be provided together.');
    }
    var lat = Number(query.lat);
    var lon = Number(query.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      throw errors.badRequest("bad_position", 'Query "lat"/"lon" must be numbers in decimal degrees.');
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw errors.badRequest("bad_position", 'Query "lat" must be -90..90 and "lon" -180..180.');
    }
    return { latitude: lat, longitude: lon, source: "query" };
  }

  // 2. Vessel position from the Signal K server. Guard explicitly (no optional
  // chaining) because the fix may be missing entirely (§3.4).
  if (app && typeof app.getSelfPath === "function") {
    var pos = app.getSelfPath("navigation.position");
    if (pos && pos.value &&
        typeof pos.value.latitude === "number" && isFinite(pos.value.latitude) &&
        typeof pos.value.longitude === "number" && isFinite(pos.value.longitude)) {
      return { latitude: pos.value.latitude, longitude: pos.value.longitude, source: "vessel" };
    }
  }

  // 3. Nothing worked.
  throw errors.badRequest("no_position",
    "No position available: supply lat/lon query params or a vessel GPS fix.");
};

module.exports = PositionResolver;
