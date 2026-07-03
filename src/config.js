// Single source of truth for the plugin API location and a few UI constants.
//
// Signal K namespaces plugin routes under /plugins/<id>; the router registers the
// path "/api", so the effective URL is the one below (§3.2 / §6.4).
export const API_BASE = "/plugins/signalk-sun-moon/api";

// Default graphic style. This is a client-side choice (the plugin exposes no
// config); the app can override it (e.g. via ?imageStyle=generated).
export const IMAGE_STYLE_DEFAULT = "static";

// Wide-layout breakpoint (px). Kept here so JS and CSS agree (§6.2).
export const WIDE_BREAKPOINT = 720;
