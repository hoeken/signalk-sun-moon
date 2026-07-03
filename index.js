'use strict';

var ApiRouter = require('./server/ApiRouter');
var openApi = require('./openApi.json');

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
  var options = {};

  var plugin = {
    id: 'signalk-sun-moon',
    name: 'Sun & Moon',
    description: 'Clean sun & moon information (rise/set, phase, observer-oriented moon) for the vessel position and a chosen day.',

    schema: {
      type: 'object',
      properties: {
        defaultLatitude: {
          type: 'number',
          title: 'Fallback latitude',
          description: 'Used when there is no GPS fix and no lat query param.',
        },
        defaultLongitude: {
          type: 'number',
          title: 'Fallback longitude',
          description: 'Used when there is no GPS fix and no lon query param.',
        },
        imageStyle: {
          type: 'string',
          title: 'Graphic style',
          enum: ['generated', 'static'],
          default: 'static',
          description: 'Premade WebP art, or dynamically generated SVG.',
        },
      },
    },

    start: function (opts) {
      options = opts || {};
      if (typeof app.debug === 'function') {
        app.debug('signalk-sun-moon started');
      }
    },

    stop: function () {
      options = {};
    },

    registerWithRouter: function (router) {
      var api = new ApiRouter(app, function () { return options; });
      api.register(router);
    },

    getOpenApi: function () {
      return openApi;
    },
  };

  return plugin;
};
