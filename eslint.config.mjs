import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

// Next.js ships its ESLint rules in the old "eslintrc" format.
// FlatCompat (above) translates that into the flat array ESLint 9 expects.
// See docs/decisions.md for why this bridge is here.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Flat config does NOT read .gitignore automatically — these paths
    // must be listed here too, or ESLint lints build output as if it
    // were our source code. See docs/decisions.md.
    ignores: [".next/**", "node_modules/**", "out/**", "coverage/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
