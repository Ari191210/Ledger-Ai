import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Flat config, loaded directly.
 *
 * This used to go through FlatCompat, which exists to translate the old
 * eslintrc format into flat config. eslint-config-next has shipped flat config
 * natively since 16, so the compat layer was handed something already flat,
 * produced an object that failed schema validation, and then crashed inside the
 * error formatter trying to print the failure: "Converting circular structure
 * to JSON". The lint script exited 2 every time, locally and in CI, so the
 * project effectively had no linter at all.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      /**
       * Kept visible, not enforced.
       *
       * Ten call sites read browser-only state on mount: the stored theme, the
       * sound preference, whether motion is reduced, an element's measured box.
       * None of that exists during a server render, so reading it in an effect
       * and setting state is the documented way to avoid a hydration mismatch.
       * The rule is right that cascading renders are a cost, and wrong that
       * every instance is a defect.
       *
       * As a warning these still show up in the output, so a genuinely careless
       * one can be spotted, without a lint run failing over a pattern the
       * framework asks for. Worth revisiting per site if any of them ever shows
       * up in a profile.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // global-error.tsx replaces the root layout when the root itself has
    // failed, so the router context next/link needs may not be mounted. A
    // plain anchor is the only reliable way out of that screen.
    files: ["app/global-error.tsx"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  {
    // Build output, dependencies, and the throwaway browser scripts used to
    // verify things against production.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "crawl.mjs",
      // Vendored agent tooling: skills, hooks and helper scripts that ship with
      // the editor setup rather than with the product.
      ".claude/**",
      "scripts/**",
      "the_well/**",
    ],
  },
];

export default eslintConfig;
