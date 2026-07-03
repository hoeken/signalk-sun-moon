'use strict';

var PositionResolver = require('./PositionResolver');
var DateWindow = require('./DateWindow');
var AstroService = require('./AstroService');

/**
 * Express router for the single `GET /api` endpoint (§4). Parses/validates the
 * query, resolves position, computes the response, and maps typed errors onto
 * the §4.8 `{ error, message }` bodies. Registered by the plugin under
 * `/plugins/signalk-sun-moon`, so the effective URL is
 * `/plugins/signalk-sun-moon/api`.
 */
function ApiRouter(app) {
  this.app = app;
  this.resolver = new PositionResolver();
  this.astro = new AstroService();
}

ApiRouter.prototype.register = function (router) {
  var self = this;
  router.get('/api', function (req, res) {
    self.handle(req, res);
  });
};

ApiRouter.prototype.handle = function (req, res) {
  try {
    var pos = this.resolver.resolve(req.query, this.app);
    var win = new DateWindow(req.query.date, pos.longitude, new Date());
    var body = this.astro.compute({
      lat: pos.latitude,
      lon: pos.longitude,
      source: pos.source,
      dateWindow: win,
    });
    res.type('application/json');
    res.status(200).json(body);
  } catch (err) {
    if (err && err.isApiError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    if (this.app && typeof this.app.error === 'function') {
      this.app.error(err);
    }
    res.status(500).json({
      error: 'internal',
      message: 'Unexpected error computing sun/moon data.',
    });
  }
};

module.exports = ApiRouter;
