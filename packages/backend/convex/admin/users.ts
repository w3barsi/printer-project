import { paginationOptsValidator, type PaginationResult } from "convex/server";
import { v } from "convex/values";

import { createAuth, type AuthenticatedQueryCtx } from "../../convex/auth";
import { components } from "../_generated/api";
import { authComponent, authedMutation, authedQuery } from "../auth";
import type { Doc, Id } from "../betterAuth/_generated/dataModel";

function isAdmin(ctx: AuthenticatedQueryCtx) {
  return ctx.authUser?.role === "admin";
}

export const getUser = authedQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const user: Doc<"user"> | null = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      { model: "user", where: [{ field: "_id", value: userId }] },
    );
    if (!user) return null;

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      username: user.username,
      displayUsername: user.displayUsername,
      role: user.role ?? "user",
      banned: user.banned ?? false,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

export const listUserSessions = authedQuery({
  args: { userId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { userId, paginationOpts }) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const result: PaginationResult<Doc<"session">> = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "session",
        where: [{ field: "userId", value: userId }],
        paginationOpts,
        sortBy: { field: "createdAt", direction: "desc" },
      },
    );
    return {
      ...result,
      page: result.page.map((session) => ({
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        impersonatedBy: session.impersonatedBy,
      })),
    };
  },
});

export const listUserAccounts = authedQuery({
  args: { userId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { userId, paginationOpts }) => {
    if (!isAdmin(ctx)) throw new Error("Not authorized");

    const result: PaginationResult<Doc<"account">> = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "account",
        where: [{ field: "userId", value: userId }],
        paginationOpts,
        sortBy: { field: "createdAt", direction: "desc" },
      },
    );
    return {
      ...result,
      page: result.page.map((account) => ({
        id: account._id,
        providerId: account.providerId,
        accountId: account.accountId,
        hasPassword: Boolean(account.password),
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
    };
  },
});

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

    await ctx.runMutation(components.betterAuth.user.setRole, {
      userId: args.userId as Id<"user">,
      role: args.role,
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
