# signalk-sun-moon — Specification

A [Signal K](https://signalk.org/) server plugin + webapp that displays clean, clear
information about the **sun** and **moon** for the vessel's current location and a
chosen day.

- **Status:** Draft specification (pre-implementation)
- **License:** Apache-2.0
- **Repo:** `signalk-sun-moon`

---

## 1. Goals & Non-Goals

### Goals
- Show **rise / set times** for the sun and moon for a selected day, based on position.
- Present a **sun card** and a **moon card**, each with a large square graphic plus
  textual detail below.
- Render the moon as an **accurate SVG** of how it appears *from the observer's
  location* (correct bright-limb orientation / "moon on its back").
- Allow navigating between days (**prev / date-picker / next**).
- Serve all data the UI needs from a single plugin **HTTP GET API** (`/api`), described
  by a Signal K-compliant **OpenAPI** document.
- Run on **old MFD browsers** (Navico / Chromium 69). Modern JS/JSX *syntax* is allowed
  because a **reverse-proxy transpilation step** (plus the Vite/esbuild build) down-levels
  it (§2.2); but we still respect Chromium 69's **runtime-API and CSS floor** (§2.1),
  since transpilers convert syntax, not missing APIs.

### Non-Goals
- No historical logging, alerts, or persistence of computed values.
- No astronomy beyond what [`suncalc`](https://github.com/mourner/suncalc) provides
  (no planets, no eclipses, no twilight photography planning).
- No user accounts or multi-vessel support (uses `vessels.self`).
- No hand-maintained polyfill soup. (Syntax down-leveling *is* provided — see §2.2 — but
  we do not manually shim missing runtime APIs; we avoid them instead.)

---

## 2. Runtime & Compatibility Constraints

### 2.1 Target browser: Chromium 69 (Navico MFD)
Chromium 69 shipped September 2018 (~ES2018). Transpilation (§2.2) handles **syntax**, so
JSX and modern syntax are fine in source. What transpilation does **not** handle is:
(a) **runtime APIs** that simply don't exist in the engine, and (b) **CSS** (reverse
proxies rarely process CSS). Those are the real floor and must be respected.

**Syntax — free to use** (transpiled down for us): JSX, optional chaining `?.`, nullish
coalescing `??`, logical assignment, `async`/`await`, arrow functions, `class`,
destructuring, spread/rest, template literals, default params, ES modules.

**Runtime APIs — must exist in Chromium 69** (transpilers don't add these; avoid or
explicitly polyfill):
- ✅ Safe: `fetch`, Promises, `Array.prototype.flat`/`flatMap`, `Object.assign`,
  `Object.entries`/`values`, `Intl.DateTimeFormat`,
  `Date#toLocaleTimeString(..., { timeZone })`, `URLSearchParams`, `ResizeObserver`.
- ❌ Avoid (newer than 69): `Object.fromEntries` (73), `String#matchAll` (73),
  `Promise.allSettled` (76), `Array#at` (92), `Object.hasOwn` (93), `structuredClone`
  (98), `Array#findLast` (97). If one is truly needed, add a scoped polyfill and note it.

**CSS — author to Chromium 69** (unless Vite `cssTarget` is set, §7.1; the reverse proxy
does not help here):
- ✅ Safe: Flexbox, CSS Grid (incl. grid `gap`), CSS custom properties, `position: sticky`,
  media queries, `object-fit`, SVG, `transform`, `transition`, `calc()`, viewport units.
- ❌ Avoid: flexbox `gap` (Chrome 84 — use grid `gap`/margins), `aspect-ratio` (88 — use
  the padding-top square hack), `min()`/`max()`/`clamp()` (79), `:is()`/`:where()` (88),
  container queries.

> This do/don't cheat sheet is intentional so the implementer never has to guess. When in
> doubt, check caniuse for "Chrome 69" — and remember: syntax is transpiled, APIs and CSS
> are not.

### 2.2 Transpilation strategy
Down-leveling happens in **two places**, so JSX/modern syntax is safe to author:

1. **Build (Vite + `@vitejs/plugin-react`)** — transforms JSX → JS and, with
   `build.target`/`cssTarget` pinned to `chrome69`, down-levels our own bundle's syntax
   and CSS.
2. **Reverse proxy** — the deployment fronts the webapp with a reverse proxy that has its
   **own transpilation step**, providing a second safety net for Chromium-69 delivery.

```js
// vite.config.js
build: {
  target: ['chrome69'],       // down-level JS syntax in the bundle
  cssTarget: ['chrome69'],    // down-level CSS (proxy won't do this)
  minify: 'esbuild',
}
```

- `browserslist` (in package.json) = `"Chrome >= 69"` for any tooling that reads it.
- **Key limitation to keep in mind:** neither the build nor the proxy adds *missing runtime
  APIs* — that's why §2.1's API floor still applies. Prefer avoiding new APIs over shipping
  polyfills.

---

## 3. Signal K Integration

### 3.1 Package classification
`package.json` marks this as a **combined plugin + standalone webapp**:

```json
{
  "name": "signalk-sun-moon",
  "keywords": ["signalk-node-server-plugin", "signalk-webapp"],
  "signalk": {
    "displayName": "Sun & Moon",
    "appIcon": "./public/icons/icon-72x72.png"
  },
  "main": "index.js"
}
```

- `signalk-node-server-plugin` → the server loads `index.js` as a plugin (config UI,
  lifecycle, HTTP routes).
- `signalk-webapp` → the server auto-mounts the built `public/` folder as a standalone
  webapp.

### 3.2 URL map

| Thing | Served at |
|---|---|
| Webapp (static `public/`) | `/<package-name>/` → `/signalk-sun-moon/` |
| Plugin API (via `registerWithRouter`) | `/plugins/<plugin-id>/…` → `/plugins/signalk-sun-moon/api` |
| OpenAPI docs | Admin UI → *Documentation → OpenAPI* (from `getOpenApi()`) |

> **Note on the "`/api`" URL.** Signal K namespaces plugin routes under
> `/plugins/<id>`. The router registers the *path* `/api`, and the server exposes it at
> `/plugins/signalk-sun-moon/api`. The webapp therefore targets a small, single-source
> `API_BASE` constant (§6.4), not a bare `/api`. During local Vite dev, a proxy maps it
> (see §7).

### 3.3 Plugin object (server)
The plugin exports the standard Signal K factory `module.exports = (app) => plugin;`
where `plugin` implements:

| Member | Purpose |
|---|---|
| `id` | `"signalk-sun-moon"` |
| `name` | `"Sun & Moon"` |
| `description` | Short human summary. |
| `schema` | JSON-schema config form (§3.5). |
| `start(options)` | Store options; nothing long-running required. |
| `stop()` | No-op / release references. |
| `registerWithRouter(router)` | Mounts the `/api` route (§4). |
| `getOpenApi()` | Returns the OpenAPI document (§5). |

The plugin is **stateless per-request**: no timers, no deltas emitted. All computation
happens on demand inside the API handler. (`app.handleMessage` is intentionally unused —
this plugin *reads* position; it does not publish data.)

### 3.4 Reading vessel position (server-side)
```js
const pos = app.getSelfPath('navigation.position'); // { value: { latitude, longitude }, timestamp, ... } | undefined
```
The handler must tolerate `pos` being `undefined`, or `pos.value` missing (no GPS fix).
Because optional chaining is forbidden, guard explicitly:

```js
let lat, lon;
if (pos && pos.value && typeof pos.value.latitude === 'number') {
  lat = pos.value.latitude;
  lon = pos.value.longitude;
}
```

### 3.5 Plugin config schema
```jsonc
{
  "type": "object",
  "properties": {
    "defaultLatitude":  { "type": "number", "title": "Fallback latitude",  "description": "Used when no GPS fix and no lat query param." },
    "defaultLongitude": { "type": "number", "title": "Fallback longitude" },
    "imageStyle": {
      "type": "string",
      "title": "Graphic style",
      "enum": ["generated", "static"],
      "default": "static",
      "description": "Premade WebP art, or dynamically generated SVG."
    }
  }
}
```

---

## 4. HTTP API

### 4.1 Endpoint
```
GET /plugins/signalk-sun-moon/api
```

### 4.2 Query parameters (all optional)
| Param | Format | Meaning |
|---|---|---|
| `date` | `YYYY-MM-DD` | Calendar day to compute for. Default: server "today". |
| `lat`  | decimal degrees, `-90..90` | Observer latitude. |
| `lon`  | decimal degrees, `-180..180` | Observer longitude. |

`lat` and `lon` must be supplied **together** or **not at all** (400 if only one given).

### 4.3 Position resolution order
1. `lat` + `lon` query params, if present and valid.
2. Server `navigation.position` (`app.getSelfPath`).
3. Plugin config `defaultLatitude` / `defaultLongitude`.
4. Otherwise → **400** `{ "error": "no_position", "message": "..." }`.

The response reports which source was used via `position.source`
(`"query" | "vessel" | "config"`).

### 4.4 Date & time-zone handling

**Day anchoring (DECIDED — noon anchoring).** `date` is a **calendar date**. suncalc
treats every `Date` as a UTC *instant*, but a "day" is *local*, so we anchor the
calculation at **local noon of that date** at the position's approximate longitude
(`anchor = date 12:00 at lonOffset`, where `lonOffset ≈ lon/15` hours). Noon sits safely
mid-day everywhere, so `getTimes`/`getMoonTimes` always return the intended calendar day's
events — avoiding the off-by-one that naive midnight-UTC anchoring produces at longitude
extremes (e.g. mid-Pacific).

**Instantaneous values — `evaluatedAt`.** Some values are point-in-time: the sun's `state`
+ graphic, the sun/moon `position`, and the moon's illumination/orientation. They are
computed at a single instant, reported as top-level `evaluatedAt`:
- If `requestedDate` is **today** (in the position's local sense) → **actual current time**.
- Otherwise → the **local-noon anchor** (deterministic; sun `state` will read `day`).

**Time zone.** All response timestamps are **ISO-8601 UTC** (`…Z`) or `null`;
**formatting to browser-local time happens client-side** (§6.6) via `Intl.DateTimeFormat`.
The API echoes `requestedDate`, the UTC `dayWindowUtc`, and `evaluatedAt` so the client can
label everything unambiguously.

### 4.5 Response body (200)
```jsonc
{
  "requestedDate": "2026-07-03",
  "position": {
    "latitude": 37.81,
    "longitude": -122.42,
    "source": "vessel"
  },
  "dayWindowUtc": {                     // the UTC instants that bound the local day
    "start": "2026-07-03T07:00:00.000Z",
    "end":   "2026-07-04T07:00:00.000Z"
  },
  "evaluatedAt": "2026-07-03T18:00:00.000Z", // instant used for all point-in-time values (§4.4)
  "sun": {
    "times": {                          // ISO-8601 UTC or null; keys match suncalc getTimes()
      "nadir":         "2026-07-03T...Z",
      "nightEnd":      "2026-07-03T...Z",
      "nauticalDawn":  "2026-07-03T...Z",
      "dawn":          "2026-07-03T...Z",
      "sunrise":       "2026-07-03T...Z",
      "sunriseEnd":    "2026-07-03T...Z",
      "goldenHourEnd": "2026-07-03T...Z",
      "solarNoon":     "2026-07-03T...Z",
      "goldenHour":    "2026-07-03T...Z",
      "sunsetStart":   "2026-07-03T...Z",
      "sunset":        "2026-07-03T...Z",
      "dusk":          "2026-07-03T...Z",
      "nauticalDusk":  "2026-07-03T...Z",
      "night":         "2026-07-03T...Z"
    },
    "polar": { "alwaysUp": false, "alwaysDown": false },
    "now": {                            // sun position at `evaluatedAt` (§4.4)
      "altitudeDeg": 42.7,             // degrees (suncalc v2)
      "azimuthDeg": 210.3              // degrees, NORTH-based (v2)
    },
    "state": "day",                     // at `evaluatedAt`; drives the sun graphic — see §4.6
    "dayLengthSeconds": 51000
  },
  "moon": {
    "times": {                          // getMoonTimes(): rise/set may be null
      "rise": "2026-07-03T...Z",
      "set":  "2026-07-03T...Z"
    },
    "polar": { "alwaysUp": false, "alwaysDown": false },
    "now": {                            // getMoonPosition() at `evaluatedAt` — degrees (v2)
      "altitudeDeg": 12.1,
      "azimuthDeg": 96.4,
      "distanceKm": 384400,
      "parallacticAngleDeg": -18.2
    },
    "illumination": {                   // getMoonIllumination()
      "fraction": 0.63,                // 0=new .. 1=full
      "phase": 0.42,                   // 0..1 cyclical (0=new,0.25=first qtr,0.5=full,0.75=last qtr)
      "phaseName": "Waxing Gibbous",   // §4.7
      "angleDeg": 12.5,                // bright-limb position angle, degrees (v2)
      "waxing": true                   // v2 flag
    },
    "brightLimb": {
      // Zenith angle of the bright limb (anticlockwise), per suncalc docs:
      //   zenithAngle = illumination.angle - moonPosition.parallacticAngle  (both degrees)
      "zenithAngleDeg": 30.7
    }
  },
  "generatedAt": "2026-07-03T18:00:00.000Z",
  "version": 1
}
```

### 4.6 Sun state resolution (server-side)
`sun.state` is derived from `evaluatedAt` (§4.4) relative to `getTimes()` events (falling
back to `sun.now.altitudeDeg` when events are `null`, e.g. polar regions). Enumerated
values, ordered around the day:

`night → astronomicalDawn → nauticalDawn → dawn → sunrise → day → sunset → dusk →
nauticalDusk → astronomicalDusk → night`

plus special values `polarDay` (`alwaysUp`) and `polarNight` (`alwaysDown`).

The server returns the fine-grained `state`; the **image layer may collapse** several
states onto one graphic (§6.5). Resolution rules (morning shown; evening is symmetric):

| Condition (`t` = `evaluatedAt`) | state |
|---|---|
| `t` in `[sunrise, sunriseEnd)` | `sunrise` |
| `t` in `[sunriseEnd, sunsetStart)` | `day` |
| `t` in `[sunsetStart, sunset)` | `sunset` |
| `t` in `[dawn, sunrise)` / `[sunset, dusk)` | `dawn` / `dusk` |
| `t` in `[nauticalDawn, dawn)` / `[dusk, nauticalDusk)` | `nauticalDawn` / `nauticalDusk` |
| `t` in `[nightEnd, nauticalDawn)` / `[nauticalDusk, night)` | `astronomicalDawn` / `astronomicalDusk` |
| otherwise | `night` |
| `polar.alwaysUp` | `polarDay` |
| `polar.alwaysDown` | `polarNight` |

### 4.7 Moon phase naming (server-side)
Derived from `illumination.phase` (0..1) with a small epsilon (`ε ≈ 0.0167`, ~½ day) so
the cardinal phases get named exactly:

| phase range | phaseName |
|---|---|
| `phase < ε` or `phase > 1-ε` | New Moon |
| `ε ≤ phase < 0.25-ε` | Waxing Crescent |
| `0.25±ε` | First Quarter |
| `0.25+ε ≤ phase < 0.5-ε` | Waxing Gibbous |
| `0.5±ε` | Full Moon |
| `0.5+ε ≤ phase < 0.75-ε` | Waning Gibbous |
| `0.75±ε` | Last Quarter |
| `0.75+ε ≤ phase < 1-ε` | Waning Crescent |

### 4.8 Errors
| HTTP | body `error` | when |
|---|---|---|
| 400 | `bad_date` | `date` not `YYYY-MM-DD` / not a real date. |
| 400 | `bad_position` | lat/lon out of range, or only one of the pair given. |
| 400 | `no_position` | no query, no vessel fix, no config default. |
| 500 | `internal` | unexpected failure. |

All error bodies: `{ "error": "<code>", "message": "<human readable>" }`.

---

## 5. OpenAPI (Signal K-compliant)

- Implemented as `openApi.json` returned by `plugin.getOpenApi()`.
- OpenAPI **3.0.x** (matches the Signal K server tooling).
- `paths` are **relative to `/plugins/signalk-sun-moon`** (server convention), i.e. the
  single documented path is `/api`.
- Documents: the `GET /api` operation, all query params (§4.2), the full 200 response
  schema (§4.5) as reusable `components.schemas`, and the 400/500 error schema.
- Appears in the Admin UI under *Documentation → OpenAPI* once installed.

Outline:
```jsonc
{
  "openapi": "3.0.3",
  "info": { "title": "Sun & Moon API", "version": "1.0.0" },
  "paths": {
    "/api": {
      "get": {
        "summary": "Sun & moon data for a day and position",
        "parameters": [ /* date, lat, lon */ ],
        "responses": {
          "200": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AstroResponse" } } } },
          "400": { "$ref": "#/components/responses/Error" },
          "500": { "$ref": "#/components/responses/Error" }
        }
      }
    }
  },
  "components": { "schemas": { "AstroResponse": { /* … */ }, "Error": { /* … */ } } }
}
```

---

## 6. Webapp (client)

### 6.1 UI stack — **React + JSX** (decided)
**Chosen: React 18 + JSX**, built with Vite + `@vitejs/plugin-react`.

This is viable under the Chromium-69 target because down-leveling is handled for us in two
layers (§2.2): the Vite/esbuild build transforms JSX and pins `target: chrome69`, and the
deployment's **reverse proxy has its own transpilation step**. So JSX and modern syntax are
free; the discipline that remains is §2.1's **runtime-API and CSS floor** (transpilers
convert syntax, not missing APIs).

```jsx
function SunCard({ data }) {
  return (
    <div className="card">
      <div className="card__graphic">{sunGraphic(data.sun.state)}</div>
      <p>Sunrise {fmt(data.sun.times.sunrise)}</p>
    </div>
  );
}
```

**React version note.** React 18's runtime is fine on Chromium 69 (it dropped IE11, not
2018-era Chromium). Use `createRoot` from `react-dom/client`. Keep the component tree small
and avoid React features that lean on newer *runtime APIs* without polyfills.

> Structure keeps non-UI logic in framework-independent ES classes (§6.3), so React only
> owns rendering — the astronomy/data/graphics logic stays testable and portable.

### 6.2 Layout
- Two cards: **Sun card** and **Moon card**.
- Each card = a **large square graphic** on top + **textual info** below.
- **Responsive** via CSS Grid (grid `gap` is Chromium-69-safe; flex `gap` is not):
  - Narrow (mobile): single column, cards **stacked vertically**.
  - Wide (≥ ~720px): two columns, cards **side by side**.
- **Square graphic** uses the padding-top hack (not `aspect-ratio`):
  ```css
  .card__graphic { position: relative; width: 100%; padding-top: 100%; }
  .card__graphic > * { position: absolute; inset: 0; } /* svg/img fills the square */
  ```
- A top **toolbar**: `‹ Prev` · `<input type="date">` · `Next ›`, plus a small "today"
  affordance and a display of the resolved position + its source.
- Clean, high-contrast styling suitable for a sunlit MFD; single stylesheet with CSS
  custom properties for theming (light/dark).

### 6.3 Class / module architecture
The brief asks for "individual classes for each portion … as appropriate." The split is:
**non-UI logic = framework-independent ES classes** (unit-testable, no React import);
**UI = thin React function components** that call into those classes. This keeps astronomy,
data-fetching and graphics logic portable and testable even though rendering is React.

**Client — logic (plain ES classes, `src/`):**

| Class / module | Responsibility |
|---|---|
| `ApiClient` | Builds the request URL from `API_BASE` + params; `fetch`es `/api`; parses/validates the response; surfaces errors. |
| `DateController` | Holds the selected date; `prev()`, `next()`, `set(date)`; formats for `<input type="date">`. |
| `TimeFormatter` | Formats ISO-UTC → local strings via `Intl.DateTimeFormat`; handles `null` ("—"). |
| `ImageProvider` (interface) | `getSunImage(state)`, `getMoonImage(moonData)` → SVG/DOM/URL. |
| `StaticImageProvider` | Returns premade PNG/SVG assets keyed by sun state / moon phase. |
| `GeneratedImageProvider` | Delegates to the renderers below (default). |
| `SunGraphicRenderer` | Builds/looks-up the sun graphic per `sun.state`. |
| `MoonRenderer` | Draws the phase-accurate, observer-oriented moon **SVG** (§6.5). |

**Client — UI (React components, `src/ui/`):**

| Component | Responsibility |
|---|---|
| `App` | Root: owns state (current date via `DateController`, last response, loading/error); calls `ApiClient` in an effect; renders toolbar + cards. |
| `Toolbar` | `‹ Prev` · `<input type="date">` · `Next ›` + today + resolved-position/source display. |
| `SunCard` | Sun graphic (via `ImageProvider`) + rise/set/solar-noon/day-length text. |
| `MoonCard` | Moon graphic (via `ImageProvider`) + phase name/illumination/rise-set text. |

> The graphics classes return SVG/DOM nodes; components mount them via a ref (or render the
> renderer's serialized SVG). Renderers stay React-free so they can be reused or swapped.

**Server modules (root/`server/`):**

| Class / module | Responsibility |
|---|---|
| `index.js` | Plugin factory: `id/name/schema/start/stop/registerWithRouter/getOpenApi`. |
| `ApiRouter` | Express router; parses/validates query; builds response; error mapping. |
| `PositionResolver` | Applies the §4.3 resolution order; returns `{lat, lon, source}`. |
| `AstroService` | Wraps `suncalc`; computes sun/moon times, positions, illumination, `state`, `phaseName`, `zenithAngle`; assembles the §4.5 body. |
| `DateWindow` | Turns a `YYYY-MM-DD` + longitude into the local-noon anchor, the UTC day-window, and `evaluatedAt` (now-if-today, else anchor). |
| `openApi.json` | The OpenAPI document (§5). |

### 6.4 API base + data flow
```js
// src/config.js
export const API_BASE = '/plugins/signalk-sun-moon/api';
```
Flow: `App` → `DateController` produces `date` → `ApiClient.fetch({ date })` (position
omitted so the server uses the vessel fix) → response stored → `SunCard`/`MoonCard`
re-render via `ImageProvider` + `TimeFormatter`. Prev/Next/date-pick → new fetch →
re-draw. Show a lightweight loading state and a clear error banner on failure.

### 6.5 Graphics

**Image-provider abstraction (required by the brief).** All graphics go through
`ImageProvider` so we can swap "premade PNG/SVG" ↔ "dynamically generated" without
touching the cards. The active provider is chosen by plugin config `imageStyle`
(default `static`), overridable by the app.

**Sun graphic.** One visual per (possibly collapsed) sun state. Minimum visual set:
`night`, `dawn`/`dusk` (twilight), `sunrise`/`sunset` (horizon), `day`. The fine-grained
states in §4.6 map onto these (e.g. astronomical/nautical dawn → the twilight visual).
`StaticImageProvider` uses files under `src/assets/sun/<state>.webp` (resized from `art/`);
`GeneratedImageProvider` may draw a simple gradient-sky + sun-position SVG.

**Moon SVG (accurate, observer-oriented).** `MoonRenderer` draws an SVG disc whose lit
portion matches the real phase **and** is rotated so it looks correct *from the
observer's location* ("moon on its back" near the horizon in the tropics):

1. **Lit shape** from `illumination.fraction` + `waxing` (which limb is lit): a full disc
   with a terminator ellipse. The terminator is a semicircle scaled horizontally by
   `cos(π · fraction-derived-angle)`; combine two half-ellipses to render crescent vs.
   gibbous. Waxing lights the right limb (N. hemisphere reference); `waxing` disambiguates.
2. **Orientation** by rotating the whole disc by the **bright-limb zenith angle** from the
   API: `zenithAngleDeg = illumination.angleDeg − moonPosition.parallacticAngleDeg`
   (both degrees — the v2 convention, exactly per the suncalc docs). The zenith angle is
   **anticlockwise**; map to the SVG's clockwise rotation accordingly (negate).
3. Render with two colors (lit vs. shadow) + subtle limb shading; scale to fill the
   square graphic. Pure SVG (no `<canvas>`) so it's crisp on MFDs and cheap to redraw.

> **suncalc v2 correctness note.** Because v2 returns **degrees** and **north-based
> azimuth** (and apparent altitude), the renderer and API consume degrees directly — no
> rad↔deg conversion, and no south-based azimuth adjustment that v1 code would have needed.

### 6.6 Text content
- **Sun card:** sunrise, sunset, solar noon (rise/set/noon only for now — no live
  altitude/azimuth or golden-hour bands). Day length may be shown as a small extra. The
  `state` still drives the *graphic*, but is not listed as text.
- **Moon card:** phase name, % illuminated (`fraction`), moonrise, moonset; waxing/waning.
- All times localized by `TimeFormatter` (**browser-local**); missing events render
  as "—" with a tooltip (e.g. "Moon does not set today").

---

## 7. Build & Project Layout

```
signalk-sun-moon/
├─ index.js                 # plugin entry (Signal K factory)
├─ server/
│  ├─ ApiRouter.js
│  ├─ PositionResolver.js
│  ├─ AstroService.js
│  └─ DateWindow.js
├─ openApi.json
├─ src/                     # webapp SOURCE (React + JSX)
│  ├─ index.html            # loads /src/main.jsx as a module
│  ├─ main.jsx              # createRoot(...).render(<App/>)
│  ├─ config.js             # API_BASE, constants
│  ├─ ui/ (App.jsx, Toolbar.jsx, SunCard.jsx, MoonCard.jsx)
│  ├─ api/ApiClient.js
│  ├─ graphics/ (ImageProvider.js, StaticImageProvider.js,
│  │            GeneratedImageProvider.js, SunGraphicRenderer.js, MoonRenderer.js)
│  ├─ util/ (DateController.js, TimeFormatter.js)
│  ├─ assets/ (sun/, moon/, icons/, favicons/, site.webmanifest)
│  └─ index.html            # favicon + PWA / add-to-home-screen markup
├─ public/                  # BUILD OUTPUT (git-ignored) — auto-served by Signal K
├─ vite.config.js
├─ package.json
├─ SPEC.md
├─ README.md
└─ LICENSE
```

### 7.1 Vite configuration notes
- `plugins: [react()]` (from `@vitejs/plugin-react`) for the JSX transform.
- `root: 'src'`, `build.outDir: '../public'`, `build.emptyOutDir: true`.
- **Disable Vite's own `public/` static convention** (`publicDir: false` or point it at
  `src/assets`) so it doesn't collide with our build output going *into* `public/`.
- `build.target: ['chrome69']`, `build.cssTarget: ['chrome69']`, `minify: 'esbuild'`.
- **Base path:** set `base: './'` so built asset URLs are relative and work when the app is
  mounted under `/signalk-sun-moon/` (and behind the reverse proxy).
- **Dev proxy** so `vite dev` can hit a running Signal K server:
  ```js
  server: {
    proxy: {
      '/plugins': 'http://localhost:3000',
      '/signalk': 'http://localhost:3000'
    }
  }
  ```
- `.gitignore`: `node_modules/`, `public/`.

### 7.2 npm scripts
| Script | Action |
|---|---|
| `dev` | `vite` (with proxy → live SK server). |
| `build` | `vite build` → emits `public/`. |
| `preview` | `vite preview`. |
| `assets` | `node scripts/gen-assets.cjs` → static sun/moon SVG art into `src/assets/`. |
| `icons` | `node scripts/gen-icons.mjs` → app/favicon/PWA icons from `sunmoon-logo.png`. |

### 7.3 Dependencies
- **Runtime (webapp):** `react`, `react-dom` (React 18).
- **Runtime (server):** `suncalc` (**^2.0**). (Express is provided by the SK server.)
- **Dev:** `vite`, `@vitejs/plugin-react`, `sharp` + `png-to-ico` (icon generation only).
- Node engine: match the Signal K server's supported Node range.

> **suncalc v2 install caveat.** v2 is ESM-first (ships a bundled build for legacy). The
> server `require`/`import` style must match what v2 exports; verify at implementation
> time and pin `"suncalc": "^2.0.0"`.

---

## 8. suncalc v2.0 API reference (as used here)

> v2.0 introduced **breaking changes** vs v1.x — this spec assumes **v2** throughout.

| Function | Returns (v2) | Notes |
|---|---|---|
| `getTimes(date, lat, lng, height=0)` | `{ sunrise, sunriseEnd, goldenHourEnd, solarNoon, goldenHour, sunsetStart, sunset, dusk, nauticalDusk, night, nadir, nightEnd, nauticalDawn, dawn, alwaysUp?, alwaysDown? }` | Missing events are **`null`** (not Invalid Date); polar days/nights set `alwaysUp`/`alwaysDown`. |
| `getPosition(date, lat, lng)` | `{ altitude, azimuth }` | **Degrees**; azimuth **north-based** (0=N,90=E,180=S,270=W); **apparent** altitude. |
| `getMoonPosition(date, lat, lng)` | `{ altitude, azimuth, distance, parallacticAngle }` | Degrees; `distance` km; `parallacticAngle` in degrees. |
| `getMoonIllumination(date)` | `{ fraction, phase, angle, waxing }` | `fraction` 0..1; `phase` 0..1 cyclical; `angle` degrees; `waxing` **new in v2**. |
| `getMoonTimes(date, lat, lng)` | `{ rise, set, alwaysUp?, alwaysDown? }` | **`inUTC` removed in v2**; scans the **UTC day** of `date`; `rise`/`set` may be `null`. |

**v1 → v2 breaking changes that affect this plugin:**
1. Angles are **degrees**, not radians (all of altitude/azimuth/illumination angle/parallactic angle).
2. Azimuth is **north-based**, not south-based.
3. Positions return **apparent (refraction-corrected)** altitude.
4. Missing events → **`null`** + `alwaysUp`/`alwaysDown` flags (must be handled everywhere).
5. `getMoonTimes` **dropped `inUTC`** and scans the UTC day of the date.
6. `getMoonIllumination` **adds `waxing`**; module is **ESM-first** with bundled TS types.

**Bright-limb / observer orientation (from the suncalc docs):**
> "By subtracting `getMoonPosition().parallacticAngle` from `angle` (both in degrees) you
> get the zenith angle of the moon's bright limb (anticlockwise)."

⇒ `zenithAngleDeg = illumination.angle − moonPosition.parallacticAngle` (computed
server-side, returned as `moon.brightLimb.zenithAngleDeg`, consumed by `MoonRenderer`).

---

## 9. Acceptance Criteria

1. Installing the package in a Signal K server exposes the webapp at
   `/signalk-sun-moon/` and the API at `/plugins/signalk-sun-moon/api`.
2. `GET /api` with no params returns valid data using the vessel's `navigation.position`;
   with `lat`/`lon`/`date` it uses those instead; `position.source` is accurate.
3. Response times are ISO-8601 UTC (or `null`); the UI shows them in the browser's local
   time; missing events show "—".
4. Sun and moon cards render with a square graphic + text; they **stack** on mobile and sit
   **side by side** on wide screens.
5. The moon SVG's lit fraction matches `illumination.fraction`, waxing/waning is correct,
   and the disc is rotated by the bright-limb zenith angle (observer orientation).
6. Prev / date-picker / Next re-fetch and redraw with no full page reload.
7. Swapping `imageStyle` (generated ↔ static) changes graphics **without** touching card code.
8. The app runs in **Chromium 69** (via the built assets served through the reverse proxy):
   no runtime errors, no use of post-69 **runtime APIs** without a polyfill, and no post-69
   **CSS** in the emitted bundle (§2.1). Modern JS/JSX *syntax* in source is fine (it's
   transpiled, §2.2).
9. The OpenAPI doc appears in the Admin UI and matches the actual `/api` contract.
