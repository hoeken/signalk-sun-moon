'use strict';

/**
 * Small typed-error helpers shared by the server modules. Every ApiError carries
 * a machine-readable `code` (§4.8) and an HTTP `status`, so ApiRouter can map it
 * straight onto the `{ error, message }` response body.
 */

function apiError(code, status, message) {
  const err = new Error(message);
  err.isApiError = true;
  err.code = code;
  err.status = status;
  return err;
}

module.exports = {
  apiError: apiError,
  badRequest: function (code, message) {
    return apiError(code, 400, message);
  },
  serverError: function (message) {
    return apiError('internal', 500, message);
  },
};
