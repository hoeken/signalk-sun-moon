import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import react from "eslint-plugin-react";

const stylisticRules = {
  "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
  "@stylistic/quotes": [
    "error",
    "double",
    { avoidEscape: true, allowTemplateLiterals: "always" },
  ],
  "@stylistic/semi": ["error", "always"],
  "@stylistic/comma-dangle": ["error", "always-multiline"],
  "@stylistic/no-trailing-spaces": "error",
  "@stylistic/eol-last": ["error", "always"],
  "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
  "@stylistic/object-curly-spacing": ["error", "always"],
  "@stylistic/array-bracket-spacing": ["error", "never"],
  "@stylistic/space-before-blocks": ["error", "always"],
  "@stylistic/keyword-spacing": ["error", { before: true, after: true }],
  "@stylistic/space-infix-ops": "error",
  "@stylistic/arrow-spacing": ["error", { before: true, after: true }],
  "@stylistic/comma-spacing": ["error", { before: false, after: true }],
  "@stylistic/nonblock-statement-body-position": ["error", "below"],
};

export default [
  {
    ignores: ["node_modules/**", "public/**"],
  },
  js.configs.recommended,
  {
    plugins: { "@stylistic": stylistic },
    rules: stylisticRules,
  },
  {
    // Signal K plugin entry + server code + CommonJS scripts (Node).
    files: ["index.js", "server/**/*.js", "scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // ESM Node tooling: build/test config + ESM scripts.
    files: [
      "eslint.config.mjs",
      "vite.config.js",
      "vitest.config.js",
      "scripts/**/*.mjs",
    ],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Browser webapp (React) source.
    files: ["src/**/*.js", "src/**/*.jsx"],
    plugins: { react },
    languageOptions: {
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Vitest tests (ESM, run under Node).
    files: ["test/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
