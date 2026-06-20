import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const generatedAndRuntimeIgnores = [
  ".next/**",
  "build/**",
  "next-env.d.ts",
  "node_modules/**",
  "out/**",
  "public/artifacts/**",
  "seed-runs/**",
];

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: generatedAndRuntimeIgnores,
  },
];

export default config;
