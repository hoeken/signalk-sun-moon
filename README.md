# signalk-sun-moon

A [Signal K](https://signalk.org/) server plugin / standalone webapp that shows clean,
clear **sun** and **moon** information for the vessel's current position and a chosen day:
rise/set times, a sun-state graphic, and an **observer-oriented moon** SVG (correct
bright-limb orientation — the "moon on its back" you actually see near the horizon).

- Two cards — **Sun** and **Moon** — each with a large square graphic plus text.
- Navigate days with **‹ Prev · date-picker · Next ›** (and a **Today** shortcut).
- All data comes from a single plugin HTTP endpoint, documented by an OpenAPI 3.0 doc.
- Builds for **Chromium 69** (Navico / older MFD browsers).

See [SPEC.md](SPEC.md) for the full design.

> **Note:** This plugin does **not** publish any Signal K paths — its data is served only
> through the HTTP endpoint above. If you want sun/moon data in your Signal K data tree,
> install [signalk-derived-data](https://github.com/SignalK/signalk-derived-data).


## Install

Install from the Signal K **Appstore**, or manually into your server's plugin folder:

```bash
cd ~/.signalk/node_modules/signalk-sun-moon   # or clone here
npm install
npm run build                                  # emits public/ (the webapp)
```

Restart the Signal K server. Then:

- **Webapp:** `http://<server>:3000/signalk-sun-moon/`
- **API:** `http://<server>:3000/plugins/signalk-sun-moon/api`
- **OpenAPI:** Admin UI → *Documentation → OpenAPI → Sun & Moon API*

> `npm run build` must be run before packaging/using the webapp — `public/` is the build
> output and is git-ignored.

## Configuration

The plugin has **no** configurable options.

Position resolves in order: `lat`/`lon` query params → vessel `navigation.position` →
otherwise `400 no_position`. Graphic style is a client-side choice (`static` premade
assets by default; override with `?imageStyle=generated`).

## API

```
GET /plugins/signalk-sun-moon/api?date=YYYY-MM-DD&lat=<deg>&lon=<deg>
```

All params optional. `lat`/`lon` must be supplied together. Times are ISO-8601 **UTC**
(or `null`); the webapp formats them to the browser's local time. The response reports the
resolved `position.source`, the UTC `dayWindowUtc`, and the `evaluatedAt` instant used for
point-in-time values (see [SPEC §4](SPEC.md)).

```bash
curl 'http://localhost:3000/plugins/signalk-sun-moon/api?date=2026-07-03&lat=37.81&lon=-122.42'
```

Errors are `{ "error": "<code>", "message": "..." }` with codes `bad_date`,
`bad_position`, `no_position`, `internal`.

## Development

```bash
npm run dev       # Vite dev server (proxies /plugins and /signalk to localhost:3000)
npm run build     # build the webapp into public/
npm run preview   # preview the production build
npm run assets    # resize art/ sun/moon source images into static webp in src/assets/
npm run icons     # regenerate app/favicon/PWA icons from art/sunmoon-logo.png
```

The static sun/moon art (used by `StaticImageProvider`) is resized from the
high-resolution source images in `art/sun/` and `art/moon/` by `npm run assets`
into `src/assets/`. Regenerate it after changing the source art.

Icons (Signal K app icon, favicons, and Android/iOS home-screen icons) are derived
from the master logo `art/sunmoon-logo.png` by `npm run icons` and committed under
`src/assets/`. Regenerate them after changing the logo. The webapp is installable to
the home screen on iOS and Android via `src/assets/site.webmanifest` and the meta
tags in [src/index.html](src/index.html).

During `vite dev`, point a running Signal K server at `http://localhost:3000` (or edit the
proxy target in [vite.config.js](vite.config.js)).

## Architecture

Non-UI logic lives in framework-independent ES classes; React only owns rendering.

- **Server** (`index.js`, `server/`): `ApiRouter`, `PositionResolver`, `AstroService`
  (wraps [`suncalc`](https://github.com/mourner/suncalc) v2), `DateWindow`.
- **Client logic** (`src/`): `ApiClient`, `DateController`, `TimeFormatter`, and the
  graphics `ImageProvider` family (`GeneratedImageProvider` / `StaticImageProvider`,
  `SunGraphicRenderer`, `MoonRenderer`).
- **Client UI** (`src/ui/`): `App`, `Toolbar`, `SunCard`, `MoonCard`.

## License

Apache-2.0
