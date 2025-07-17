//  @ts-check

/** @type {import('prettier').Config} */
const config = {
	tabWidth: 2, // Default to 2 spaces for tab width
	useTabs: true, // Indent with tabs
	singleQuote: false, // Use double quotes instead of single quotes
	semi: false, // Do not print semicolons at the end of statements
	plugins: ["prettier-plugin-tailwindcss"],
}

export default config
