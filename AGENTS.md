# AGENTS.md

## Commands

- `pnpm dev` - Start dev server (web + db)
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm format` - Run Prettier
- `pnpm check` - Format + lint fix
- `pnpm clean` - Clean install

## Style

- **Imports**: `@/` for src/, `@convex` for convex/
- **Lucide**: Import with "Icon" suffix (e.g., `Trash2Icon` not `Trash2`)
- **Format**: Tabs (2), no semicolons, double quotes
- **Types**: Full TypeScript, strict mode
- **Naming**: PascalCase components, camelCase vars
- **Error**: try/catch with error boundaries
- **Styling**: Tailwind + shadcn/ui
- **Hover**: Do not use translate/lift motion on hover; prefer color, border, or shadow changes.
- **Convex**: Use `v` validator from convex/values
- **Testing**: Vitest + React Testing Library
- **Components**: Use `function ComponentName()` instead of `React.FC<>`

## Restrictions

- Do not run `pnpm dev` (tanstack-router dev server)
- Do not run `convex dev` or any dev server commands
- Do not modify `routeTree.gen.ts`
- Do not modify anything from `convex/_generated/`
- NEVER run `pnpm check`

## Todo Management

- When asked to add a todo, add it to README.md under "## Todos" section
- Break todos into small, actionable parts (max 2-3 lines each)
- Use markdown checkboxes: `- [ ] Task description`
- Group related todos under sub-headers
- After completing a todo task, add comment: `<!-- Completed: YYYY-MM-DD HH:MM:SS -->`

## Convex Rules

- Use new function syntax: `query/mutation({ args, returns, handler })`
- Always include validators: `v.string()`, `v.null()`, etc.
- Public: `query/mutation/action`, Private: `internalQuery/mutation/action`
- Use `ctx.runQuery/Mutation/Action` for function calls
- Schema in `convex/schema.ts` with `defineTable` and `v` validators
- HTTP endpoints in `convex/http.ts` with `httpAction`
- Route loader: `loader: ({context: {queryClient: qc}})` - alias queryClient as `qc`

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
