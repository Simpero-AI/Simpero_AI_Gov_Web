import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", "node_modules/", "drizzle/", ".pnpm-store/", "**/*.config.js", "**/*.config.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Baseline overrides — tighten in Task 54+
      // noisy in JSX prose text
      "react/no-unescaped-entities": "off",
      // too noisy across legacy codebase (ui components, hooks); will fix in Task 54
      "@typescript-eslint/no-explicit-any": "off",
      // legacy unused imports in pages; will fix in Task 54
      "@typescript-eslint/no-unused-vars": "off",
      // react-hooks v7 added strict purity / set-state-in-effect rules;
      // these patterns were valid in older React and are pervasive — disable
      // for now and tighten after migration to useSyncExternalStore patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",

      // Carbon swap boundary — all shadcn primitives and sonner must be
      // imported through @/components/mvp/primitives so that a single
      // file swap is enough to change the design system.
      "no-restricted-imports": ["error", {
        patterns: [
          {
            // `**` matches every nested path. Plain `*` would only match one
            // segment and miss e.g. `@/components/ui/dropdown-menu` reached
            // via a re-export.
            group: ["@/components/ui/**"],
            message: "Import shadcn primitives from @/components/mvp/primitives instead. Carbon swap boundary.",
          },
        ],
        paths: [
          {
            name: "sonner",
            message: "Import { toast } from @/components/mvp/primitives/sonner instead. Carbon swap boundary.",
          },
        ],
      }],
    },
  },

  // The mvp/primitives barrel re-exports from ui/ and from "sonner" by design.
  {
    files: ["client/src/components/mvp/primitives/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  // shadcn-generated ui/ components legitimately compose each other internally
  // (e.g. alert-dialog imports button, sidebar imports sheet, etc.).
  // The Carbon swap boundary applies to *consumer* code outside ui/.
  {
    files: ["client/src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  // ComponentShowcase is an unrouted developer sandbox (gap G-27).
  {
    files: ["client/src/pages/ComponentShowcase.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  // Multi-entry Vite samples (preserved per spec §"Multi-entry samples")
  // — unrouted from the SPA, kept for Phase 2 Carbon regression playground.
  {
    files: ["client/src/samples/**", "client/src/carbon-sample-main.tsx", "client/src/radix-sample-*.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
];
