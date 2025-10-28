import { v } from "convex/values";

import { AuthenticatedQueryCtx, createAuth } from "../../convex/auth";
import { authComponent, authedMutation, authedQuery } from "../auth";

function isAdmin(ctx: AuthenticatedQueryCtx) {
  return ctx.user.role === "admin" ? true : false;
}

export const listUsers = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    const { users } = await auth.api.listUsers({
      query: {},
      headers,
    });
    return users;
  },
});

export const deleteUser = authedMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.removeUser({
      body: {
        userId: args.id,
      },
      headers,
    });
  },
});

export const createUser = authedMutation({
  args: { name: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.createUser({
      body: {
        password: args.password,
        name: args.name,
        email: args.email,
      },
      headers,
    });
  },
});

export const setRole = authedMutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("cashier")),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    console.log(args);

    await auth.api.setRole({
      body: {
        userId: args.userId,
        role: args.role,
      },
      headers,
    });
  },
});

export const banOrUnbanUser = authedMutation({
  args: { userId: v.string(), isBanned: v.boolean() },
  handler: async (ctx, args) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    if (args.isBanned) {
      await auth.api.unbanUser({
        body: {
          userId: args.userId,
        },
        headers,
      });
    } else {
      await auth.api.banUser({
        body: {
          userId: args.userId,
        },
        headers,
      });
    }
    return { ok: true };
  },
});
