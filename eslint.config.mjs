import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "next-env.d.ts",
    "sites/**",
    "exports/**",
    "supabase/.temp/**",
    "src/lib/supabase/database.types.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
