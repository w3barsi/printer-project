//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  tabWidth: 2,
  semi: true,
  printWidth: 90,
  singleQuote: false,
  endOfLine: "lf",
  trailingComma: "all",
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
};

export default config;
