"use strict";

var ApiRouter = require("./server/ApiRouter");
var openApi = require("./openApi.json");

/**
 * Signal K plugin factory. Combined plugin + webapp (see package.json keywords):
 * the server loads this as a plugin (config UI, lifecycle, HTTP routes) and also
 * auto-mounts the built `public/` folder as a standalone webapp at
 * `/signalk-sun-moon/`.
 *
 * The plugin is stateless per request: it *reads* position and computes sun/moon
 * data on demand inside the API handler. No timers, no deltas emitted.
 */
module.exports = function (app) {
  var plugin = {
    id: "signalk-sun-moon",
    name: "Sun & Moon",
    description: "Clean sun & moon information (rise/set, phase, observer-oriented moon) for the vessel position and a chosen day.",

    // No configurable options: position comes from lat/lon query params or the
    // vessel's navigation.position (§4.3), and the graphic style is a client-side
    // choice (see src/config.js).
    schema: {
      type: "object",
      properties: {},
    },

    start: function () {
      if (typeof app.debug === "function") {
        app.debug("signalk-sun-moon started");
      }
    },

    stop: function () {},

    registerWithRouter: function (router) {
      var api = new ApiRouter(app);
      api.register(router);
    },

    getOpenApi: function () {
      return openApi;
    },
  };

  return plugin;
};
