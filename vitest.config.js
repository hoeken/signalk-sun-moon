import { defineConfig } from "vitest/config";

// Dedicated Vitest config (kept separate from vite.config.js, whose `root: 'src'`
// and build settings are for the webapp bundle, not the tests).
//
// Default environment is `node` for the server modules and framework-independent
// helpers. The few tests that exercise DOM code (SVG rendering, <img> providers)
// opt into jsdom per-file with a `// @vitest-environment jsdom` docblock.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    globals: false,
  },
});
