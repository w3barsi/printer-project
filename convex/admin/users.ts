import { v } from "convex/values";
import { createAuth } from "../../convex/auth";
import { authComponent, authedMutation, authedQuery } from "../auth";

export const listUsers = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { users } = await createAuth(ctx).api.listUsers({
      query: {},
      headers: await authComponent.getHeaders(ctx),
    });
    return users;
  },
});

export const setEveryoneToAdmin = authedMutation({
  args: {},
  handler: async (ctx) => {
    await createAuth(ctx).api.setRole({
      body: {
        userId: "jh73sqwn68g3nqm1rdpmzdmntx7mxewa",
        role: "admin",
      },
      headers: await authComponent.getHeaders(ctx),
    });
  },
});

export const deleteUser = authedMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await createAuth(ctx).api.removeUser({
      body: {
        userId: args.id,
      },
      headers: await authComponent.getHeaders(ctx),
    });
  },
});

export const createUser = authedMutation({
  args: { name: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    await createAuth(ctx).api.createUser({
      body: {
        password: args.password,
        name: args.name,
        email: args.email,
      },
      headers: await authComponent.getHeaders(ctx),
    });
  },
});

export const setRole = authedMutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("cashier")),
  },
  handler: async (ctx, args) => {
    const headers = await authComponent.getHeaders(ctx);

    await createAuth(ctx).api.setRole({
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
    const headers = await authComponent.getHeaders(ctx);
    if (args.isBanned) {
      await createAuth(ctx).api.unbanUser({
        body: {
          userId: args.userId,
        },
        headers: await authComponent.getHeaders(ctx),
      });
    } else {
      await createAuth(ctx).api.banUser({
        body: {
          userId: args.userId,
        },
        headers,
      });
    }
    return { ok: true };
  },
});
