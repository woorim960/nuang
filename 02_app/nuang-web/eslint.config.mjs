import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "mobile/android/**",
    "mobile/dist/**",
    "mobile/ios/**",
    "mobile/node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      // 독립 실행 ESM 연구 스크립트에는 Next.js의 CommonJS module 보호 규칙이 적용되지 않습니다.
      "@next/next/no-assign-module-variable": "off",
    },
  },
]);

export default eslintConfig;
