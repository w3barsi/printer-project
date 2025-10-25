//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-organize-imports",
    "prettier-plugin-tailwindcss",
  ],
  tailwindFunctions: ["cn", "cva"],
  importOrderParserPlugins: ["typescript", "jsx", "explicitResourceManagement"],
  importOrder: [
    "<TYPES>",
    "^(react/(.*)$)|^(react$)",
    "^(@tanstack/(.*)$)|^(tanstack$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "",
    "<TYPES>^[.|..|~]",
    "^@/",
    "^[../]",
    "^[./]",
  ],
  tabWidth: 2,
  semi: true,
  printWidth: 90,
  singleQuote: false,
  endOfLine: "lf",
  trailingComma: "all",
};

export default config;
