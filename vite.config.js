import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Webapp build (§7.1). Source lives in src/; the bundle is emitted into public/,
// which the Signal K server auto-mounts at /signalk-sun-moon/.
export default defineConfig({
  root: "src",
  // Relative asset URLs so the app works when mounted under /signalk-sun-moon/
  // (and behind the reverse proxy).
  base: "./",
  plugins: [react()],
  // Copy src/assets verbatim into the build output (sun/, moon/, icons/), instead
  // of Vite's default `public/` convention which would collide with our outDir.
  publicDir: "assets",
  build: {
    outDir: "../public",
    emptyOutDir: true,
    // Down-level JS syntax and CSS for Chromium 69 (the reverse proxy won't do CSS).
    target: ["chrome69"],
    cssTarget: ["chrome69"],
    minify: "esbuild",
  },
  server: {
    // During `vite dev`, proxy plugin/SK routes to a running Signal K server.
    proxy: {
      "/plugins": "http://localhost:3000",
      "/signalk": "http://localhost:3000",
    },
  },
});
