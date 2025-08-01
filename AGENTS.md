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
- **Convex**: Use `v` validator from convex/values
- **Testing**: Vitest + React Testing Library
- **Components**: Use `function ComponentName()` instead of `React.FC<>`

## Restrictions
- Do not run `pnpm dev` (tanstack-router dev server)
- Do not run `convex dev` or any dev server commands
- Do not modify `routeTree.gen.ts`
- NEVER run `pnpm check`

## Convex Rules
- Use new function syntax: `query/mutation({ args, returns, handler })`
- Always include validators: `v.string()`, `v.null()`, etc.
- Public: `query/mutation/action`, Private: `internalQuery/mutation/action`
- Use `ctx.runQuery/Mutation/Action` for function calls
- Schema in `convex/schema.ts` with `defineTable` and `v` validators
- HTTP endpoints in `convex/http.ts` with `httpAction`
- Route loader: `loader: ({context: {queryClient: qc}})` - alias queryClient as `qc`
