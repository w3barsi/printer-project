# AGENTS.md

## Commands
- `pnpm dev` - Start dev server
- `pnpm build` - Build for production
- `pnpm test` - Run all tests
- `pnpm test --run [filename]` - Run single test file
- `pnpm lint` - Run ESLint
- `pnpm format` - Run Prettier
- `pnpm check` - Format + lint fix

## Style
- **Imports**: `@/` for src/, `@convex` for convex/
- **Format**: Tabs (2), no semicolons, double quotes
- **Types**: Full TypeScript, strict mode
- **Naming**: PascalCase components, camelCase vars
- **Error**: try/catch with error boundaries
- **Styling**: Tailwind + shadcn/ui
- **Convex**: Use `v` validator from convex/values
- **Testing**: Vitest + React Testing Library

## Restrictions
- Do not run `pnpm dev` (tanstack-router dev server)
- Do not modify `routeTree.gen.ts`

## Convex Rules
- Use new function syntax: `query/mutation({ args, returns, handler })`
- Always include validators: `v.string()`, `v.null()`, etc.
- Public: `query/mutation/action`, Private: `internalQuery/mutation/action`
- Use `ctx.runQuery/Mutation/Action` for function calls
- Schema in `convex/schema.ts` with `defineTable` and `v` validators
- HTTP endpoints in `convex/http.ts` with `httpAction`
- Route loader: `loader: ({context: {queryClient: qc}})` - alias queryClient as `qc`