<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# AGENTS.md

## A note from the devs

I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.
Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.
The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

## A small glossary

We need to be on the same page with terminology. When communicating, use this language:

- **agent** means a coding agent helping build this project
- **you** means the agent reading this file and changing this proejct.
- **we, us, and maintainers** mean Barsi and the people building this app. These are who you are talking to now.
- **user** means the person using this app.
- **system** means the web app for employees.
- **storefront** means the customer-facing web app.

## Where code lives

- `apps/storefront` - Customer-facing TanStack Start app.
- `apps/system` - Employee-facing TanStack Start app.
- `packages/backend` - Convex schema, functions, auth integration, storage, and generated API types. Never edit `convex/_generated/`.
- `packages/auth` - Shared Better Auth access-control roles and permissions.
- `packages/drive` - Shared drive UI and file upload/download behavior used by the apps.
- `packages/ui` - Shared shadcn/ui components, hooks, utilities, and base styles.
- `workers/cfsystem-redirect` - Standalone Cloudflare Worker for system redirects.
- `docs` - Repository documentation and operational notes.

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
- **Components**: Use `function ComponentName()` instead of `React.FC<>`

## Restrictions

- Do not run `pnpm dev` (tanstack-router dev server)
- Do not run `convex dev` or any dev server commands
- Do not run any lint commands. Rely on the LSP to look at errors.
- Do not run `pnpm check`
- Do not modify `routeTree.gen.ts`
- Do not modify anything from `convex/_generated/`
- Do not create, modify, or plan tests for this project. Do not add test dependencies, configuration, scripts, or test files.
- When asked a question, do not yet proceed to implementation. Answer the question first, instructions for implementation will follow.
- When told to "plan" something in build mode, do not yet proceed with the implementation. Create the plan first, instructions for implementation will follow.

## Todo Management

- When asked to add a todo, add it to README.md under "## Todos" section
- Break todos into small, actionable parts (max 2-3 lines each)
- Use markdown checkboxes: `- [ ] Task description`
- Group related todos under sub-headers
- After completing a todo task, add comment: `<!-- Completed: YYYY-MM-DD HH:MM:SS -->`

## Convex Rules

- Use new function syntax: `query/mutation({ args, returns, handler })`
- The query/mutation "returns" param is not required. If the resulting value can be inferred, infer it. Prefer inference over explicitness.
- Always include validators: `v.string()`, `v.null()`, etc for args.
- Public: `query/mutation/action`, Private: `internalQuery/mutation/action`
- Use `ctx.runQuery/Mutation/Action` for function calls
- Keep the assembled main schema in `convex/schema.ts`; all domain schema modules must live in `convex/schemas/`
- Route loader: `loader: ({context: {queryClient: qc}})` - alias queryClient as `qc`

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
