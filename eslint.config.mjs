import { fixupConfigRules } from "@eslint/compat";
import { fixupPluginRules } from "@eslint/compat";
import pluginNext from "@next/eslint-plugin-next";
import pluginReact from "eslint-plugin-react";

export default [
  {
    plugins: {
      next: fixupPluginRules(pluginNext),
      react: fixupPluginRules(pluginReact),
    },
    rules: {
      ...fixupConfigRules(pluginNext.configs.recommended.rules),
      ...fixupConfigRules(pluginNext.configs["core-web-vitals"].rules),
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    ignores: [".next/", "node_modules/", "out/", "build/"],
  },
];